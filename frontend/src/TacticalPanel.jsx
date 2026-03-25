import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ethers } from 'ethers';

// Fix para los iconos de Leaflet en entornos bundling (Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const TZ_OFFSET = Number(import.meta.env.VITE_APP_TIMEZONE_OFFSET) || 0;

const formatTime = (ts) => {
    if (!ts || ts === 0) return "---";
    const d = new Date((Number(ts) + (TZ_OFFSET * 3600)) * 1000);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    return `📅 ${day}/${month}/${d.getUTCFullYear()} ${hours}:${minutes}`;
};

const TacticalPanel = ({ eventoId, coordenadas, riesgo, contract, onBack, onGenerateReport, inventory, personnel, startTimeProp, endTimeProp, isActivoProp }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [status, setStatus] = useState('LISTO');
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState(null);
    const toolRef = useRef(null);
    const [markers, setMarkers] = useState([]); // Lista para el radar de coordenadas
    const [milestones, setMilestones] = useState([]); // Lista para bitácora azul
    const [fullLogs, setFullLogs] = useState([]); // Para el reporte PDF completo
    const [mapReady, setMapReady] = useState(false);
    const [isActivo, setIsActivo] = useState(isActivoProp ?? true);
    const [startTime, setStartTime] = useState(startTimeProp ?? 0);
    const [endTime, setEndTime] = useState(endTimeProp ?? 0);
    const [showV360, setShowV360] = useState(false);
    const [expandedBrigadistas, setExpandedBrigadistas] = useState({});
    const toggleBrigadista = (addr) => {
        setExpandedBrigadistas(prev => ({ ...prev, [addr]: !prev[addr] }));
    };

    const [selectedHito, setSelectedHito] = useState(null);
    const [currentRiesgo, setCurrentRiesgo] = useState(riesgo || 1);
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [pinModal, setPinModal] = useState({ show: false, latlng: null, tool: null, options: [] });
    const [selectedPinOption, setSelectedPinOption] = useState('');
    const markerInstances = useRef({}); // Para el toggle de visibilidad
    const [isCollapsed, setIsCollapsed] = useState(false);

    const markersRef = useRef(markers);
    const inventoryRef = useRef(inventory);
    const personnelRef = useRef(personnel);

    useEffect(() => { markersRef.current = markers; }, [markers]);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
    useEffect(() => { personnelRef.current = personnel; }, [personnel]);

    // Sincronizar ref con estado para el listener de Leaflet
    useEffect(() => {
        toolRef.current = activeTool;
    }, [activeTool]);

    useEffect(() => {
        if (startTimeProp) setStartTime(Number(startTimeProp));
        if (endTimeProp) setEndTime(Number(endTimeProp));
        if (isActivoProp !== undefined) setIsActivo(isActivoProp);
    }, [startTimeProp, endTimeProp, isActivoProp]);

    useEffect(() => {
        let isMounted = true;

        if (!mapInstance.current && mapRef.current) {
            const coordStr = coordenadas || "-0.18, -78.46";
            const [lat, lon] = coordStr.split(',').map(c => parseFloat(c.trim()));

            mapInstance.current = L.map(mapRef.current, {
                zoomControl: false,
                fadeAnimation: true,
                maxZoom: 18
            }).setView([lat, lon], 15);

            L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Esri',
                maxZoom: 18
            }).addTo(mapInstance.current);

            // 1. Agregar Estrella de Origen
            const starIcon = L.divIcon({
                className: 'origin-star-icon',
                html: `<div style="font-size: 2rem; filter: drop-shadow(0 0 10px #ffea00);">⭐</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            L.marker([lat, lon], { icon: starIcon })
                .addTo(mapInstance.current)
                .bindTooltip("P0", { permanent: true, direction: 'top', className: 'custom-tooltip-origin' });

            // Agregar a la lista de markers (Radar)
            setMarkers([{ label: 'ORIGEN (Punto Cero)', latlng: { lat, lng: lon }, type: 'origin', visible: true }]);

            // Forzar recalculo de tamaño
            setTimeout(() => {
                if (mapInstance.current && isMounted) {
                    mapInstance.current.invalidateSize();
                    setMapReady(true);
                }
            }, 500);

            // Manejador de clics para colocar pines
            mapInstance.current.on('click', (e) => {
                if (toolRef.current) {
                    if (toolRef.current === 'engine') {
                        const assigned = personnelRef.current?.filter(p => p.incidente === `ID-INC${eventoId.padStart(3, '0')}`) || [];
                        const motobombas = [];
                        assigned.forEach(p => {
                            const pItems = inventoryRef.current?.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1 && item.descripcion.toLowerCase().includes('motobomba')) || [];
                            pItems.forEach(item => {
                                // Short label formatting for the map pin
                                const names = p.name.trim().split(' ');
                                const shortName = names.length > 1 ? `${names[0].charAt(0)}. ${names[1].substring(0, 3)}` : names[0];
                                const cleanLabel = `MTB-${shortName}`;
                                const isPinned = markersRef.current.some(m => m.type === 'engine' && m.label === cleanLabel);
                                if (!isPinned) motobombas.push({ label: cleanLabel, fullName: `${item.descripcion} (${p.name})` });
                            });
                        });
                        if (motobombas.length > 0) {
                            setPinModal({ show: true, latlng: e.latlng, tool: 'engine', options: motobombas });
                        }
                    } else if (toolRef.current === 'crew') {
                        const assigned = personnelRef.current?.filter(p => p.incidente === `ID-INC${eventoId.padStart(3, '0')}`) || [];
                        const brigadas = [];
                        assigned.forEach(p => {
                            const pItems = inventoryRef.current?.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1) || [];
                            if (pItems.length > 0) {
                                const hasMotobomba = pItems.some(item => item.descripcion.toLowerCase().includes('motobomba'));
                                if (!hasMotobomba) {
                                    // Short label formatting for the map pin
                                    const names = p.name.trim().split(' ');
                                    const shortName = names.length > 1 ? `${names[0].charAt(0)}. ${names[1].substring(0, 3)}` : names[0];
                                    const cleanLabel = `BRG-${shortName}`;
                                    const isPinned = markersRef.current.some(m => m.type === 'crew' && m.label === cleanLabel);
                                    if (!isPinned) brigadas.push({ label: cleanLabel, fullName: `Brigadista: ${p.name} (${pItems.length} recursos)` });
                                }
                            }
                        });
                        if (brigadas.length > 0) {
                            setPinModal({ show: true, latlng: e.latlng, tool: 'crew', options: brigadas });
                        }
                    } else {
                        const toolNames = { 'water': 'PUNTO AGUA', 'hazard': 'PELIGRO' };
                        const friendlyName = toolNames[toolRef.current];
                        const labelInput = prompt(`Indique etiqueta para ${friendlyName}:`, friendlyName);
                        if (labelInput) {
                            const label = labelInput.trim();
                            addMapMarker(e.latlng, toolRef.current, label, true);
                            setActiveTool(null);
                            setStatus('LISTO');
                        }
                    }
                }
            });

            loadTacticalLogs(mapInstance.current);
            checkIncidentStatus();
        }

        return () => {
            isMounted = false;
            if (mapInstance.current) {
                mapInstance.current.off();
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Recalcular el tamaño del mapa de Leaflet cuando el panel se colapsa/expande
    useEffect(() => {
        if (mapInstance.current) {
            setTimeout(() => {
                mapInstance.current.invalidateSize();
            }, 300);
        }
    }, [isCollapsed]);

    const checkIncidentStatus = async () => {
        if (!contract) return;
        try {
            const fire = await contract.incendios(BigInt(eventoId));
            setIsActivo(fire.activo);
            setCurrentRiesgo(Number(fire.riesgo));
            setStartTime(Number(fire.timestampInicio));
            setEndTime(Number(fire.timestampFin));
        } catch (error) {
            console.error("Error verificando estado:", error);
        }
    };

    const actualizarRiesgo = async (nuevoRiesgo) => {
        setLoading(true);
        setStatus('ACTUALIZANDO RIESGO...');
        try {
            const tx = await contract.actualizarRiesgoIncendio(BigInt(eventoId), BigInt(nuevoRiesgo));
            await tx.wait();
            setCurrentRiesgo(nuevoRiesgo);
            setShowRiskModal(false);
            setStatus('RIESGO ACTUALIZADO');
            setTimeout(() => setStatus('LISTO'), 2000);
            await loadTacticalLogs(mapInstance.current); // Recargar bitácora para ver el cambio
        } catch (error) {
            alert(`Error: ${error.message}`);
            setStatus('ERROR');
        } finally {
            setLoading(false);
        }
    };

    const cerrarIncidente = async () => {
        if (!window.confirm("¿ESTÁ SEGURO DE CERRAR EL INCIDENTE? Esta acción es irreversible en la blockchain.")) return;
        setLoading(true);
        setStatus('CERRANDO...');
        try {
            const tx = await contract.cerrarIncidente(BigInt(eventoId));
            await tx.wait();
            setIsActivo(false);
            setStatus('CERRADO');
            setTimeout(() => setStatus('LISTO'), 2000);
        } catch (error) {
            alert(`Error: ${error.message}`);
            setStatus('ERROR');
        } finally {
            setLoading(false);
        }
    };

    const loadTacticalLogs = async (specificMap = null) => {
        const targetMap = specificMap || mapInstance.current;
        if (!contract || !targetMap) return;
        
        try {
            const stateLogs = await contract.obtenerLogEvento(BigInt(eventoId));
            
            const logs = stateLogs.map(l => {
                return {
                    timestamp: Number(l.timestamp),
                    detalles: l.detalles,
                    operador: l.operador,
                    codigoInsumo: l.codigoInsumo
                };
            });
            const newMarkers = [];
            const newMilestones = [];

            // --- CORRECCIÓN: Limpiar marcadores físicos del mapa antes de repintar ---
            if (markerInstances.current) {
                Object.values(markerInstances.current).forEach(({ marker }) => {
                    if (marker && targetMap.hasLayer(marker)) {
                        marker.remove();
                    }
                });
            }
            markerInstances.current = {};

            logs.forEach(log => {
                // Hitos Tácticos (Pines)
                if (log.codigoInsumo === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    try {
                        const data = JSON.parse(log.detalles);
                        if (data.type === 'pin') {
                            const label = (data.label || "").trim();
                            addMapMarker(data.latlng, data.pinType, label, false, data.fullLabel, targetMap);
                            newMarkers.push({ 
                                label: label, 
                                fullLabel: (data.fullLabel || label).trim(),
                                latlng: data.latlng, 
                                type: data.pinType, 
                                visible: true
                            });
                        } else {
                            // Otros hitos de bitácora
                            newMilestones.push({
                                timestamp: Number(log.timestamp),
                                detalles: log.detalles,
                                operador: log.operador,
                                codigoInsumo: log.codigoInsumo
                            });
                        }
                    } catch (e) {
                        newMilestones.push({
                            timestamp: Number(log.timestamp),
                            detalles: log.detalles,
                            operador: log.operador
                        });
                    }
                } else {
                    // Hitos vinculados a insumos (Fase 2)
                    newMilestones.push({
                        timestamp: Number(log.timestamp),
                        detalles: log.detalles,
                        operador: log.operador,
                        codigoInsumo: log.codigoInsumo
                    });
                }
            });

            setMarkers(prev => [...prev.filter(m => m.type === 'origin'), ...newMarkers]);
            setMilestones(newMilestones.reverse());
            setFullLogs([...logs].reverse());
        } catch (error) {
            console.error("Error cargando bitácora:", error);
        }
    };

    const addMapMarker = (latlng, type, label, saveToBlockchain, fullLabel = null, specificMap = null) => {
        const targetMap = specificMap || mapInstance.current;
        if (!targetMap) return;

        let color = '#dc2626';
        let iconName = 'fa-fire';

        switch (type) {
            case 'engine': color = '#dc2626'; iconName = 'fa-truck-droplet'; break;
            case 'hazard': color = '#fac800'; iconName = 'fa-triangle-exclamation'; break;
            case 'water': color = '#3b82f6'; iconName = 'fa-droplet'; break;
            case 'crew': color = '#16a34a'; iconName = 'fa-users'; break;
        }

        const icon = L.divIcon({
            className: 'custom-icon',
            html: `<div class="resource-icon flex items-center justify-center rounded-full border-2 border-white shadow-lg" style="width:32px; height:32px; background-color: ${color}">
                     <i class="fa-solid ${iconName}" style="color: white; font-size: 14px;"></i>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker(latlng, { icon }).addTo(targetMap);
        marker.bindTooltip(label, { permanent: true, direction: 'bottom', className: 'custom-tooltip' });
        const tooltip = marker.getTooltip();
        
        // Guardar referencia para manipular visibilidad más tarde
        // Usamos una clave compuesta robusta con precisión fija: tipo + label + coords
        const latKey = Number(latlng.lat).toFixed(8);
        const lngKey = Number(latlng.lng).toFixed(8);
        const instanceKey = `${type}_${label}_${latKey}_${lngKey}`;
        markerInstances.current[instanceKey] = { marker, tooltip };

        if (saveToBlockchain) {
            savePin(latlng, type, label, fullLabel || label);
            setMarkers(prev => [...prev, { label, fullLabel: fullLabel || label, latlng, type, visible: true }]);
        }
    };

    const toggleVisibility = (index, markerData) => {
        const { label, type, latlng } = markerData;
        setMarkers(prev => {
            const next = [...prev];
            const isVisible = !next[index].visible;
            
            // Actualización INMUTABLE: Clonamos el objeto de marker para que React detecte el cambio
            next[index] = { ...next[index], visible: isVisible };
            
            // Actualizar el mapa usando la clave normalizada (8 decimales)
            const latKey = Number(latlng.lat).toFixed(8);
            const lngKey = Number(latlng.lng).toFixed(8);
            const instanceKey = `${type}_${label}_${latKey}_${lngKey}`;
            
            const instance = markerInstances.current[instanceKey]?.marker;
            const tooltip = markerInstances.current[instanceKey]?.tooltip;
            
            if (instance) {
                // Opacidad: 1 para visible, 0.3 para "fantasma" (oculto) como se solicitó
                instance.setOpacity(isVisible ? 1 : 0.3);
                if (tooltip) {
                    // El tooltip se oculta al 0% para no saturar si hay muchos pines fantasma
                    tooltip.setOpacity(isVisible ? 1 : 0);
                }
            } else {
                console.warn("No se encontró instancia para la clave:", instanceKey);
            }
            return next;
        });
    };

    const savePin = async (latlng, pinType, label, fullLabel) => {
        setLoading(true);
        setStatus('SINCRONIZANDO...');
        try {
            const data = JSON.stringify({ type: 'pin', latlng, pinType, label, fullLabel });
            const tx = await contract.registrarBitacoraTactica(BigInt(eventoId), data);
            await tx.wait();
            setStatus('SINCRO EXITOSA');
            setTimeout(() => setStatus('LISTO'), 2000);
        } catch (error) {
            alert(`Error: ${error.message}`);
            setStatus('ERROR');
        } finally {
            setLoading(false);
        }
    };

    const handleToolClick = (tool) => {
        if (!isActivo) return;
        if (tool === 'engine') {
            const assigned = personnel?.filter(p => p.incidente === `ID-INC${eventoId.padStart(3, '0')}`) || [];
            let count = 0;
            assigned.forEach(p => {
                const pItems = inventory?.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1 && item.descripcion.toLowerCase().includes('motobomba')) || [];
                pItems.forEach(item => {
                    const names = p.name.trim().split(' ');
                    const shortName = names.length > 1 ? `${names[0].charAt(0)}. ${names[names.length - 1]}` : names[0];
                    const cleanLabel = `MTB-${shortName}`;
                    const isPinned = markers.some(m => m.type === 'engine' && m.label === cleanLabel);
                    if (!isPinned) count++;
                });
            });
            if (count === 0) {
                alert("⚠️ Operación denegada: No hay motobombas disponibles o todas ya están desplegadas en el mapa. Asigne más recursos desde el Panel de Control.");
                return;
            }
        } else if (tool === 'crew') {
            const assigned = personnel?.filter(p => p.incidente === `ID-INC${eventoId.padStart(3, '0')}`) || [];
            let count = 0;
            assigned.forEach(p => {
                const pItems = inventory?.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1) || [];
                if (pItems.length > 0) {
                    const hasMotobomba = pItems.some(item => item.descripcion.toLowerCase().includes('motobomba'));
                    if (!hasMotobomba) {
                        const names = p.name.trim().split(' ');
                        const shortName = names.length > 1 ? `${names[0].charAt(0)}. ${names[names.length - 1]}` : names[0];
                        const cleanLabel = `BRG-${shortName}`;
                        const isPinned = markers.some(m => m.type === 'crew' && m.label === cleanLabel);
                        if (!isPinned) count++;
                    }
                }
            });
            if (count === 0) {
                alert("⚠️ Operación denegada: No hay brigadistas equipados disponibles o todos ya están en el campo. Equipe al personal desde el Panel de Control.");
                return;
            }
        }
        setActiveTool(tool);
    };

    return (
        <div className="tactical-overlay">
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="btn-secondary"
                style={{
                    position: 'absolute',
                    left: '1.5rem',
                    top: '1.5rem',
                    zIndex: 20000,
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--accent-color)',
                    color: 'var(--accent-color)',
                    background: 'var(--bg-secondary)',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    padding: 0
                }}
                title={isCollapsed ? "Expandir Panel" : "Colapsar Panel"}
            >
                {isCollapsed ? '>>' : '<<'}
            </button>

            <div className="tactical-sidebar" style={{ 
                width: isCollapsed ? '0px' : '420px', 
                padding: isCollapsed ? '0' : '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.8rem', 
                height: '100vh',
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                flexShrink: 0,
                borderRight: isCollapsed ? 'none' : '1px solid var(--glass-border)',
                position: 'relative'
            }}>
                {/* Cabecera Sidebar (Con spacer para el botón absoluto) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', borderBottom: '1px solid #333', paddingBottom: '0.8rem', flexShrink: 0, minWidth: '350px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingLeft: '3.5rem', minHeight: '40px' }}>
                        <h2 style={{ fontSize: '1rem', color: 'var(--accent-color)', margin: 0, whiteSpace: 'nowrap', fontWeight: 'bold', letterSpacing: '1px', marginRight: '1rem' }}>
                            OP: ID-INC{eventoId.padStart(3, '0')}
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: 'var(--font-mono)' }}>
                            {coordenadas}
                        </span>
                    </div>

                    {/* Nivel de Riesgo Dinámico */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>RIESGO:</span>
                            <div className={`status-pill risk-${currentRiesgo}`} style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                                {currentRiesgo === 1 && "BAJO"}
                                {currentRiesgo === 2 && "MODERADO"}
                                {currentRiesgo === 3 && "ALTO"}
                                {currentRiesgo === 4 && "MUY ALTO"}
                                {currentRiesgo === 5 && "EXTREMO"}
                            </div>
                        </div>
                        {isActivo && (
                            <button 
                                onClick={() => setShowRiskModal(true)} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem' }}
                                title="Cambiar Nivel de Riesgo"
                            >
                                ✏️
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isActivo && (
                            <button onClick={cerrarIncidente} className="btn-secondary" style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', border: '1px solid #ff4444', color: '#ff4444', flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                🔒 CERRAR INCIDENTE
                            </button>
                        )}
                        <button onClick={onBack} className="btn-secondary" style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', flex: isActivo ? 0 : 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            ← VOLVER
                        </button>
                    </div>
                </div>

                {/* ZONA ROJA: RECURSOS */}
                <div className="card-mini" style={{ border: '2px solid #ff444455', padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h3 style={{ fontSize: '0.7rem', color: '#ff4444', marginBottom: '0.8rem', flexShrink: 0 }}>🔴 RECURSOS DE CAMPO</h3>
                    <div className="tool-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', overflowY: 'auto', opacity: isActivo ? 1 : 0.4, pointerEvents: isActivo ? 'auto' : 'none' }}>
                        <button className={`tool-btn ${activeTool === 'engine' ? 'active' : ''}`} onClick={() => handleToolClick('engine')}>🚒 MOTOBOMBA</button>
                        <button className={`tool-btn ${activeTool === 'crew' ? 'active' : ''}`} onClick={() => handleToolClick('crew')}>👨‍🚒 BRIGADA</button>
                        <button className={`tool-btn ${activeTool === 'water' ? 'active' : ''}`} onClick={() => handleToolClick('water')}>💧 PUNTO AGUA</button>
                        <button className={`tool-btn ${activeTool === 'hazard' ? 'active' : ''}`} onClick={() => handleToolClick('hazard')}>⚠️ PELIGRO</button>
                        <button className="tool-btn disabled" disabled title="Próximamente">🚁 HELI (PRO)</button>
                        <button className="tool-btn disabled" disabled title="Próximamente">🛩️ CISTERNA (PRO)</button>
                    </div>
                    {!isActivo && <div style={{ fontSize: '0.6rem', color: '#ff4444', textAlign: 'center', marginTop: '0.4rem' }}>INCIDENTE CERRADO - MODO CONSULTA</div>}
                </div>

                {/* ZONA VERDE: RADAR DE COORDENADAS */}
                <div className="card-mini" style={{ border: '2px solid #44ff4455', padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h3 style={{ fontSize: '0.7rem', color: '#44ff44', marginBottom: '0.8rem', flexShrink: 0 }}>🟢 RADAR DE COORDENADAS</h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {markers.map((m, i) => {
                            let itemColor = '#44ff44'; // Default Green
                            if (m.type === 'origin') itemColor = '#cd7f32'; // Ocre
                            else if (m.type === 'engine') itemColor = '#dc2626'; // Red
                            else if (m.type === 'water') itemColor = '#3b82f6'; // Blue
                            else if (m.type === 'hazard') itemColor = '#fac800'; // Yellow
                            else if (m.type === 'crew') itemColor = '#16a34a'; // Green

                            return (
                                <div key={i} style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '4px', borderLeft: `3px solid ${itemColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: m.visible ? 1 : 0.4 }}>
                                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                                        <div style={{ fontWeight: 'bold', color: itemColor, textDecoration: m.visible ? 'none' : 'line-through' }}>
                                            {m.fullLabel || m.label}
                                        </div>
                                        <code style={{ color: '#aaa', fontSize: '0.65rem' }}>
                                            LAT: {m.latlng.lat.toFixed(6)} | LON: {m.latlng.lng.toFixed(6)}
                                        </code>
                                    </div>
                                    {m.type !== 'origin' && (
                                        <button 
                                            onClick={() => toggleVisibility(i, m)} 
                                            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '0.2rem' }}
                                            title={m.visible ? "Ocultar del mapa" : "Mostrar en mapa"}
                                        >
                                            <i className={`fa-solid fa-eye${m.visible ? '' : '-slash'}`}></i>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ZONA AZUL: BITÁCORA DE COMBATE */}
                <div className="card-mini" style={{ border: '2px solid #4444ff55', padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexShrink: 0 }}>
                        <h3 style={{ fontSize: '0.7rem', color: '#4444ff', margin: 0 }}>🔵 BITÁCORA DE COMBATE</h3>
                        <button onClick={() => setShowV360(true)} style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid var(--accent-color)', color: '#fff', fontSize: '0.65rem', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            📋 RESUMEN EVENTO
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {milestones.length === 0 ? (
                            <div style={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>Esperando reportes de campo...</div>
                        ) : (
                            milestones.map((ms, i) => {
                                const item = ms.codigoInsumo && ms.codigoInsumo !== ethers.ZeroHash ? inventory.find(i => i.hash === ms.codigoInsumo) : null;
                                return (
                                    <div key={i} style={{ fontSize: '0.65rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--accent-color)' }}>[{new Date(ms.timestamp * 1000).toLocaleTimeString()}]</span>
                                            <button onClick={() => setSelectedHito(ms)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.9rem' }}>🔍</button>
                                        </div>
                                        <div style={{ color: '#fff', paddingRight: '1rem' }}>
                                            {item && <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>[{item.serialId}] </span>}
                                            {ms.detalles.length > 50 ? ms.detalles.substring(0, 50) + '...' : ms.detalles}
                                        </div>
                                        <div style={{ color: '#666', fontSize: '0.6rem' }}>
                                            Op: {personnel.find(p => p.address.toLowerCase() === ms.operador.toLowerCase())?.name || ms.operador.substring(0, 8) + '...'}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="sync-status" style={{ background: '#000', padding: '0.5rem', borderRadius: '4px', border: '1px solid #333', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: '#666' }}>SYNC CLOUD:</span>
                        <span style={{ fontWeight: '800', fontSize: '0.7rem', color: (loading || !mapReady) ? 'var(--accent-color)' : '#00ff6a' }}>
                            {status}
                        </span>
                    </div>
                </div>
            </div>

            <div ref={mapRef} className="tactical-map-container" style={{ flex: 1 }}>
                {!mapReady && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 1000 }}>
                        <span className="spin" style={{ fontSize: '2rem' }}>⏳</span>
                    </div>
                )}
            </div>

            {/* MODAL DETALLE HITO */}
            {selectedHito && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="card" style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--accent-color)', background: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-color)' }}>Detalle de Hito</h3>
                            <button onClick={() => setSelectedHito(null)} className="btn-secondary" style={{ padding: '0.2rem 0.5rem' }}>×</button>
                        </div>
                        <div style={{ background: '#000', padding: '1.2rem', borderRadius: '8px', border: '1px solid #333', maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '1rem', color: '#fff', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{selectedHito.detalles}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,165,0,0.05)', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.1)' }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--accent-color)', display: 'block', fontWeight: 'bold' }}>OPERADOR:</label>
                                <div style={{ fontSize: '0.9rem', color: '#eee', fontWeight: 'bold' }}>
                                    {personnel.find(p => p.address.toLowerCase() === selectedHito.operador.toLowerCase())?.name || selectedHito.operador.substring(0, 10) + '...'}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--accent-color)', display: 'block', fontWeight: 'bold' }}>RECURSO:</label>
                                <div style={{ fontSize: '0.9rem', color: '#eee', fontWeight: 'bold' }}>
                                    {selectedHito.codigoInsumo && selectedHito.codigoInsumo !== ethers.ZeroHash ? 
                                        (inventory.find(i => i.hash === selectedHito.codigoInsumo)?.descripcion || 'Insumo Táctico') : 
                                        'Mando / Jefe Escena'}
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', color: 'var(--accent-color)', display: 'block', fontWeight: 'bold' }}>FECHA Y HORA:</label>
                                <div style={{ fontSize: '0.8rem', color: '#999' }}>
                                    {new Date(selectedHito.timestamp * 1000).toLocaleString()}
                                </div>
                                {selectedHito.codigoInsumo && selectedHito.codigoInsumo !== ethers.ZeroHash && (
                                    <div style={{ fontSize: '0.6rem', color: '#444', marginTop: '0.3rem', fontFamily: 'monospace' }}>
                                        Hash: {selectedHito.codigoInsumo.substring(0, 16)}...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RESUMEN DEL EVENTO (V360) */}
            {showV360 && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div className="card" style={{ maxWidth: '650px', width: '100%', border: '2px solid var(--accent-color)', background: '#111', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>📋</span>
                                <h3 style={{ margin: 0, letterSpacing: '1px' }}>
                                    RESUMEN DEL EVENTO: <span style={{ color: 'var(--accent-color)' }}>ID-INC{eventoId.padStart(3, '0')}</span>
                                </h3>
                            </div>
                            <button onClick={() => setShowV360(false)} className="btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>×</button>
                        </div>

                        {/* [Modal_Resumen_Tactico] */}
                        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,165,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.1)' }}>
                                <div>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>INCIDENTE:</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>ID-INC{eventoId.padStart(3, '0')}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>ESTADO:</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: isActivo ? '#4dff4d' : '#ff4d4d' }}>{isActivo ? 'ACTIVO' : 'FINALIZADO'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>COORDENADAS:</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ccc' }}>{coordenadas}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>INICIO:</div>
                                    <div style={{ fontSize: '0.8rem' }}>{formatTime(startTime)}</div>
                                </div>
                                {!isActivo && (
                                    <div style={{ textAlign: 'right', background: 'rgba(255,0,0,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,0,0,0.1)' }}>
                                        <div style={{ color: '#ff4d4d', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>FIN:</div>
                                        <div style={{ fontSize: '0.8rem', color: '#fff' }}>{formatTime(endTime)}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.8rem', marginBottom: '1rem', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', color: 'var(--accent-color)', letterSpacing: '1px' }}>PERSONA Y RECURSOS ASIGNADOS</h4>
                                <div style={{ display: 'grid', gap: '0.8rem' }}>
                                    {personnel
                                        .filter(p => p.incidente === `ID-INC${eventoId.padStart(3, '0')}`)
                                        .map(p => {
                                            const assignedItems = inventory.filter(item => item.custodio?.toLowerCase() === p.address?.toLowerCase() && item.estado === 1);
                                            return (
                                                <div key={p.address} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedBrigadistas[p.address] ? '0.8rem' : '0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-color)' }}>{p.isJefe ? '👨‍🚒 Jefe:' : '👤'} {p.name}</span>
                                                            <button 
                                                                onClick={() => toggleBrigadista(p.address)}
                                                                style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.2)', color: 'var(--accent-color)', cursor: 'pointer', width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}
                                                            >
                                                                {expandedBrigadistas[p.address] ? '−' : '+'}
                                                            </button>
                                                        </div>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{p.specialty}</span>
                                                    </div>
                                                    {expandedBrigadistas[p.address] && (
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
                                    {personnel.filter(p => p.incidente === `ID-INC${eventoId.padStart(3, '0')}`).length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#666', border: '1px dashed #333', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
                                            No se detecta personal asignado oficialmente a este incidente.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', marginBottom: '0.8rem', letterSpacing: '1px' }}>RECURSOS EN CAMPO ({markers.length - 1})</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                    {markers.filter(m => m.type !== 'origin').map((m, i) => (
                                        <div key={i} style={{ fontSize: '0.75rem', background: 'rgba(255,165,0,0.05)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,165,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <div style={{ fontWeight: 'bold', color: '#eee' }}>📍 {m.fullLabel || m.label} <span style={{ color: 'var(--accent-color)', fontSize: '0.6rem' }}>({m.type.toUpperCase()})</span></div>
                                            <div style={{ fontSize: '0.6rem', color: '#666', fontFamily: 'monospace' }}>{m.latlng ? `${m.latlng.lat.toFixed(4)}, ${m.latlng.lng.toFixed(4)}` : 'N/A'}</div>
                                        </div>
                                    ))}
                                    {markers.length <= 1 && <div style={{ color: '#555', fontSize: '0.75rem', fontStyle: 'italic', gridColumn: 'span 2' }}>Sin marcas tácticas en el mapa...</div>}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', marginBottom: '0.8rem', letterSpacing: '1px' }}>ÚLTIMOS HITOS REGISTRADOS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {milestones.filter(ms => {
                                        try {
                                            const parsed = JSON.parse(ms.detalles);
                                            return parsed.type !== 'pin';
                                        } catch (e) { return true; }
                                    }).slice(0, 20).map((ms, i) => {
                                        const item = ms.codigoInsumo && ms.codigoInsumo !== ethers.ZeroHash ? inventory.find(i => i.hash === ms.codigoInsumo) : null;
                                        const opName = personnel.find(p => p.address.toLowerCase() === ms.operador.toLowerCase())?.name || ms.operador.substring(0, 8) + '...';
                                        
                                        let hitoText = ms.detalles;
                                        let isPin = false;
                                        try {
                                            const parsed = JSON.parse(ms.detalles);
                                            if (parsed.type === 'pin') {
                                                const pinCoords = parsed.latlng ? `[${parsed.latlng.lat.toFixed(4)}, ${parsed.latlng.lng.toFixed(4)}]` : '';
                                                hitoText = `${parsed.fullLabel || parsed.label} (${parsed.pinType.toUpperCase()}) ${pinCoords}`;
                                                isPin = true;
                                            } else if (parsed.text) {
                                                hitoText = parsed.text;
                                            }
                                        } catch (e) { }

                                        return (
                                            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '0.5px' }}>
                                                            Op: {opName}
                                                        </span>
                                                        <span style={{ fontSize: '0.65rem', color: '#666' }}>{new Date(ms.timestamp * 1000).toLocaleString()}</span>
                                                    </div>
                                                    {isPin ? (
                                                        <span style={{ fontSize: '0.65rem', color: '#4444ff', background: 'rgba(68,68,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(68,68,255,0.2)', fontWeight: 'bold' }}>
                                                            📍 PUNTO TÁCTICO
                                                        </span>
                                                    ) : item ? (
                                                        <span style={{ fontSize: '0.65rem', color: '#ff8c00', background: 'rgba(255,140,0,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,140,0,0.2)', fontWeight: 'bold' }}>
                                                            📦 {item.serialId} - {item.descripcion}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#eee', lineHeight: '1.5', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.4rem' }}>
                                                    {hitoText.includes('[ESTADO:') && (
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
                                                    {(hitoText.includes('Daño Crítico') || hitoText.includes('Daño Critico')) && !hitoText.includes('[ESTADO:') && (
                                                        <div style={{ marginBottom: '0.4rem' }}>
                                                            <span style={{ background: '#ff4d4d', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                                ⚠️ REPORTE DE DAÑO CRÍTICO
                                                                </span>
                                                        </div>
                                                    )}
                                                    {hitoText.replace(/\[ESTADO: .*?\] /, '')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', borderTop: '1px solid #333', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => setShowV360(false)} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                                CERRAR
                            </button>
                            {onGenerateReport && (
                                <button onClick={() => onGenerateReport(fullLogs)} className="btn" style={{ width: '100%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', background: 'var(--accent-color)', color: '#000' }}>
                                    📄 GENERAR REPORTE
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Pines con Selección */}
            {pinModal.show && (
                <div className="v360-modal-overlay">
                    <div className="v360-modal-content card" style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--accent-color)' }}>DESPLIEGUE TÁCTICO</h3>
                        <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '1.5rem' }}>Seleccione qué recurso va a ubicar en el mapa.</p>
                        
                        <select 
                            value={selectedPinOption} 
                            onChange={(e) => setSelectedPinOption(e.target.value)} 
                            style={{ width: '100%', padding: '0.8rem', marginBottom: '1.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                        >
                            <option value="">-- Elija un elemento --</option>
                            {pinModal.options.map((opt, i) => (
                                <option key={i} value={opt.label}>{opt.fullName || opt.label}</option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                className="btn" 
                                disabled={!selectedPinOption}
                                onClick={() => {
                                    if (selectedPinOption) {
                                        const selected = pinModal.options.find(o => o.label === selectedPinOption);
                                        addMapMarker(pinModal.latlng, pinModal.tool, selected.label, true, selected.fullName);
                                        setPinModal({ show: false, latlng: null, tool: null, options: [] });
                                        setSelectedPinOption('');
                                        setActiveTool(null);
                                        setStatus('LISTO');
                                    }
                                }}
                            >
                                CONFIRMAR
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                    setPinModal({ show: false, latlng: null, tool: null, options: [] });
                                    setSelectedPinOption('');
                                }}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CAMBIO DE RIESGO */}
            {showRiskModal && (
                <div className="v360-modal-overlay">
                    <div className="v360-modal-content card" style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--accent-color)' }}>CAMBIO DE NIVEL DE RIESGO</h3>
                        <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '1.5rem' }}>Especifique la nueva criticidad del evento en la blockchain.</p>
                        
                        <select 
                            value={currentRiesgo} 
                            onChange={(e) => actualizarRiesgo(Number(e.target.value))} 
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
                                onClick={() => setShowRiskModal(false)}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TacticalPanel;
