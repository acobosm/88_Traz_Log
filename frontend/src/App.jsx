import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import Papa from 'papaparse'
import './index.css'
import trazabilidadAbi from './contracts/TrazabilidadLogistica.json'
import TacticalPanel from './TacticalPanel'
import BrigadistaDashboard from './BrigadistaDashboard'
import AdminDashboard from './AdminDashboard'
import BaseOperativaDashboard from './BaseOperativaDashboard'
import PersonnelTable from './components/PersonnelTable'
import AssetTable from './components/AssetTable'
import AuditorDashboard from './AuditorDashboard'
import { jsPDF } from 'jspdf'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS
const TZ_OFFSET = Number(import.meta.env.VITE_APP_TIMEZONE_OFFSET) || 0

const formatTime = (ts) => {
  if (!ts) return "N/A";
  // Convert ts to date with manual offset for forced regional time (as requested for Ecuador)
  const d = new Date((ts + (TZ_OFFSET * 3600)) * 1000);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  return `📅 ${day}/${month}/${d.getUTCFullYear()} ${hours}:${minutes}`;
}

const stripEmojis = (str) => {
  if (!str) return "";
  // Remove common emojis and non-standard characters that break PDF rendering
  return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

const KNOWN_SERIALS = [
  "ID-HZ001", "ID-MA001", "ID-PL001", "ID-MC001",
  "ID-BF001", "ID-BF002", "ID-BF003", "ID-BF004", "ID-BF005",
  "ID-BF006", "ID-BF007", "ID-BF008", "ID-BF009", "ID-BF010",
  "ID-PA001", "ID-MB001", "ID-MG001", "ID-MX001",
  "ID-V4001", "ID-AM001", "ID-TC001", "ID-RD001",
  "ID-GP001", "ID-CS001", "ID-GT001", "ID-BT001", "ID-MS001"
];

function App() {
  const [skin, setSkin] = useState('forest-fire')
  const [account, setAccount] = useState(null)
  const [isBaseOperativa, setIsBaseOperativa] = useState(false)
  const [isJefeEscena, setIsJefeEscena] = useState(false)
  const [isAuditor, setIsAuditor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [contractInstance, setContractInstance] = useState(null)
  const [inventory, setInventory] = useState([])
  const [incidents, setIncidents] = useState([])
  const [fireCoords, setFireCoords] = useState('')
  const [riskLevel, setRiskLevel] = useState(3)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentView, setCurrentView] = useState('inventory')
  const [showInventory, setShowInventory] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [runtimeError, setRuntimeError] = useState(null)
  const [loadAudit, setLoadAudit] = useState(null)
  const [selectedAssignmentIncident, setSelectedAssignmentIncident] = useState(null)
  const [selectedResources, setSelectedResources] = useState([])
  const [selectedBrigadista, setSelectedBrigadista] = useState('')
  const [personnel, setPersonnel] = useState([])
  const [newPerson, setNewPerson] = useState({ address: '', name: '', specialty: '', role: 2 })
  const [personnelFilter, setPersonnelFilter] = useState('all')
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState('all')
  const [showV360Modal, setShowV360Modal] = useState(false)
  const [selectedV360Incident, setSelectedV360Incident] = useState(null)
  const [v360Logs, setV360Logs] = useState([])
  const [expandedV360Brigadistas, setExpandedV360Brigadistas] = useState({})
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState({ item: null, logs: [] })
  const [showRiskModalApp, setShowRiskModalApp] = useState(false)
  const [selectedRiskIncident, setSelectedRiskIncident] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedReturnItem, setSelectedReturnItem] = useState(null)
  const [returnForm, setReturnForm] = useState({ estadoFinal: 0, consumoReal: 0, motivoDiscrepancia: '' })
  const fileInputRef = useRef(null)


  // Autolimpiar filtro y selecciones al abrir el modal de asignación
  useEffect(() => {
    if (selectedAssignmentIncident) {
      setAssignmentSearchTerm('')
      setSelectedResources([])
      setSelectedBrigadista('')
    }
  }, [selectedAssignmentIncident])

  // Autolimpiar notificaciones (Toasts)
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 6000); // 6 segundos de visibilidad
      return () => clearTimeout(timer);
    }
  }, [status.message]);

  useEffect(() => {
    const fetchV360Logs = async () => {
      if (showV360Modal && selectedV360Incident && contractInstance) {
        try {
          const eventIdNum = parseInt(selectedV360Incident.id.replace('ID-INC', ''));
          const stateLogs = await contractInstance.obtenerLogEvento(BigInt(eventIdNum));
          
          const formatted = stateLogs.map((l) => {
            let type = 'text';
            try {
              const parsed = JSON.parse(l.detalles);
              if (parsed.type === 'pin') type = 'pin';
            } catch (e) {}

            return {
              timestamp: Number(l.timestamp),
              detalles: l.detalles,
              operador: l.operador,
              codigoInsumo: l.codigoInsumo,
              type
            }
          })
          setV360Logs(formatted.sort((a, b) => b.timestamp - a.timestamp))
        } catch (error) {
          console.error("Error fetching V360 logs:", error)
        }
      } else {
        setV360Logs([])
      }
    }
    fetchV360Logs()
  }, [showV360Modal, selectedV360Incident, contractInstance]);

  const toggleV360Brigadista = (addr) => {
    setExpandedV360Brigadistas(prev => ({
      ...prev,
      [addr]: !prev[addr]
    }))
  };

  // Redirección automática si es Brigadista y no tiene otros roles (Top-level Hook)
  useEffect(() => {
    if (account && !loading && !isBaseOperativa && !isJefeEscena && !isAuditor && !isAdmin && personnel.length > 0) {
      const isOperador = personnel.some(p => p.address && p.address.toLowerCase() === account.toLowerCase());
      if (isOperador && currentView !== 'field') {
        console.log("REDIRECCIÓN TÁCTICA: Usuario detectado en campo. Cambiando a vista de Brigadista.");
        setCurrentView('field');
      }
    }
  }, [account, isBaseOperativa, isJefeEscena, isAuditor, isAdmin, loading, personnel, currentView])

  const openReturnModal = (item) => {
    if (item.estado === 1) {
      return setStatus({ 
        type: 'warning', 
        message: `Handshake Pendiente: El equipo ${item.serialId} aún no ha sido marcado como "ENTREGADO" por el brigadista. Solicita al operador que inicie el retorno desde su Interfaz de Campo.` 
      });
    }
    setSelectedReturnItem(item);
    setReturnForm({ estadoFinal: 0, consumoReal: 0, motivoDiscrepancia: '' });
    setShowReturnModal(true);
    setStatus({ type: 'info', message: 'Abriendo acta de recepción física...' });
  };

  const ejecutarRetorno = async () => {
    if (!selectedReturnItem || !contractInstance) return;
    
    // Validación de seguridad adicional pre-transacción
    if (selectedReturnItem.estado !== 4) {
      return setStatus({ 
        type: 'error', 
        message: 'Protocolo bloqueado: No se puede registrar la auditoría si el equipo no está en estado "EN RETORNO".' 
      });
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Registrando auditoría en Blockchain...' });
    try {
      const tx = await contractInstance.registrarAuditoria(
        selectedReturnItem.hash,
        returnForm.estadoFinal,
        BigInt(returnForm.consumoReal),
        returnForm.motivoDiscrepancia
      );
      await tx.wait();
      setStatus({ type: 'success', message: 'Auditoría registrada exitosamente.' });
      setShowReturnModal(false);
      await hardRefresh();
    } catch (error) {
      console.error(error);
      // Extraer mensaje de error personalizado si existe en el revert
      const errorMsg = error.reason || error.message;
      const friendlyMsg = errorMsg.includes("No esta en retorno") 
        ? "Error: El brigadista aún no ha iniciado el proceso de entrega técnica en la Blockchain."
        : `Error en auditoría: ${errorMsg}`;
      
      setStatus({ type: 'error', message: friendlyMsg });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetHistory = async (item) => {
    if (!contractInstance) return;
    setLoading(true);
    setStatus({ type: 'info', message: `Consultando historial de ${item.serialId}...` });
    try {
      // Consultamos los eventos filtrados por el código del insumo (bytes32)
      const filterAsignado = contractInstance.filters.InsumoAsignado(null, item.hash);
      const filterHito = contractInstance.filters.HitoRegistrado(null, item.hash);
      const filterRetornado = contractInstance.filters.InsumoRetornado(item.hash);

      const [logsAsignado, logsHito, logsRetornado] = await Promise.all([
        contractInstance.queryFilter(filterAsignado),
        contractInstance.queryFilter(filterHito),
        contractInstance.queryFilter(filterRetornado)
      ]);

      const history = [];

      logsAsignado.forEach(log => {
        history.push({
          type: 'asignacion',
          timestamp: 0,
          blockNumber: log.blockNumber,
          details: `Asignado al Incidente ID-INC${log.args[0].toString().padStart(3, '0')}`,
          operador: log.args[2]
        });
      });

      logsHito.forEach(log => {
        history.push({
          type: 'hito',
          timestamp: 0,
          blockNumber: log.blockNumber,
          details: log.args.detalles || log.args[3] || 'Sin detalles',
          operador: log.args.operador || log.args[2] || '---'
        });
      });

      logsRetornado.forEach(log => {
        history.push({
          type: 'retorno',
          timestamp: 0,
          blockNumber: log.blockNumber,
          details: (() => {
            const estado = Number(log.args[1]);
            const map = { 0: 'Disponible', 1: 'En Uso', 2: 'Taller', 3: 'Perdido', 4: 'En Retorno' };
            return `Retornado a Base Operativa (Estado: ${map[estado] || 'Desconocido'})`;
          })(),
          operador: 'BASE'
        });
      });

      // Obtener timestamps y remitentes para una línea de tiempo real y precisa
      const detailedHistory = await Promise.all(history.map(async (h) => {
        try {
          const [block, tx] = await Promise.all([
            contractInstance.runner.provider.getBlock(h.blockNumber),
            h.operador === null ? contractInstance.runner.provider.getTransaction(h.transactionHash) : null
          ]);
          return {
            ...h,
            timestamp: block.timestamp,
            operador: h.operador === null ? tx.from : h.operador
          };
        } catch (e) {
          console.error("Error enriqueciendo log:", e);
          return { ...h, timestamp: Math.floor(Date.now() / 1000), operador: h.operador || '---' };
        }
      }));

      setHistoryData({ item, logs: detailedHistory.sort((a, b) => b.timestamp - a.timestamp) });
      setShowHistoryModal(true);
      setStatus({ type: 'success', message: 'Historial cargado' });
    } catch (error) {
      console.error("Error fetching asset history:", error);
      setStatus({ type: 'error', message: 'Error cargando historial' });
    } finally {
      setLoading(false);
    }
  };

  const generarReporteHistorialPDF = (item, logs) => {
    if (!item) return;
    const doc = new jsPDF();
    const title = `REPORTE DE TRAZABILIDAD: ${item.serialId}`;

    doc.setFontSize(18);
    doc.setTextColor(0, 150, 255);
    doc.text(title, 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${item.descripcion}`, 20, 28);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 34);
    doc.line(20, 38, 190, 38);

    let yPos = 50;
    logs.forEach((log, i) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const typeStr = log.type === 'asignacion' ? "ASIGNACION" : log.type === 'retorno' ? "RETORNO" : "HITO";
      doc.text(`${formatTime(log.timestamp).replace('📅', '')} - ${typeStr}`, 20, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.text(`Detalle: ${stripEmojis(log.details)}`, 25, yPos);
      yPos += 5;

      const opName = log.operador === 'BASE' ? 'BASE OPERATIVA' : (personnel.find(p => p.address.toLowerCase() === log.operador?.toLowerCase())?.name || log.operador);
      doc.text(`Responsable: ${stripEmojis(opName)}`, 25, yPos);
      yPos += 5;

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setTextColor(0);
      yPos += 10;
    });

    doc.save(`Historial_${item.serialId}.pdf`);
  };

  const generarReportePDF = (customIncident, customLogs, historicAssignments) => {
    const incident = customIncident || selectedV360Incident;
    const logs = customLogs || v360Logs;
    if (!incident) return;

    const doc = new jsPDF();
    const eventId = incident.id.padStart(3, '0');
    const title = `REPORTE DE INCIDENTE ID-INC${eventId}`;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 150, 255);
    doc.text(title, 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 20, 30);
    doc.line(20, 35, 190, 35);

    // General Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("INFORMACIÓN GENERAL", 20, 45);
    doc.setFontSize(10);
    doc.text(`Estado: ${incident.activo ? "ACTIVO" : "CERRADO"}`, 25, 55);
    doc.text(`Fecha Inicio: ${formatTime(incident.timestamp).replace('📅', '').trim()}`, 25, 62);
    if (!incident.activo && incident.timestampFin > 0) {
      doc.text(`Fecha Cierre: ${formatTime(incident.timestampFin).replace('📅', '').trim()}`, 25, 69);
    }
    doc.text(`Coordenadas: ${stripEmojis(incident.coords) || "N/A"}`, 25, incident.activo ? 69 : 76);

    let yPos = incident.activo ? 85 : 92;

    // Personnel & Resources
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PERSONAL Y RECURSOS ASIGNADOS", 20, yPos);
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const assignedPersonnel = personnel.filter(p => {
      if (historicAssignments) {
        return historicAssignments[p.address.toLowerCase()];
      }
      return p.incidente === `ID-INC${eventId}`;
    });

    if (assignedPersonnel.length === 0) {
      doc.text("No hay personal asignado oficialmente.", 25, yPos);
      yPos += 7;
    } else {
      assignedPersonnel.forEach(p => {
        const role = p.isJefe ? "[JEFE]" : "[BRIGADISTA]";
        doc.setFont("helvetica", "bold");
        doc.text(`${role} ${stripEmojis(p.name)} - ${stripEmojis(p.specialty)}`, 25, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");

        const items = historicAssignments ? 
          historicAssignments[p.address.toLowerCase()] :
          inventory.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1);

        if (items && items.length > 0) {
          items.forEach(item => {
            doc.text(`  • ${stripEmojis(item.descripcion)} (${item.serialId})`, 30, yPos);
            yPos += 5;
          });
        } else {
          doc.text("  • Sin recursos vinculados", 30, yPos);
          yPos += 5;
        }
        yPos += 3;
      });
    }

    // Recursos en Campo
    const isPinLog = (l) => {
      if (l.type === 'pin') return true;
      if (!l || !l.detalles) return false;
      try {
        const parsed = typeof l.detalles === 'string' ? JSON.parse(l.detalles) : l.detalles;
        return parsed && parsed.type === 'pin';
      } catch (e) { return false; }
    };

    const fieldResources = logs.filter(isPinLog);
    if (fieldResources.length > 0) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECURSOS EN CAMPO", 20, yPos);
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      fieldResources.forEach(res => {
        let cleanText = stripEmojis(res.detalles);
        try {
          const parsed = typeof res.detalles === 'string' ? JSON.parse(res.detalles) : res.detalles;
          if (parsed && parsed.type === 'pin') {
            const coordsStr = parsed.latlng ? `[${parsed.latlng.lat.toFixed(4)}, ${parsed.latlng.lng.toFixed(4)}]` : '';
            cleanText = `${parsed.fullLabel || parsed.label} (${(parsed.pinType || 'N/A').toUpperCase()}) ${coordsStr}`;
          }
        } catch (e) { }

        doc.text(`  • ${cleanText}`, 25, yPos);
        yPos += 5;
        yPos += 1;
        if (yPos > 275) { doc.addPage(); yPos = 20; }
      });
      yPos += 5;
    }

    // Bitácora
    yPos += 5;
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BITÁCORA DE HITOS", 20, yPos);
    yPos += 10;
    doc.setFontSize(8);

    const bitacoraLogs = logs.filter(l => !isPinLog(l));
    if (bitacoraLogs.length === 0) {
      doc.text("No hay hitos registrados.", 25, yPos);
    } else {
      bitacoraLogs.forEach(log => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        const time = new Date(Number(log.timestamp) * 1000).toLocaleString();
        const opName = personnel.find(p => p.address.toLowerCase() === log.operador.toLowerCase())?.name || log.operador.substring(0, 10);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 150, 255);
        doc.text(`${time} | Op: ${stripEmojis(opName)}`, 25, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);

        let detailsText = log.detalles;
        try {
          const parsed = JSON.parse(log.detalles);
          if (parsed.type === 'pin') {
            const coordsStr = parsed.latlng ? `[${parsed.latlng.lat.toFixed(4)}, ${parsed.latlng.lng.toFixed(4)}]` : '';
            detailsText = `📍 ${parsed.fullLabel || parsed.label} (${parsed.pinType.toUpperCase()}) ${coordsStr}`;
          } else if (parsed.text) {
            detailsText = parsed.text;
          }
        } catch (e) { }

        // Si hay un recurso asociado, lo añadimos al inicio
        let resourcePrefix = "";
        if (log.codigoInsumo && log.codigoInsumo !== ethers.ZeroHash) {
          const item = inventory.find(i => i.hash === log.codigoInsumo);
          if (item) {
            resourcePrefix = `[RECURSO: ${item.serialId} - ${item.descripcion}] `;
          }
        }

        // Lógica de Negritas Dinámicas: Título vs Contenido
        let titlePortion = "";
        let bodyPortion = detailsText;
        if (detailsText.includes(': ')) {
          const parts = detailsText.split(': ');
          titlePortion = parts[0] + ': ';
          bodyPortion = parts.slice(1).join(': ');
        }

        // Renderizado Segmentado con Salto de Línea para Recursos
        if (yPos > 275) { doc.addPage(); yPos = 20; }

        if (resourcePrefix) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0);
          doc.text(stripEmojis(resourcePrefix.trim()), 25, yPos);
          yPos += 6;
        }

        // Dividir el resto del texto (título + cuerpo)
        let fullContent = titlePortion + bodyPortion;
        let isCriticalStatus = fullContent.includes('DAÑO CRÍTICO');
        let isLostStatus = fullContent.includes('PERDIDO');
        let isWarningStatus = fullContent.includes('DAÑO MENOR');
        
        // Si contiene la etiqueta de estado, la ponemos en negrita y resaltada
        const matchesStatus = fullContent.match(/\[ESTADO: (.*?)\]/);
        const statusLabel = matchesStatus ? matchesStatus[0] : "";
        
        const subLines = doc.splitTextToSize(stripEmojis(fullContent), 160);

        subLines.forEach((line, idx) => {
          if (yPos > 275) { doc.addPage(); yPos = 20; }
          
          if (statusLabel && line.includes(statusLabel)) {
            doc.setFont("helvetica", "bold");
            if (isLostStatus) doc.setTextColor(128, 0, 128); // Purple
            else if (isCriticalStatus) doc.setTextColor(255, 0, 0); // Red
            else if (isWarningStatus) doc.setTextColor(255, 140, 0); // Orange/Yellow
            else doc.setTextColor(0, 150, 0); // Green
            
            doc.text(statusLabel, 25, yPos);
            const statusWidth = doc.getTextWidth(statusLabel);
            
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0);
            const remainingLine = line.replace(statusLabel, "");
            doc.text(remainingLine, 25 + statusWidth, yPos);
          } else if (idx === 0 && titlePortion) {
            // En la primera línea del contenido, ponemos el título en negrita
            doc.setFont("helvetica", "bold");
            doc.text(stripEmojis(titlePortion), 25, yPos);
            const titleWidth = doc.getTextWidth(stripEmojis(titlePortion));
            doc.setFont("helvetica", "normal");
            const remainingLine = line.replace(stripEmojis(titlePortion), "");
            doc.text(remainingLine, 25 + titleWidth, yPos);
          } else {
            // Si es una alerta de sistema (empieza por 🚨 o ⚠️), la ponemos toda en negrita
            const isSystemAlert = line.includes("🚨") || line.includes("⚠️");
            doc.setFont("helvetica", isSystemAlert ? "bold" : "normal");
            
            // Solo coloreamos de rojo/morado si es una alerta de sistema crítica, no toda la descripción
            if (isSystemAlert && isLostStatus) doc.setTextColor(128, 0, 128);
            else if (isSystemAlert && isCriticalStatus) doc.setTextColor(200, 0, 0);
            else doc.setTextColor(0);

            doc.text(line, 25, yPos);
            doc.setTextColor(0);
          }
          yPos += 5;
        });


        yPos += 3; // Espacio entre hitos de la bitácora
      });
    }

    doc.save(`Reporte_Incidente_INC${eventId}.pdf`);
  };

  useEffect(() => {
    window.onerror = (msg, url, line, col, error) => {
      setRuntimeError(`Error: ${msg} at ${line}:${col}`)
      return false
    }
    document.body.setAttribute('data-skin', skin)
  }, [skin])

  const connectWallet = async (requestedAddress = null, forceNewPermission = false) => {
    if (!window.ethereum) {
      return setStatus({ type: 'error', message: 'MetaMask no detectado.' })
    }
    setLoading(true)
    // Resetear estados de rol antiguos para evitar persistencia visual durante la transición
    setIsAdmin(false)
    setIsAuditor(false)
    setIsBaseOperativa(false)
    setIsJefeEscena(false)
    setCurrentView('inventory')

    try {
      // Si se solicita forzar permisos (útil para cuando cambian a una cuenta no autorizada)
      if (forceNewPermission) {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length === 0) throw new Error("No hay cuentas autorizadas");

      console.log("Cuentas detectadas por MetaMask:", accounts);

      // Prioridad: 1. Dirección solicitada por evento, 2. Primera cuenta activa de MetaMask
      const rawAddress = requestedAddress || accounts[0];
      if (!rawAddress) throw new Error("No se pudo determinar la dirección de la billetera");

      const address = String(rawAddress).trim().toLowerCase();

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner(address)
      const sanitizedAddress = await signer.getAddress()

      setAccount(sanitizedAddress)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi.abi, signer)
      setContractInstance(contract)

      const roleBase = await contract.BASE_OPERATIVA_ROLE()
      const roleJefe = await contract.JEFE_ESCENA_ROLE()
      const roleAuditor = await contract.AUDITOR_ROLE()
      const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000"

      const [hasRoleBase, hasRoleJefe, hasRoleAuditor, hasRoleAdmin] = await Promise.all([
        contract.hasRole(roleBase, sanitizedAddress),
        contract.hasRole(roleJefe, sanitizedAddress),
        contract.hasRole(roleAuditor, sanitizedAddress),
        contract.hasRole(adminRole, sanitizedAddress)
      ])

      console.log("DIAGNÓSTICO DE ROLES [App.jsx]:", {
        address: sanitizedAddress,
        isBase: hasRoleBase,
        isJefe: hasRoleJefe,
        isAuditor: hasRoleAuditor,
        isAdmin: hasRoleAdmin
      })

      setIsBaseOperativa(hasRoleBase)
      setIsJefeEscena(hasRoleJefe)
      setIsAuditor(hasRoleAuditor)
      setIsAdmin(hasRoleAdmin)

      const mapping = await fetchIncidents(contract)
      await fetchInventory(contract, mapping)
      await fetchPersonnel(contract, mapping)

      if (!hasRoleBase && !hasRoleJefe && !hasRoleAuditor) {
        setStatus({ type: 'warning', message: `Conectado como Campo: ${sanitizedAddress.substring(0, 10).toUpperCase()}...` })
      } else {
        const roleName = hasRoleAdmin ? "Admin" : hasRoleAuditor ? "Auditor" : hasRoleBase ? "Base" : "Jefe";
        setStatus({ type: 'success', message: `Identidad [${roleName}] Sincronizada: ${sanitizedAddress.substring(0, 10).toUpperCase()}...` })
      }
    } catch (error) {
      console.error("Fallo de conexión:", error)
      setStatus({ type: 'error', message: `Fallo de Sincronización: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Listener para cambios de cuenta y red en MetaMask (Ubicado aquí para acceder a connectWallet)
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        console.log("Cambio de cuenta detectado en MetaMask:", accounts);
        if (accounts.length > 0) {
          // Re-conectar usando la NUEVA dirección activa informada por MetaMask
          connectWallet(accounts[0]);
        } else {
          setAccount(null);
          setContractInstance(null);
          setIsBaseOperativa(false);
          setIsJefeEscena(false);
          setIsAuditor(false);
          setIsAdmin(false);
          setCurrentView('inventory');
          setStatus({ type: 'warning', message: 'Billetera desconectada.' });
        }
      };

      const handleChainChanged = () => {
        console.log("Cambio de red detectado. Recargando...");
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []); // Solo al montar

  // Sincronización Real-Time con Blockchain (Multi-dispositivo)
  useEffect(() => {
    if (!contractInstance) return;

    const handleSync = async () => {
      console.log("Evento detectado en Blockchain. Ejecutando refresco táctico...");
      await hardRefresh();
    };

    // Suscribir a eventos críticos que cambian el estado global
    contractInstance.on("InsumoAsignado", handleSync);
    contractInstance.on("IncendioIniciado", handleSync);
    contractInstance.on("IncendioCerrado", handleSync);
    contractInstance.on("InsumoRetornado", handleSync);
    contractInstance.on("DiscrepanciaRegistrada", handleSync);
    contractInstance.on("RiesgoActualizado", handleSync);

    return () => {
      contractInstance.off("InsumoAsignado", handleSync);
      contractInstance.off("IncendioIniciado", handleSync);
      contractInstance.off("IncendioCerrado", handleSync);
      contractInstance.off("InsumoRetornado", handleSync);
      contractInstance.off("DiscrepanciaRegistrada", handleSync);
      contractInstance.off("RiesgoActualizado", handleSync);
    };
  }, [contractInstance]);

  const handleUploadClick = () => {
    if (!account) return connectWallet()
    fileInputRef.current?.click()
  }

  const processCsv = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setLoading(true)
    setStatus({ type: 'info', message: 'Procesando inventario...' })
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const codigos = []
          const descripciones = []
          const consumos = []
          const erroresCSV = []
          let totalEnArchivo = 0
          let nuevos = 0
          let duplicados = 0
          const codigosDuplicados = []
          const currentHashes = new Set(inventory.map(item => item.hash))
          results.data.forEach((row, index) => {
            const codigoId = (row.codigo_id || row.codigo || '').trim()
            const descripcion = (row.descripcion || '').trim()
            const consumoRaw = row.consumo_nominal_ml_h || row.consumo || 0
            if (codigoId && descripcion) {
              totalEnArchivo++
              const numConsumo = Number(consumoRaw)
              if (isNaN(numConsumo) || numConsumo < 0) {
                erroresCSV.push(`Fila ${index + 1}: El consumo "${consumoRaw}" es inválido.`)
                return
              }
              const hash = ethers.keccak256(ethers.toUtf8Bytes(codigoId))
              if (currentHashes.has(hash)) {
                duplicados++
                codigosDuplicados.push(codigoId)
              } else {
                nuevos++
                codigos.push(hash)
                descripciones.push(`${codigoId} | ${descripcion}`)
                consumos.push(BigInt(numConsumo))
              }
            }
          })
          if (erroresCSV.length > 0) throw new Error(`Errores en CSV:\n${erroresCSV.join('\n')}`)
          if (totalEnArchivo === 0) throw new Error('CSV vacío o inválido.')
          if (nuevos === 0) {
            setStatus({ type: 'info', message: 'Sin items nuevos.' })
            setLoading(false)
            return
          }
          const tx = await contractInstance.registrarInsumosBatch(codigos, descripciones, consumos)
          setStatus({ type: 'info', message: `Registrando ${nuevos} ítems...` })
          await tx.wait()
          setLoadAudit({ nuevos, duplicados, idsDuplicados: codigosDuplicados })
          setStatus({ type: 'success', message: 'Carga exitosa.' })
          await hardRefresh()
        } catch (error) {
          console.error(error)
          setStatus({ type: 'error', message: error.message || 'Error en subida.' })
        } finally {
          setLoading(false)
          if (event.target) event.target.value = ''
        }
      }
    })
  }

  const actualizarRiesgoApp = async (nuevoRiesgo) => {
    if (!selectedRiskIncident) return
    setLoading(true)
    try {
      const tx = await contractInstance.actualizarRiesgoIncendio(BigInt(selectedRiskIncident.id), BigInt(nuevoRiesgo))
      await tx.wait()
      setStatus({ type: 'success', message: `Riesgo de INC${selectedRiskIncident.id.padStart(3, '0')} actualizado a nivel ${nuevoRiesgo}.` })
      setShowRiskModalApp(false)
      await hardRefresh()
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', message: 'Error al actualizar riesgo.' })
    } finally {
      setLoading(false)
    }
  }

  const abrirIncidente = async () => {
    if (!fireCoords) return setStatus({ type: 'error', message: 'Coordenadas requeridas.' })
    setLoading(true)
    try {
      const tx = await contractInstance.abrirEventoIncendio(fireCoords, riskLevel)
      await tx.wait()
      await hardRefresh()
      setStatus({ type: 'success', message: 'Incidente abierto exitosamente.' })
      setFireCoords('')
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', message: 'Error al abrir incidente.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchIncidents = async (contract) => {
    try {
      const nextID = await contract.nextEventoID()
      const list = []
      // Mapeo temporal para rastrear qué insumo/persona está en qué incidente
      const mapping = {}

      for (let i = 1; i < nextID; i++) {
        const fire = await contract.incendios(i)
        list.push({
          id: fire.eventoID.toString(),
          jefe: fire.jefeDeEscena,
          coords: fire.coordenadas,
          riesgo: fire.riesgo.toString(),
          timestamp: Number(fire.timestampInicio),
          timestampFin: Number(fire.timestampFin),
          activo: fire.activo
        })

        // Obtener eventos de asignación para este incidente (Activo o Cerrado)
        const assignmentFilter = contract.filters.InsumoAsignado(BigInt(i))
        const assignmentEvents = await contract.queryFilter(assignmentFilter, 0)

        assignmentEvents.forEach(evt => {
          const insumoHash = evt.args[1]
          const brigadistaAddr = evt.args[2]
          // Solo mapeamos si no hay un mapeo previo más reciente (recorremos cronológicamente)
          mapping[insumoHash] = { id: i.toString(), activo: fire.activo }
          mapping[brigadistaAddr.toLowerCase()] = { id: i.toString(), activo: fire.activo }
        })

        if (fire.activo) {
          // También mapear al Jefe de Escena del incidente (si está activo para el panel táctico)
          if (fire.jefeDeEscena !== ethers.ZeroAddress) {
            mapping[fire.jefeDeEscena.toLowerCase()] = { id: i.toString(), activo: true }
          }
        }
      }
      setIncidents(list)
      return mapping // Retornamos el mapa para ser usado por otras funciones de carga
    } catch (error) { console.error(error); return {} }
  }

  const fetchPersonnel = async (contract, incidentMap = {}) => {
    try {
      const roleBase = await contract.BASE_OPERATIVA_ROLE()
      const roleJefe = await contract.JEFE_ESCENA_ROLE()
      const roleAuditor = await contract.AUDITOR_ROLE()
      const addresses = await contract.getListaPersonal()
      const list = await Promise.all(addresses.map(async (addr) => {
        if (addr === ethers.ZeroAddress) return null
        const isBase = await contract.hasRole(roleBase, addr)
        if (isBase) return null
        const [isJefe, isAuditor] = await Promise.all([
          contract.hasRole(roleJefe, addr),
          contract.hasRole(roleAuditor, addr)
        ])
        const [p, deployId] = await Promise.all([
          contract.brigadistas(addr),
          contract.despliegueActual(addr)
        ]);

        // Determinar estado e incidente
        const assignmentInfo = incidentMap[addr.toLowerCase()]
        let estadoLabel = 'DISPONIBLE'
        
        // El source of truth es despliegueActual. Si es 0, el brigadista está LIBRE.
        if (Number(deployId) === 0) {
          estadoLabel = 'DISPONIBLE'
        } else if (assignmentInfo) {
          estadoLabel = assignmentInfo.activo ? 'EN INCIDENTE' : 'EN RETORNO'
        } else if (!p.estaActivo) {
          estadoLabel = 'INACTIVO'
        }

        return {
          address: addr,
          name: p.nombre,
          specialty: p.especialidad,
          isJefe,
          isAuditor,
          estado: estadoLabel,
          incidente: (Number(deployId) !== 0 && assignmentInfo) ? `ID-INC${assignmentInfo.id.padStart(3, '0')}` : '---'
        }
      }))
      setPersonnel(list.filter(p => p !== null))
    } catch (error) { console.error(error) }
  }

  const registrarPersonal = async () => {
    if (!newPerson.address || !newPerson.name) return setStatus({ type: 'error', message: 'Datos incompletos.' })
    setLoading(true)
    try {
      const roleHash = newPerson.role === 2 ? await contractInstance.OPERADOR_ROLE() : await contractInstance.JEFE_ESCENA_ROLE()
      const addressLimpio = newPerson.address.trim()
      const nombreLimpio = newPerson.name.trim()
      const especialidadLimpia = newPerson.specialty.trim()

      const tx = await contractInstance.registrarPersonal(addressLimpio, nombreLimpio, especialidadLimpia, roleHash)
      await tx.wait()
      setStatus({ type: 'success', message: `Personal ${nombreLimpio} registrado.` })
      setNewPerson({ address: '', name: '', specialty: '', role: 2 })
      await hardRefresh()
    } catch (error) {
      console.error("Error exacto de registro:", error);
      const motivoRechazo = error.reason || error.message || 'Error desconocido';
      setStatus({ type: 'error', message: `Error: ${motivoRechazo}` })
    }
    finally { setLoading(false) }
  }

  const asignarInsumo = async () => {
    if (!selectedAssignmentIncident || selectedResources.length === 0 || !selectedBrigadista) {
      return setStatus({ type: 'error', message: 'Seleccione al menos un recurso y un brigadista.' })
    }

    setLoading(true)
    let errorCount = 0;

    try {
      for (const resourceHash of selectedResources) {
        const item = inventory.find(i => i.hash === resourceHash);
        const itemName = item ? item.serialId : resourceHash;

        setStatus({ type: 'info', message: `Firmando asignación de ${itemName}...` });

        try {
          const tx = await contractInstance.asignarInsumo(selectedAssignmentIncident.id, resourceHash, selectedBrigadista);
          await tx.wait();
        } catch (err) {
          console.error(`Error asignando ${itemName}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setStatus({ type: 'success', message: `¡Operación exitosa! ${selectedResources.length} recursos asignados.` });
        setSelectedAssignmentIncident(null);
        setSelectedResources([]);
        setSelectedBrigadista('');
      } else {
        setStatus({ type: 'error', message: `Completado con ${errorCount} errores. Revise el tablero.` });
      }

      await hardRefresh();
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Error general en la cadena de asignación.' });
    } finally {
      setLoading(false);
    }
  }

  const fetchInventory = async (contract, incidentMap = {}) => {
    try {
      const filter = contract.filters.InsumoRegistrado()
      const events = await contract.queryFilter(filter, 0)
      const items = await Promise.all(events.map(async (event) => {
        const codigo = event.args[0]
        const data = await contract.inventario(codigo)
        let serialId = "N/A", finalDesc = data.descripcion
        if (data.descripcion.includes(" | ")) {
          const parts = data.descripcion.split(" | ")
          serialId = parts[0]; finalDesc = parts[1]
        }

        const assignmentInfo = incidentMap[codigo]
        const pendingAudit = await contract.auditoriasPendientes(codigo)

        const estadoLabels = ["Disponible", "En Incidente", "Taller", "Perdido", "En Retorno"]

        return {
          hash: codigo,
          serialId,
          descripcion: finalDesc,
          estado: Number(data.estado),
          estadoLabel: estadoLabels[Number(data.estado)] || "Desconocido",
          consumoNominal: Number(data.consumoNominal),
          custodio: data.custodioActual,
          incidente: assignmentInfo ? `ID-INC${assignmentInfo.id.padStart(3, '0')}` : '---',
          incidenteId: assignmentInfo ? assignmentInfo.id : null,
          incidenteActivo: assignmentInfo ? assignmentInfo.activo : false,
          auditoriaPendiente: pendingAudit.activa ? {
            estadoPropuesto: Number(pendingAudit.estadoPropuesto),
            consumoReal: pendingAudit.consumoReal.toString(),
            motivo: pendingAudit.motivo
          } : null
        }
      }))
      setInventory(items)
    } catch (error) { console.error(error) }
  }

  const hardRefresh = async () => {
    if (!contractInstance) return
    const mapping = await fetchIncidents(contractInstance)
    await fetchInventory(contractInstance, mapping)
    await fetchPersonnel(contractInstance, mapping)
  }

  return (
    <div className="app-container">
      {runtimeError && (
        <div style={{ background: '#ff3232', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid white' }}>
          <strong>⚠️ FALLO TÁCTICO DETECTADO:</strong> {runtimeError}
        </div>
      )}
      <header>
        <div className="logo-section"><span style={{ fontSize: '2.5rem' }}>🔥</span><h1>FireOps</h1></div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="skin-dropdown-container">
            <label className="skin-label">SKINS</label>
            <select className="skin-select" value={skin} onChange={(e) => setSkin(e.target.value)}>
              <option value="forest-fire">🔥 Forest Fire</option>
              <option value="night-ops">🌑 Night Ops</option>
              <option value="wild-green">🌿 Wild Green</option>
            </select>
          </div>
          <div className="skin-dropdown-container">
            <button className={`btn ${account ? 'btn-outline' : ''}`} onClick={() => connectWallet(null, true)} disabled={loading} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? <span className="spin">⏳</span> : <span>👛</span>}
              {account ? `${account.substring(0, 10).toUpperCase()}...` : 'CONECTAR WALLET'}
            </button>
          </div>
        </div>
      </header>

      {/* RENDERIZADO PRINCIPAL AUTOMATIZADO - FLUJO ÚNICO */}
      {!account ? (
        <main>
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🛰️</div>
            <h2 style={{ color: 'var(--accent-color)' }}>SISTEMA DE TRAZABILIDAD FIREOPS</h2>
            <p style={{ color: '#888', maxWidth: '500px', margin: '0 auto 2rem' }}>
              Conecte su billetera autorizada para acceder a sus funciones de mando o de campo.
            </p>
            <button className="btn" onClick={() => connectWallet(null, true)} style={{ padding: '1rem 2rem' }}>CONECTAR AHORA</button>
          </div>
        </main>
      ) : (
        /* ESTADO DE CARGA/TRANSICIÓN */
        loading ? (
          <main>
            <div className="card" style={{ textAlign: 'center', padding: '10rem 2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <div className="spin" style={{ fontSize: '4rem', marginBottom: '2rem' }}>🛰️</div>
              <h2 style={{ letterSpacing: '2px', color: 'var(--accent-color)' }}>SINCRONIZANDO CADENA DE MANDO</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Verificando credenciales en la red de auditoría...</p>
            </div>
          </main>
        ) : (isBaseOperativa || isJefeEscena || isAdmin || isAuditor) ? (
        /* VISTA DE MANDO / AUDITORÍA - PRIORIDAD ALTA */
        currentView === 'tactical' && selectedIncident ? (
          <TacticalPanel
            eventoId={selectedIncident.id}
            coordenadas={selectedIncident.coords}
            riesgo={selectedIncident.riesgo}
            contract={contractInstance}
            onBack={() => setCurrentView('inventory')}
            onGenerateReport={(logs) => generarReportePDF(selectedIncident, logs)}
            inventory={inventory}
            personnel={personnel}
            startTimeProp={selectedIncident.timestamp}
            endTimeProp={selectedIncident.timestampFin}
            isActivoProp={selectedIncident.activo}
          />
        ) : (
          <main>
            {/* Contenedor de Toasts Flotantes */}
            <div className="toast-container">
              {status.message && (
                <div className={`status-banner ${status.type}`}>
                  {status.type === 'success' && <span>✅</span>}
                  {status.type === 'error' && <span>❌</span>}
                  {status.type === 'warning' && <span>⚠️</span>}
                  {status.type === 'info' && <span className="spin">⏳</span>}
                  <span>{status.message}</span>
                </div>
              )}
            </div>

            {/* RENDERIZADO EXCLUSIVO POR ROL (Mesa de Trabajo) */}
            {isAdmin && currentView === 'inventory' ? (
              <AdminDashboard
                contract={contractInstance}
                account={account}
                personnel={personnel}
                onRefresh={hardRefresh}
                setStatus={setStatus}
              />
            ) : isAuditor && currentView === 'inventory' ? (
              <AuditorDashboard 
                contract={contractInstance}
                inventory={inventory}
                personnel={personnel}
                incidents={incidents}
                hardRefresh={hardRefresh}
                fetchAssetHistory={fetchAssetHistory}
                generarReportePDF={generarReportePDF}
                onViewV360={(fire) => { setSelectedV360Incident(fire); setShowV360Modal(true); }}
              />
            ) : isBaseOperativa && currentView === 'inventory' ? (
              <>
                <BaseOperativaDashboard
                  contract={contractInstance}
                  account={account}
                  inventory={inventory.map(item => ({
                    ...item,
                    estadoLabel: item.estado === 0 ? 'DISPONIBLE' : item.estado === 1 ? 'EN  USO' : item.estado === 2 ? 'TALLER' : item.estado === 3 ? 'EXTRAVIADO' : 'EN RETORNO',
                    custodioNombre: personnel.find(p => p.address?.toLowerCase() === item.custodio?.toLowerCase())?.name || (item.custodio === ethers.ZeroAddress ? 'BASE' : '---')
                  }))}
                  personnel={personnel.filter(p => !p.isAuditor)}
                  loading={loading}
                  setLoading={setLoading}
                  setStatus={setStatus}
                  hardRefresh={hardRefresh}
                  fetchAssetHistory={fetchAssetHistory}
                  openReturnModal={openReturnModal}
                />

                {/* La Base Operativa también ve los Incidentes Activos para seguimiento */}
                {incidents.length > 0 && (
                  <div className="card" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ margin: 0 }}>📑 INCIDENTES EN TABLERO TÁCTICO (SEGUIMIENTO)</h2>
                      <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} onClick={hardRefresh}>🔄 REFRESCAR</button>
                    </div>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {incidents.map((fire) => (
                        <div key={fire.id} className="status-badge" style={{ justifyContent: 'space-between', padding: '1.2rem', background: 'var(--bg-primary)', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontWeight: '800', color: 'var(--accent-color)' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                              <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatTime(fire.timestamp)}</span>
                              <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Riesgo:</span>
                                <span className={`status-pill risk-${fire.riesgo}`} style={{ fontSize: '0.65rem', fontWeight: '800' }}>
                                  {fire.riesgo === '1' && 'BAJO'}
                                  {fire.riesgo === '2' && 'MODERADO'}
                                  {fire.riesgo === '3' && 'ALTO'}
                                  {fire.riesgo === '4' && 'MUY ALTO'}
                                  {fire.riesgo === '5' && 'EXTREMO'}
                                </span>
                                {fire.activo && (
                                  <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedRiskIncident(fire); setShowRiskModalApp(true); }}
                                    title="Editar Riesgo"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              {!fire.activo && (
                                <>
                                  <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>FIN: {formatTime(fire.timestampFin)}</span>
                                  <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                                  <span style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6464', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>CERRADO</span>
                                </>
                              )}
                            </div>
                            <div>
                              <span>📍 {fire.coords}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.70rem', border: '1px solid var(--accent-color)', opacity: fire.activo ? 1 : 0.5 }}
                              onClick={(e) => { e.stopPropagation(); setSelectedV360Incident(fire); setShowV360Modal(true); }}
                            >
                              👁️ RESUMEN EVENTO
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : isJefeEscena ? (
              <>
                <div className="card" style={{ borderColor: 'var(--accent-color)', borderStyle: 'dashed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2>OPERACIONES DE CAMPO (JEFE DE ESCENA)</h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Apertura y seguimiento de incidentes activos. Genere bitácoras de combate directamente en la red.
                      </p>
                    </div>
                    <div className="badge-role" style={{ background: 'rgba(255, 111, 0, 0.2)' }}>👨‍🚒 JEFE DE ESCENA</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
                    <div>
                      <label className="skin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>COORDENADAS (LAT, LON)</label>
                      <input type="text" className="skin-select" style={{ width: '100%', padding: '0.8rem', backgroundImage: 'none' }} placeholder="-1.023, -78.456" value={fireCoords} onChange={(e) => setFireCoords(e.target.value)} />
                    </div>
                    <div>
                      <label className="skin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>NIVEL DE RIESGO</label>
                      <select className="skin-select" style={{ width: '100%', padding: '0.8rem' }} value={riskLevel} onChange={(e) => setRiskLevel(Number(e.target.value))}>
                        <option value="1">1 - Bajo</option>
                        <option value="2">2 - Moderado</option>
                        <option value="3">3 - Alto</option>
                        <option value="4">4 - Crítico</option>
                        <option value="5">5 - Catastrófico</option>
                      </select>
                    </div>
                    <button className="btn" onClick={abrirIncidente} disabled={loading} style={{ padding: '0.8rem' }}>
                      {loading ? <span className="spin">⏳</span> : <span>🚀</span>} DESPLEGAR INCIDENTE
                    </button>
                  </div>
                </div>

                {incidents.length > 0 && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ margin: 0 }}>INCIDENTES EN TABLERO TÁCTICO</h2>
                      <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} onClick={hardRefresh}>🔄 REFRESCAR</button>
                    </div>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {incidents.map((fire) => (
                        <div key={fire.id} className="status-badge" style={{ justifyContent: 'space-between', padding: '1.2rem', background: 'var(--bg-primary)', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontWeight: '800', color: 'var(--accent-color)' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                              <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatTime(fire.timestamp)}</span>
                              <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Riesgo:</span>
                                <span className={`status-pill risk-${fire.riesgo}`} style={{ fontSize: '0.65rem', fontWeight: '800' }}>
                                  {fire.riesgo === '1' && 'BAJO'}
                                  {fire.riesgo === '2' && 'MODERADO'}
                                  {fire.riesgo === '3' && 'ALTO'}
                                  {fire.riesgo === '4' && 'MUY ALTO'}
                                  {fire.riesgo === '5' && 'EXTREMO'}
                                </span>
                                {fire.activo && (
                                  <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedRiskIncident(fire); setShowRiskModalApp(true); }}
                                    title="Editar Riesgo"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              {!fire.activo && (
                                <>
                                  <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                                  <span style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6464', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>CERRADO</span>
                                </>
                              )}
                            </div>
                            <div>
                              <span>📍 {fire.coords}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {fire.activo && (
                              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.70rem', border: '1px solid var(--accent-color)' }} onClick={() => setSelectedAssignmentIncident(fire)}>🔗 ASIGNAR RECURSO</button>
                            )}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.70rem', border: '1px solid var(--accent-color)', opacity: fire.activo ? 1 : 0.5 }}
                              onClick={(e) => { e.stopPropagation(); setSelectedV360Incident(fire); setShowV360Modal(true); }}
                            >
                              👁️ RESUMEN EVENTO
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.70rem' }} onClick={() => { setSelectedIncident(fire); setCurrentView('tactical'); }}>🚀 {fire.activo ? 'PANEL DE CONTROL' : 'VER BITÁCORA'}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listado de Personal (Solo Lectura para Jefe de Escena) */}
                <div style={{ marginTop: '2rem' }}>
                  <PersonnelTable
                    personnel={personnel.filter(p => !p.isAuditor)}
                    inventory={inventory}
                    canManage={false}
                    hardRefresh={hardRefresh}
                  />
                </div>

                {/* Listado de Activos (Solo Lectura para Jefe de Escena) */}
                <div style={{ marginTop: '2rem' }}>
                  <AssetTable
                    inventory={inventory.map(item => ({
                      ...item,
                      estadoLabel: item.estado === 0 ? 'Disponible' : item.estado === 1 ? 'EnUso' : item.estado === 2 ? 'Taller' : item.estado === 3 ? 'Perdido' : 'EnRetorno',
                      custodioNombre: personnel.find(p => p.address?.toLowerCase() === item.custodio?.toLowerCase())?.name || (item.custodio === ethers.ZeroAddress ? 'BASE' : '---')
                    }))}
                    canAudit={false}
                    fetchAssetHistory={fetchAssetHistory}
                    hardRefresh={hardRefresh}
                  />
                </div>
              </>
            ) : null}


            <div className="card">
              <h2>ESTADO DEL SISTEMA DE MONITOREO</h2>
              <div className="status-badge"><span className="status-dot"></span><span>NODO LOCAL: 31337</span></div>
              {account && (
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Sesión activa: <code style={{ color: 'var(--accent-color)' }}>{account}</code>
                </div>
              )}
            </div>
          </main>
        )
      ) : (
          /* PRIORIDAD 3: CASO BASE - VISTA DE CAMPO (BRIGADISTA) */
          <BrigadistaDashboard
            personnel={personnel}
            inventory={inventory}
            incidents={incidents}
            contract={contractInstance}
            account={account}
            onConnect={connectWallet}
            onBack={() => { }}
            onRefresh={hardRefresh}
          />
        )
      )}


      {
        selectedAssignmentIncident && (
          <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '90%', maxWidth: '500px', border: '2px solid var(--accent-color)', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🔗 ASIGNACIÓN TÁCTICA</h3>
              <button className="btn btn-secondary" onClick={() => setSelectedAssignmentIncident(null)}>×</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888' }}>
              Asignando recursos al incidente <strong>ID-INC{selectedAssignmentIncident.id.padStart(3, '0')}</strong>
            </p>
            <div style={{ margin: '1.5rem 0' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>RECURSO DISPONIBLE (Filtro):</label>
              <input
                type="text"
                placeholder="Escribe para buscar (ej: moto)..."
                className="skin-select"
                style={{ width: '100%', marginBottom: '1rem', backgroundImage: 'none', padding: '0.6rem' }}
                value={assignmentSearchTerm}
                onChange={(e) => setAssignmentSearchTerm(e.target.value)}
              />

              <div style={{ backgroundColor: '#000', borderRadius: '8px', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.5rem', borderBottom: '1px solid #222', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#888' }}>RECURSOS DISPONIBLES</span>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {selectedResources.length > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#000', backgroundColor: 'var(--accent-color)', padding: '0px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {selectedResources.length} SELECCIONADOS
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)' }}>{inventory.filter(i => i.estado === 0).length} en stock</span>
                  </div>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '0.2rem' }}>
                  {inventory
                    .filter(i => i.estado === 0)
                    .filter(i =>
                      i.serialId.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) ||
                      i.descripcion.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                    )
                    .map(i => (
                      <label key={i.hash} style={{ display: 'flex', alignItems: 'center', padding: '0.4rem', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', gap: '0.8rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedResources.includes(i.hash)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedResources(prev => [...prev, i.hash])
                            else setSelectedResources(prev => prev.filter(id => id !== i.hash))
                          }}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{i.serialId}</span>
                          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{i.descripcion}</span>
                        </div>
                      </label>
                    ))
                  }
                  {inventory.filter(i => i.estado === 0).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>No hay recursos disponibles</div>
                  )}
                </div>

                <details style={{ marginTop: '0.5rem', borderTop: '1px solid #222' }}>
                  <summary style={{ fontSize: '0.7rem', color: '#666', padding: '0.5rem', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔴 NO DISPONIBLES (EN USO)</span>
                    <span>▼</span>
                  </summary>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', opacity: 0.6 }}>
                    {inventory
                      .filter(i => i.estado !== 0)
                      .filter(i =>
                        i.serialId.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) ||
                        i.descripcion.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                      )
                      .map(i => (
                        <div key={i.hash} style={{ display: 'flex', alignItems: 'center', padding: '0.4rem', borderBottom: '1px solid #1a1a1a', gap: '0.8rem', filter: 'grayscale(1)' }}>
                          <input type="checkbox" disabled style={{ width: '18px', height: '18px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#888' }}>{i.serialId}</span>
                            <span style={{ fontSize: '0.6rem', color: '#666' }}>{i.descripcion}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </details>
              </div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>BRIGADISTA ASIGNADO:</label>
              <select className="skin-select" value={selectedBrigadista} onChange={(e) => setSelectedBrigadista(e.target.value)} style={{ width: '100%', fontSize: '1rem' }}>
                <option value="">-- Seleccionar Personal --</option>
                {personnel
                  .filter(p => !p.isAuditor && (p.incidente === '---' || p.incidente === `ID-INC${selectedAssignmentIncident.id.padStart(3, '0')}`))
                  .map(p => <option key={p.address} value={p.address} style={{ padding: '0.4rem' }}>{p.name} ({p.specialty})</option>)
                }
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" onClick={asignarInsumo} disabled={loading}>{loading ? '...' : 'CONFIRMAR DESPLIEGUE'}</button>
              <button className="btn btn-secondary" onClick={() => setSelectedAssignmentIncident(null)}>CANCELAR</button>
            </div>
          </div>
        )
      }

        {/* [Modal_Vision_360] */}
        {showV360Modal && selectedV360Incident && (
          <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: '95%', maxWidth: '700px', border: '2px solid var(--accent-color)', boxShadow: '0 0 50px rgba(0,0,0,0.9)', background: '#111', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <h3 style={{ margin: 0, letterSpacing: '1px' }}>
                  RESUMEN DEL EVENTO: <span style={{ color: 'var(--accent-color)' }}>ID-INC{selectedV360Incident.id.padStart(3, '0')}</span>
                </h3>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowV360Modal(false)} style={{ padding: '0.2rem 0.6rem' }}>×</button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,165,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.1)' }}>
                <div>
                  <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>INCIDENTE:</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800' }}>ID-INC{selectedV360Incident.id.padStart(3, '0')}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>ESTADO:</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: selectedV360Incident.activo ? '#4dff4d' : '#ff4d4d' }}>{selectedV360Incident.activo ? 'ACTIVO' : 'FINALIZADO'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>COORDENADAS:</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ccc' }}>{selectedV360Incident.coords}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>INICIO:</div>
                  <div style={{ fontSize: '0.8rem' }}>{formatTime(selectedV360Incident.timestamp)}</div>
                </div>
                {!selectedV360Incident.activo && (
                  <div style={{ textAlign: 'right', background: 'rgba(255,0,0,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,0,0,0.1)' }}>
                    <div style={{ color: '#ff4d4d', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>FIN:</div>
                    <div style={{ fontSize: '0.8rem', color: '#fff' }}>{formatTime(selectedV360Incident.timestampFin)}</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', color: 'var(--accent-color)', letterSpacing: '1px' }}>PERSONA Y RECURSOS ASIGNADOS</h4>
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                  {personnel
                    .filter(p => p.incidente === `ID-INC${selectedV360Incident.id.padStart(3, '0')}`)
                    .map(p => {
                      const assignedItems = inventory.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1);
                      return (
                        <div key={p.address} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedV360Brigadistas[p.address] ? '0.8rem' : '0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-color)' }}>{p.isJefe ? '👨‍🚒 Jefe:' : '👤'} {p.name}</span>
                              <button 
                                onClick={() => toggleV360Brigadista(p.address)}
                                style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.2)', color: 'var(--accent-color)', cursor: 'pointer', width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}
                              >
                                {expandedV360Brigadistas[p.address] ? '−' : '+'}
                              </button>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{p.specialty}</span>
                          </div>
                          {expandedV360Brigadistas[p.address] && (
                            <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              {assignedItems.length > 0 ? assignedItems.map(item => (
                                <div key={item.hash} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.8rem', borderRadius: '5px', border: '1px solid rgba(255,165,0,0.1)' }}>
                                  <span style={{ color: 'var(--accent-color)' }}>📦</span>
                                  <span style={{ fontWeight: '600', color: '#eee' }}>{item.descripcion}</span>
                                  <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: 'auto', fontFamily: 'monospace' }}>{item.serialId}</span>
                                </div>
                              )) : <span style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic', paddingLeft: '1.5rem' }}>Sin recursos vinculados</span>}
                            </div>
                          )}
                        </div>
                      )
                    })
                  }
                  {personnel.filter(p => p.incidente === `ID-INC${selectedV360Incident.id.padStart(3, '0')}`).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#666', border: '1px dashed #333', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                      No se detecta personal asignado oficialmente a este incidente.
                    </div>
                  )}
                </div>
              </div>

              {/* [NUEVO] RECURSOS EN CAMPO */}
              {v360Logs.some(log => log.type === 'pin') && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', color: 'var(--accent-color)', letterSpacing: '1px' }}>RECURSOS EN CAMPO ({v360Logs.filter(log => log.type === 'pin').length})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem' }}>
                    {v360Logs.filter(log => log.type === 'pin').map((res, idx) => {
                      let label = "RECURSO";
                      let coords = "";
                      let typeStr = "PIN";
                      try {
                        const parsed = JSON.parse(res.detalles);
                        label = parsed.fullLabel || parsed.label;
                        typeStr = (parsed.pinType || 'pin').toUpperCase();
                        if (parsed.latlng) coords = `${parsed.latlng.lat.toFixed(4)}, ${parsed.latlng.lng.toFixed(4)}`;
                      } catch (e) {
                        label = res.detalles.split(' [')[0];
                        coords = res.detalles.match(/\[(.*?)\]/)?.[1] || '';
                      }

                      return (
                        <div key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,165,0,0.05)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ fontWeight: 'bold', color: '#eee' }}>📍 {label} <span style={{ color: 'var(--accent-color)', fontSize: '0.6rem' }}>({typeStr})</span></div>
                          <div style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace' }}>{coords}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', color: 'var(--accent-color)' }}>BITÁCORA HISTÓRICA</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {v360Logs.filter(log => log.type !== 'pin').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#555', fontSize: '0.8rem' }}>No hay hitos registrados en la bitácora todavía.</div>
                  ) : (
                    v360Logs.filter(log => log.type !== 'pin').map((log, i) => {
                      const item = log.codigoInsumo && log.codigoInsumo !== ethers.ZeroHash ? inventory.find(i => i.hash === log.codigoInsumo) : null;
                      const opName = personnel.find(p => p.address.toLowerCase() === log.operador.toLowerCase())?.name || log.operador.substring(0, 8) + '...';
                      return (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '0.5px' }}>
                                Op: {opName}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{ fontSize: '0.65rem', color: '#666' }}>{new Date(log.timestamp * 1000).toLocaleString()}</span>
                              </div>
                            </div>
                            {item && (
                              <span style={{ fontSize: '0.65rem', color: '#ff8c00', background: 'rgba(255,140,0,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,140,0,0.2)', fontWeight: 'bold' }}>
                                📦 {item.serialId} - {item.descripcion}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#eee', lineHeight: '1.5', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.4rem' }}>
                            {(() => {
                              let hitoText = log.detalles;
                              try {
                                const parsed = JSON.parse(log.detalles);
                                hitoText = parsed.text || log.detalles;
                              } catch (e) {}

                              const hasEstado = hitoText.includes('[ESTADO:');
                              const hasDanoCritico = (hitoText.includes('Daño Crítico') || hitoText.includes('Daño Critico')) && !hasEstado;

                              return (
                                <>
                                  {hasEstado && (
                                    <div style={{ marginBottom: '0.4rem' }}>
                                      <span style={{ 
                                        background: hitoText.includes('PERDIDO') ? 'rgba(163, 51, 200, 0.1)' : 
                                                    hitoText.includes('DAÑO CRÍTICO') ? 'rgba(255, 77, 77, 0.1)' : 
                                                    hitoText.includes('DAÑO MENOR') ? 'rgba(255, 204, 0, 0.1)' : 'rgba(77, 255, 77, 0.1)', 
                                        color: hitoText.includes('PERDIDO') ? '#e086ff' : 
                                               hitoText.includes('DAÑO CRÍTICO') ? '#ff6b6b' : 
                                               hitoText.includes('DAÑO MENOR') ? '#ffcc00' : '#00ff88', 
                                        border: `1px solid ${hitoText.includes('PERDIDO') ? 'rgba(163, 51, 200, 0.3)' : 
                                                              hitoText.includes('DAÑO CRÍTICO') ? 'rgba(255, 77, 77, 0.3)' : 
                                                              hitoText.includes('DAÑO MENOR') ? 'rgba(255, 204, 0, 0.3)' : 'rgba(0, 255, 136, 0.3)'}`,
                                        padding: '0.15rem 0.5rem', 
                                        borderRadius: '4px', 
                                        fontSize: '0.65rem', 
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        {hitoText.match(/\[ESTADO: (.*?)\]/)?.[0] || 'REPORTE DE ESTADO'}
                                      </span>
                                    </div>
                                  )}
                                  {hasDanoCritico && (
                                    <div style={{ marginBottom: '0.4rem' }}>
                                      <span style={{ background: '#ff4d4d', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        ⚠️ REPORTE DE DAÑO CRÍTICO
                                      </span>
                                    </div>
                                  )}
                                  {hitoText.replace(/\[ESTADO: .*?\] /, '')}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid #333', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#111', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
              <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }} onClick={() => { setShowV360Modal(false); setSelectedIncident(selectedV360Incident); setCurrentView('tactical'); }}>
                🚀 PANEL DE CONTROL
              </button>
              <button className="btn" style={{ width: '100%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', background: 'var(--accent-color)', color: '#000' }} onClick={() => generarReportePDF()}>
                📄 GENERAR REPORTE
              </button>
            </div>
          </div>
        )
      }

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '1px' }}>FIREOPS v1.1 • Web3 Ecosystem</p>
      </footer>
      {showHistoryModal && historyData.item && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowHistoryModal(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none', zIndex: 2000, width: '100%', maxWidth: '600px', border: '2px solid var(--accent-color)', boxShadow: '0 0 50px rgba(0,0,0,0.9)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--accent-color)' }}>📜 HISTORIAL DE ACTIVO</h3>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{historyData.item.serialId} | {historyData.item.descripcion}</div>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }} className="custom-scrollbar">
              {historyData.logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  No se encontraron registros previos para este activo en la blockchain.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                  <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'rgba(255,165,0,0.2)' }}></div>
                  {historyData.logs.map((log, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                      <div style={{ position: 'absolute', left: '-29px', top: '5px', width: '16px', height: '16px', borderRadius: '50%', background: log.type === 'asignacion' ? '#ffa500' : log.type === 'retorno' ? '#4dff4d' : '#0096ff', border: '3px solid #111', zIndex: 2 }}></div>
                      <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.2rem' }}>{formatTime(log.timestamp)}</div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', borderLeft: `3px solid ${log.type === 'asignacion' ? '#ffa500' : log.type === 'retorno' ? '#4dff4d' : '#0096ff'}` }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                          {log.type === 'asignacion' && '🚀 ASIGNACIÓN TÁCTICA'}
                          {log.type === 'hito' && '📝 REPORTE DE CAMPO'}
                          {log.type === 'retorno' && '✅ RETORNO A BASE'}
                        </div>
                         <div style={{ fontSize: '0.85rem', color: '#ccc' }}>
                           {log.details.includes('[ESTADO:') && (
                             <div style={{ marginBottom: '0.4rem' }}>
                               <span style={{ 
                                 background: log.details.includes('PERDIDO') ? 'rgba(163, 51, 200, 0.1)' : 
                                             log.details.includes('DAÑO CRÍTICO') ? 'rgba(255, 77, 77, 0.1)' : 
                                             log.details.includes('DAÑO MENOR') ? 'rgba(255, 204, 0, 0.1)' : 'rgba(77, 255, 77, 0.1)', 
                                 color: log.details.includes('PERDIDO') ? '#e086ff' : 
                                        log.details.includes('DAÑO CRÍTICO') ? '#ff6b6b' : 
                                        log.details.includes('DAÑO MENOR') ? '#ffcc00' : '#00ff88', 
                                 border: `1px solid ${log.details.includes('PERDIDO') ? 'rgba(163, 51, 200, 0.3)' : 
                                                       log.details.includes('DAÑO CRÍTICO') ? 'rgba(255, 77, 77, 0.3)' : 
                                                       log.details.includes('DAÑO MENOR') ? 'rgba(255, 204, 0, 0.3)' : 'rgba(0, 255, 136, 0.3)'}`,
                                 padding: '0.15rem 0.5rem', 
                                 borderRadius: '4px', 
                                 fontSize: '0.65rem', 
                                 fontWeight: '800',
                                 textTransform: 'uppercase',
                                 letterSpacing: '0.5px'
                               }}>
                                 {log.details.match(/\[ESTADO: (.*?)\]/)?.[0] || 'REPORTE DE ESTADO'}
                               </span>
                             </div>
                           )}
                           {log.details.replace(/\[ESTADO: .*?\] /, '')}
                         </div>

                        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                          Responsable: {String(log.operador) === 'BASE' ? 'BASE OPERATIVA' : (personnel.find(p => String(p.address).toLowerCase() === String(log.operador).toLowerCase())?.name || String(log.operador).substring(0, 10) + '...')}
                        </div>
                        <div style={{ fontSize: '0.65rem', marginTop: '0.2rem', color: '#555', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => generarReporteHistorialPDF(historyData.item, historyData.logs)} style={{ flex: 1, padding: '0.8rem', fontSize: '0.8rem' }}>📦 REPORTE HISTORIAL</button>
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)} style={{ flex: 1, padding: '0.8rem', fontSize: '0.8rem' }}>CERRAR HISTORIAL</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CAMBIO DE RIESGO DESDE DASHBOARD */}
      {showRiskModalApp && selectedRiskIncident && (
        <div className="v360-modal-overlay">
          <div className="v360-modal-content card" style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--accent-color)' }}>ACTUALIZAR CRITICIDAD</h3>
            <p style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '1.5rem' }}>
              Incidente: <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>ID-INC{selectedRiskIncident.id.padStart(3, '0')}</span>
            </p>

            <select
              defaultValue={selectedRiskIncident.riesgo}
              onChange={(e) => actualizarRiesgoApp(Number(e.target.value))}
              disabled={loading}
              style={{ width: '100%', padding: '0.8rem', marginBottom: '1.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
            >
              <option value="1">1 - Bajo</option>
              <option value="2">2 - Moderado</option>
              <option value="3">3 - Alto</option>
              <option value="4">4 - Muy Alto</option>
              <option value="5">5 - Extremo</option>
            </select>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRiskModalApp(false)}
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORÍA (GLOBAL) */}
      {showReturnModal && selectedReturnItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', border: '5px double #4dff4d', background: '#050505', padding: '1.5rem', boxShadow: '0 0 30px rgba(77, 255, 77, 0.2)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(77, 255, 77, 0.3)', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#4dff4d', letterSpacing: '1px', textShadow: '0 0 10px rgba(77,255,77,0.5)' }}>📥 RECEPCIÓN FÍSICA Y AUDITORÍA</h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="close-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4444',
                  fontSize: '2.5rem',
                  cursor: 'pointer',
                  lineHeight: '0.8',
                  padding: '0',
                  fontWeight: 'lighter'
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', borderLeft: '4px solid #4dff4d' }}>
                <p style={{ margin: 0 }}><strong>Equipo:</strong> {selectedReturnItem.serialId} - {selectedReturnItem.descripcion}</p>
                <p style={{ margin: '0.5rem 0 0 0' }}><strong>Procedencia:</strong> {selectedReturnItem.incidente} {!selectedReturnItem.incidenteActivo && '(Finalizado)'}</p>
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '1rem', fontStyle: 'italic' }}>
                  Confirmar la recepción del equipo en base y realizar auditoría de consumo/estado.
                </p>
              </div>

              <div>
                <label className="skin-label">ESTADO FINAL (CHEQUEO FÍSICO)</label>
                <select className="skin-select" value={returnForm.estadoFinal} onChange={(e) => setReturnForm({ ...returnForm, estadoFinal: Number(e.target.value) })}>
                  <option value="0">✅ Disponible (Apto para re-despliegue)</option>
                  <option value="2">🛠️ A Taller (Requiere Mantenimiento)</option>
                  <option value="3">❌ Perdido / Destruido</option>
                </select>
              </div>

              <div>
                <label className="skin-label">CONSUMO REAL (LITROS)</label>
                <input type="number" className="skin-select" style={{ backgroundImage: 'none' }} value={returnForm.consumoReal} onChange={(e) => setReturnForm({ ...returnForm, consumoReal: Number(e.target.value) })} />
                {selectedReturnItem.consumoNominal > 0 && (
                  <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.4rem' }}>
                    Referencia Nominal: {selectedReturnItem.consumoNominal} L/h
                  </p>
                )}
              </div>

              <div>
                <label className="skin-label">MOTIVO DE DISCREPANCIA (OPCIONAL)</label>
                <textarea className="skin-select" style={{ backgroundImage: 'none', height: '140px', resize: 'vertical', minHeight: '100px', width: '100%', boxSizing: 'border-box' }} placeholder="Describa si el equipo regresa con daños no reportados..." value={returnForm.motivoDiscrepancia} onChange={(e) => setReturnForm({ ...returnForm, motivoDiscrepancia: e.target.value })} />
              </div>

              <button className="btn" onClick={ejecutarRetorno} disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                {loading ? 'PROCESANDO...' : 'CONFIRMAR RECEPCIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
