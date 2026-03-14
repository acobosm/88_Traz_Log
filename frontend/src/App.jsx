import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import Papa from 'papaparse'
import './index.css'
import trazabilidadAbi from './contracts/TrazabilidadLogistica.json'
import TacticalPanel from './TacticalPanel'
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
  const [selectedResource, setSelectedResource] = useState('')
  const [selectedBrigadista, setSelectedBrigadista] = useState('')
  const [personnel, setPersonnel] = useState([])
  const [newPerson, setNewPerson] = useState({ address: '', name: '', specialty: '', role: 2 })
  const [personnelFilter, setPersonnelFilter] = useState('all')
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('')
  const [showV360Modal, setShowV360Modal] = useState(false)
  const [selectedV360Incident, setSelectedV360Incident] = useState(null)
  const [v360Logs, setV360Logs] = useState([])
  const fileInputRef = useRef(null)

  // Autolimpiar filtro y selecciones al abrir el modal de asignación
  useEffect(() => {
    if (selectedAssignmentIncident) {
      setAssignmentSearchTerm('')
      setSelectedResource('')
      setSelectedBrigadista('')
    }
  }, [selectedAssignmentIncident])

  useEffect(() => {
    const fetchV360Logs = async () => {
      if (showV360Modal && selectedV360Incident && contractInstance) {
        try {
          const logs = await contractInstance.obtenerLogEvento(BigInt(selectedV360Incident.id))
          const formatted = logs.map(l => {
            let details = l.detalles;
            let type = 'text';
            try {
              const parsed = JSON.parse(l.detalles);
              if (parsed.type === 'pin') {
                const coordsStr = parsed.latlng ? `${parsed.latlng.lat.toFixed(4)}, ${parsed.latlng.lng.toFixed(4)}` : '';
                details = `📍 ${parsed.label} (${parsed.pinType.toUpperCase()}) ${coordsStr ? `[${coordsStr}]` : ''}`;
                type = 'pin';
              } else if (parsed.text) {
                details = parsed.text;
              }
            } catch (e) {
              // Not JSON, use as is
            }
            return {
              timestamp: Number(l.timestamp),
              detalles: details,
              operador: l.operador,
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
  }, [showV360Modal, selectedV360Incident, contractInstance])

  const generarReportePDF = () => {
    if (!selectedV360Incident) return;

    const doc = new jsPDF();
    const eventId = selectedV360Incident.id.padStart(3, '0');
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
    doc.text(`Estado: ${selectedV360Incident.activo ? "ACTIVO" : "CERRADO"}`, 25, 55);
    doc.text(`Fecha Inicio: ${formatTime(selectedV360Incident.timestamp)}`, 25, 62);
    doc.text(`Coordenadas: ${selectedV360Incident.coords || "N/A"}`, 25, 69);

    // Personnel & Resources
    let yPos = 85;
    doc.setFontSize(12);
    doc.text("PERSONAL Y RECURSOS ASIGNADOS", 20, yPos);
    yPos += 10;
    doc.setFontSize(9);

    const assignedPersonnel = personnel.filter(p => p.incidente === `ID-INC${eventId}`);
    if (assignedPersonnel.length === 0) {
      doc.text("No hay personal asignado oficialmente.", 25, yPos);
      yPos += 7;
    } else {
      assignedPersonnel.forEach(p => {
        const role = p.isJefe ? "[JEFE]" : "[BRIGADISTA]";
        doc.setFont("helvetica", "bold");
        doc.text(`${role} ${p.name} - ${p.specialty}`, 25, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");

        const items = inventory.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1);
        if (items.length > 0) {
          items.forEach(item => {
            doc.text(`  • 📦 ${item.descripcion} (${item.serialId})`, 30, yPos);
            yPos += 5;
          });
        } else {
          doc.text("  • Sin recursos vinculados", 30, yPos);
          yPos += 5;
        }
        yPos += 3;
      });
    }

    // Bitácora
    yPos += 5;
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12);
    doc.text("BITÁCORA DE HITOS", 20, yPos);
    yPos += 10;
    doc.setFontSize(8);

    if (v360Logs.length === 0) {
      doc.text("No hay hitos registrados.", 25, yPos);
    } else {
      v360Logs.forEach(log => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        const time = new Date(log.timestamp * 1000).toLocaleString();
        doc.setTextColor(0, 150, 255);
        doc.text(`${time} | Op: ${log.operador.substring(0, 10)}...`, 25, yPos);
        yPos += 4;
        doc.setTextColor(0);

        const splitDetails = doc.splitTextToSize(log.detalles, 160);
        doc.text(splitDetails, 25, yPos);
        yPos += (splitDetails.length * 4) + 2;
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

  const connectWallet = async () => {
    if (!window.ethereum) {
      return setStatus({ type: 'error', message: 'MetaMask no detectado.' })
    }
    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setAccount(address)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi.abi, signer)
      setContractInstance(contract)
      const roleBase = await contract.BASE_OPERATIVA_ROLE()
      const roleJefe = await contract.JEFE_ESCENA_ROLE()
      const hasRoleBase = await contract.hasRole(roleBase, address)
      const hasRoleJefe = await contract.hasRole(roleJefe, address)
      setIsBaseOperativa(hasRoleBase)
      setIsJefeEscena(hasRoleJefe)
      if (hasRoleBase || hasRoleJefe) {
        const mapping = await fetchIncidents(contract)
        await fetchInventory(contract, mapping)
        await fetchPersonnel(contract, mapping)
      }
      if (!hasRoleBase && !hasRoleJefe) {
        setStatus({ type: 'warning', message: 'Conectado. Sin roles operativos asignados.' })
      } else {
        setStatus({ type: 'success', message: 'Sistema sincronizado. Identidad verificada.' })
      }
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', message: 'Error al conectar billetera.' })
    } finally {
      setLoading(false)
    }
  }

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

        if (fire.activo) {
          // Obtener eventos de asignación para este incidente específico
          const assignmentFilter = contract.filters.InsumoAsignado(BigInt(i))
          const assignmentEvents = await contract.queryFilter(assignmentFilter, 0)

          assignmentEvents.forEach(evt => {
            const insumoHash = evt.args[1]
            const brigadistaAddr = evt.args[2]
            mapping[insumoHash] = i.toString()
            mapping[brigadistaAddr.toLowerCase()] = i.toString()
          })

          // También mapear al Jefe de Escena del incidente
          if (fire.jefeDeEscena !== ethers.ZeroAddress) {
            mapping[fire.jefeDeEscena.toLowerCase()] = i.toString()
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
      const addresses = await contract.getListaPersonal()
      const list = await Promise.all(addresses.map(async (addr) => {
        if (addr === ethers.ZeroAddress) return null
        const isBase = await contract.hasRole(roleBase, addr)
        if (isBase) return null
        const isJefe = await contract.hasRole(roleJefe, addr)
        const p = await contract.brigadistas(addr)

        // Determinar estado e incidente
        const assignedIncident = incidentMap[addr.toLowerCase()]
        const estadoLabel = assignedIncident ? 'EN INCIDENTE' : (p.estaActivo ? 'DISPONIBLE' : 'INACTIVO')

        return {
          address: addr,
          name: p.nombre,
          specialty: p.especialidad,
          isJefe,
          estado: estadoLabel,
          incidente: assignedIncident ? `ID-INC${assignedIncident.padStart(3, '0')}` : '---'
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
      const tx = await contractInstance.registrarPersonal(newPerson.address, newPerson.name, newPerson.specialty, roleHash)
      await tx.wait()
      setStatus({ type: 'success', message: `Personal ${newPerson.name} registrado.` })
      setNewPerson({ address: '', name: '', specialty: '', role: 2 })
      await hardRefresh()
    } catch (error) { console.error(error); setStatus({ type: 'error', message: 'Error al registrar personal.' }) }
    finally { setLoading(false) }
  }

  const asignarInsumo = async () => {
    if (!selectedAssignmentIncident || !selectedResource || !selectedBrigadista) return setStatus({ type: 'error', message: 'Seleccione recurso y brigadista.' })
    setLoading(true)
    try {
      const tx = await contractInstance.asignarInsumo(selectedAssignmentIncident.id, selectedResource, selectedBrigadista)
      await tx.wait()
      setStatus({ type: 'success', message: 'Recurso asignado y vinculado en blockchain.' })
      setSelectedAssignmentIncident(null)
      setSelectedResource('')
      setSelectedBrigadista('')
      await hardRefresh()
    } catch (error) { console.error(error); setStatus({ type: 'error', message: 'Error en asignación.' }) }
    finally { setLoading(false) }
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

        const assignedIncident = incidentMap[codigo]

        return {
          hash: codigo,
          serialId,
          descripcion: finalDesc,
          estado: Number(data.estado),
          consumo: data.consumoNominal.toString(),
          custodio: data.custodioActual,
          incidente: assignedIncident ? `ID-INC${assignedIncident.padStart(3, '0')}` : '---'
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
          <button className={`btn ${account ? 'btn-outline' : ''}`} onClick={connectWallet} disabled={loading} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? <span className="spin">⏳</span> : <span>👛</span>}
            {account ? `${account.substring(0, 6)}...` : 'CONECTAR WALLET'}
          </button>
        </div>
      </header>

      {currentView === 'inventory' ? (
        <main>
          {status.message && (
            <div className={`status-banner ${status.type}`}>
              {status.type === 'success' && <span>✅</span>}
              {status.type === 'error' && <span>❌</span>}
              {status.type === 'warning' && <span>⚠️</span>}
              {status.type === 'info' && <span className="spin">⏳</span>}
              <span>{status.message}</span>
            </div>
          )}

          {isBaseOperativa && (
            <>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>Centro de Gestión de Inventario</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', maxWidth: '600px' }}>
                      Panel táctico para la logística de insumos críticos. Controle el flujo de recursos en tiempo real mediante registros inmutables.
                    </p>
                  </div>
                  <div className="badge-role">🛡️ BASE OPERATIVA</div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <a href="/plantilla_inventario.csv" className="btn btn-secondary" download style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    📥 Descargar Plantilla CSV
                  </a>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={processCsv} />
                  <button className="btn" onClick={handleUploadClick} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {loading ? <span className="spin">⏳</span> : <span>📤</span>}
                    Subir Inventario
                  </button>
                </div>
              </div>

            </>
          )}

          {isJefeEscena && (
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
                  <h2>INCIDENTES EN TABLERO TÁCTICO</h2>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {incidents.map((fire) => (
                      <div key={fire.id} className="status-badge" style={{ justifyContent: 'space-between', padding: '1.2rem', background: 'var(--bg-primary)', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontWeight: '800', color: 'var(--accent-color)' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                            <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatTime(fire.timestamp)}</span>
                            <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                            <span style={{ color: fire.riesgo > 3 ? '#ff3232' : 'var(--text-secondary)' }}>⚠ Riesgo: {fire.riesgo}</span>
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
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', border: '1px solid var(--accent-color)', opacity: fire.activo ? 1 : 0.5 }}
                            onClick={(e) => { e.stopPropagation(); setSelectedV360Incident(fire); setShowV360Modal(true); }}
                          >
                            👁️ VISIÓN 360
                          </button>
                          {fire.activo && (
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', border: '1px solid var(--accent-color)' }} onClick={() => setSelectedAssignmentIncident(fire)}>🔗 ASIGNAR RECURSO</button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }} onClick={() => { setSelectedIncident(fire); setCurrentView('tactical'); }}>🚀 {fire.activo ? 'PANEL DE CONTROL' : 'VER BITÁCORA'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(isBaseOperativa || isJefeEscena) && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <div>
                  <h2>Gestión de Personal (Brigadistas)</h2>
                  {isBaseOperativa && (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      Registro de nuevos operadores y jefes de escena para el despliegue táctico.
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.7rem', color: '#666' }}>FILTRAR:</label>
                  <select className="skin-select" style={{ padding: '0.3rem', fontSize: '0.7rem', width: 'auto' }} value={personnelFilter} onChange={(e) => setPersonnelFilter(e.target.value)}>
                    <option value="all">TODOS</option>
                    <option value="available">DISPONIBLES 🟢</option>
                    <option value="assigned">EN INCIDENTE 🔴</option>
                  </select>
                </div>
              </div>
              {isBaseOperativa && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <input type="text" className="skin-select" style={{ backgroundImage: 'none', padding: '0.6rem' }} placeholder="Wallet Address (0x...)" value={newPerson.address} onChange={(e) => setNewPerson({ ...newPerson, address: e.target.value })} />
                  <input type="text" className="skin-select" style={{ backgroundImage: 'none', padding: '0.6rem' }} placeholder="Nombre Completo" value={newPerson.name} onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })} />
                  <input type="text" className="skin-select" style={{ backgroundImage: 'none', padding: '0.6rem' }} placeholder="Especialidad (Ej: Motobombista)" value={newPerson.specialty} onChange={(e) => setNewPerson({ ...newPerson, specialty: e.target.value })} />
                  <select className="skin-select" style={{ padding: '0.6rem' }} value={newPerson.role} onChange={(e) => setNewPerson({ ...newPerson, role: Number(e.target.value) })}>
                    <option value="2">Brigadista (Operador)</option>
                    <option value="1">Jefe de Escena</option>
                  </select>
                  <button className="btn" onClick={registrarPersonal} disabled={loading}>{loading ? '...' : '➕ REGISTRAR'}</button>
                </div>
              )}
              <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
                <table style={{ width: '100%', fontSize: '1rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
                      <th>NOMBRE</th>
                      <th>ESPECIALIDAD</th>
                      <th>DIRECCIÓN</th>
                      <th>ESTADO</th>
                      <th>INCIDENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnel.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No hay personal registrado aún.</td></tr>
                    ) : (
                      personnel
                        .filter(p => {
                          const isAssignedAsBrigadista = inventory.some(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1);
                          const isAssignedAsJefe = p.isJefe && incidents.some(fire => fire.jefe?.toLowerCase() === p.address?.toLowerCase());
                          const isAssigned = isAssignedAsBrigadista || isAssignedAsJefe;
                          if (personnelFilter === 'available') return !isAssigned;
                          if (personnelFilter === 'assigned') return isAssigned;
                          return true;
                        })
                        .map(p => {
                          const isAssignedAsBrigadista = inventory.some(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1);
                          const isAssignedAsJefe = p.isJefe && incidents.some(fire => fire.jefe?.toLowerCase() === p.address?.toLowerCase());
                          const isAssigned = isAssignedAsBrigadista || isAssignedAsJefe;
                          return (
                            <tr key={p.address} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem 0' }}>{p.name}</td>
                              <td>{p.specialty}</td>
                              <td style={{ fontSize: '0.8rem', opacity: 0.6 }}><code>{p.address.substring(0, 6)}...{p.address.substring(38)}</code></td>
                              <td>
                                <span className="status-badge" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', background: p.estado === 'DISPONIBLE' ? 'rgba(77,255,77,0.1)' : 'rgba(255,77,77,0.1)', color: p.estado === 'DISPONIBLE' ? '#4dff4d' : '#ff4d4d', fontWeight: 'bold', borderRadius: '4px' }}>
                                  {p.estado}
                                </span>
                              </td>
                              <td style={{ color: p.incidente !== '---' ? 'var(--accent-color)' : '#666', fontWeight: p.incidente !== '---' ? 'bold' : 'normal' }}>
                                {p.incidente}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(isJefeEscena || isBaseOperativa) && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowInventory(!showInventory)}
                style={{ padding: '0.8rem 2rem', letterSpacing: '1px', fontWeight: 'bold', border: '1px solid var(--accent-color)' }}
              >
                {showInventory ? '🔼 OCULTAR INVENTARIO' : '📦 REVISAR INVENTARIO TÁCTICO'}
              </button>
            </div>
          )}

          {showInventory && (
            <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2>📦 Tablero de Logística Forestal</h2>
                  <input type="text" placeholder="Buscar recurso o ID..." className="skin-select" style={{ padding: '0.4rem 1rem', width: '250px', backgroundImage: 'none', fontSize: '0.8rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }} onClick={() => hardRefresh()}>🔄 Refrescar Stock</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.05rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem', width: '50px' }}>#</th>
                      <th style={{ padding: '1rem', width: '120px' }}>ID SERIAL</th>
                      <th style={{ padding: '1rem', width: '120px' }}>HASH ACTIVO</th>
                      <th style={{ padding: '1rem' }}>RECURSO</th>
                      <th style={{ padding: '1rem' }}>CAPACIDAD/CONSUMO</th>
                      <th style={{ padding: '1rem' }}>ESTADO</th>
                      <th style={{ padding: '1rem' }}>INCIDENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .filter(item =>
                        item.serialId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item, idx) => (
                        <tr key={item.hash} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem', color: '#666' }}>{idx + 1}</td>
                          <td style={{ padding: '1rem', color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>{item.serialId}</td>
                          <td style={{ padding: '1rem' }}><code style={{ fontSize: '0.85rem', color: '#444' }}>{item.hash.substring(0, 10)}...</code></td>
                          <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                            <div>{item.descripcion}</div>
                            {item.estado === 1 && item.custodio !== ethers.ZeroAddress && (
                              <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--accent-color)', opacity: 0.8, marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>👤</span>
                                <span style={{ fontWeight: 'bold' }}>{personnel.find(p => p.address.toLowerCase() === item.custodio.toLowerCase())?.name || 'Cargando...'}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)', maxWidth: '100px' }}>
                            <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
                              {item.consumo > 0 ? `${item.consumo} ml/h` : 'Manual / Herramienta'}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="status-badge" style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', background: item.estado === 0 ? 'rgba(77,255,77,0.1)' : 'rgba(255,77,77,0.1)', color: item.estado === 0 ? '#4dff4d' : '#ff4d4d', fontWeight: 'bold', borderRadius: '4px' }}>
                              {item.estado === 0 ? 'DISPONIBLE' : 'EN OPERACIÓN'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: item.incidente !== '---' ? 'var(--accent-color)' : '#666', fontWeight: item.incidente !== '---' ? 'bold' : 'normal' }}>
                            {item.incidente}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
      ) : (
        <TacticalPanel eventoId={selectedIncident.id} coordenadas={selectedIncident.coords} contract={contractInstance} onBack={() => setCurrentView('inventory')} />
      )
      }

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
              <select className="skin-select" size="5" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)} style={{ width: '100%', marginBottom: '1rem', fontSize: '1rem', fontWeight: '500' }}>
                <option value="" style={{ padding: '0.5rem' }}>-- {inventory.filter(i => i.estado === 0).length} Disponibles --</option>
                {inventory
                  .filter(i => i.estado === 0)
                  .filter(i =>
                    i.serialId.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) ||
                    i.descripcion.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                  )
                  .map(i => <option key={i.hash} value={i.hash} style={{ padding: '0.5rem' }}>{i.serialId} | {i.descripcion}</option>)
                }
              </select>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>BRIGADISTA ASIGNADO:</label>
              <select className="skin-select" value={selectedBrigadista} onChange={(e) => setSelectedBrigadista(e.target.value)} style={{ width: '100%', fontSize: '1rem' }}>
                <option value="">-- Seleccionar Personal --</option>
                {personnel.map(p => <option key={p.address} value={p.address} style={{ padding: '0.4rem' }}>{p.name} ({p.specialty})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" onClick={asignarInsumo} disabled={loading}>{loading ? '...' : 'CONFIRMAR DESPLIEGUE'}</button>
              <button className="btn btn-secondary" onClick={() => setSelectedAssignmentIncident(null)}>CANCELAR</button>
            </div>
          </div>
        )
      }

      {
        showV360Modal && selectedV360Incident && (
          <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: '95%', maxWidth: '700px', border: '2px solid var(--accent-color)', boxShadow: '0 0 50px rgba(0,0,0,0.9)', background: '#111', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>�</span>
                <h3 style={{ margin: 0, letterSpacing: '1px' }}>RESUMEN DEL EVENTO</h3>
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
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: selectedV360Incident.activo ? '#4dff4d' : '#ff4d4d' }}>{selectedV360Incident.activo ? 'ACTIVO' : 'CERRADO'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>COORDENADAS:</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ccc' }}>{selectedV360Incident.coords}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>INICIO:</div>
                  <div style={{ fontSize: '0.8rem' }}>{formatTime(selectedV360Incident.timestamp)}</div>
                </div>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-color)' }}>{p.isJefe ? '👨‍🚒 Jefe:' : '👤'} {p.name}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{p.specialty}</span>
                          </div>
                          <div style={{ display: 'grid', gap: '0.4rem' }}>
                            {assignedItems.length > 0 ? assignedItems.map(item => (
                              <div key={item.hash} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.7rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.8rem', borderRadius: '5px', border: '1px solid rgba(255,165,0,0.1)' }}>
                                <span style={{ color: 'var(--accent-color)' }}>📦</span>
                                <span style={{ fontWeight: '600', color: '#eee' }}>{item.descripcion}</span>
                                <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: 'auto', fontFamily: 'monospace' }}>{item.serialId}</span>
                              </div>
                            )) : <span style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic', paddingLeft: '1.5rem' }}>Sin recursos vinculados</span>}
                          </div>
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

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.8rem', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', color: 'var(--accent-color)' }}>BITÁCORA HISTÓRICA</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {v360Logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#555', fontSize: '0.8rem' }}>No hay hitos registrados en la bitácora todavía.</div>
                  ) : (
                    v360Logs.map((log, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--accent-color)', marginBottom: '0.2rem' }}>
                          <span>{new Date(log.timestamp * 1000).toLocaleString()}</span>
                          <span style={{ color: '#666' }}>Op: {log.operador.substring(0, 6)}...</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#fff', lineHeight: '1.4' }}>{log.detalles}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
                <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }} onClick={() => { setShowV360Modal(false); setSelectedIncident(selectedV360Incident); setCurrentView('tactical'); }}>
                  �️ PANEL DE CONTROL
                </button>
                <button className="btn" style={{ width: '100%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', background: 'var(--accent-color)', color: '#000' }} onClick={generarReportePDF}>
                  📄 GENERAR REPORTE
                </button>
              </div>
            </div>
          </div>
        )
      }

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '1px' }}>FIREOPS v1.1 • Web3 Ecosystem</p>
      </footer>
    </div >
  )
}

export default App
