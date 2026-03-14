import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet en entornos bundling (Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const TacticalPanel = ({ eventoId, coordenadas, contract, onBack }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [status, setStatus] = useState('LISTO');
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState(null);
    const toolRef = useRef(null);
    const [markers, setMarkers] = useState([]); // Lista para el radar de coordenadas
    const [milestones, setMilestones] = useState([]); // Lista para bitácora azul
    const [mapReady, setMapReady] = useState(false);
    const [isActivo, setIsActivo] = useState(true);
    const [showV360, setShowV360] = useState(false);
    const [selectedHito, setSelectedHito] = useState(null);

    // Sincronizar ref con estado para el listener de Leaflet
    useEffect(() => {
        toolRef.current = activeTool;
    }, [activeTool]);

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
            setMarkers([{ label: 'ORIGEN (Punto Cero)', latlng: { lat, lng: lon }, type: 'origin' }]);

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
                    const toolNames = {
                        'engine': 'MOTOBOMBA',
                        'crew': 'BRIGADA',
                        'water': 'PUNTO AGUA',
                        'hazard': 'PELIGRO'
                    };
                    const friendlyName = toolNames[toolRef.current] || toolRef.current;
                    const label = prompt(`Indique etiqueta para ${friendlyName}:`, friendlyName);
                    if (label) {
                        addMapMarker(e.latlng, toolRef.current, label, true);
                        setActiveTool(null);
                        setStatus('LISTO');
                    }
                }
            });

            loadTacticalLogs();
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

    const checkIncidentStatus = async () => {
        if (!contract) return;
        try {
            const fire = await contract.incendios(BigInt(eventoId));
            setIsActivo(fire.activo);
        } catch (error) {
            console.error("Error verificando estado:", error);
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

    const loadTacticalLogs = async () => {
        if (!contract) return;
        try {
            const logs = await contract.obtenerLogEvento(BigInt(eventoId));
            const newMarkers = [];
            const newMilestones = [];

            logs.forEach(log => {
                // Hitos Tácticos (Pines)
                if (log.codigoInsumo === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    try {
                        const data = JSON.parse(log.detalles);
                        if (data.type === 'pin') {
                            addMapMarker(data.latlng, data.pinType, data.label, false);
                            newMarkers.push({ label: data.label, latlng: data.latlng, type: data.pinType });
                        } else {
                            // Otros hitos de bitácora
                            newMilestones.push({
                                timestamp: Number(log.timestamp),
                                detalles: log.detalles,
                                operador: log.operador
                            });
                        }
                    } catch (e) {
                        // Si no es JSON, es un hito de texto plano
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
                        detalles: `Insumo ${log.codigoInsumo.substring(0, 6)}...: ${log.detalles}`,
                        operador: log.operador
                    });
                }
            });

            setMarkers(prev => [...prev.filter(m => m.type === 'origin'), ...newMarkers]);
            setMilestones(newMilestones.reverse());
        } catch (error) {
            console.error("Error cargando bitácora:", error);
        }
    };

    const addMapMarker = (latlng, type, label, saveToBlockchain) => {
        if (!mapInstance.current) return;

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

        const marker = L.marker(latlng, { icon }).addTo(mapInstance.current);
        marker.bindTooltip(label, { permanent: true, direction: 'bottom', className: 'custom-tooltip' });

        if (saveToBlockchain) {
            savePin(latlng, type, label);
            setMarkers(prev => [...prev, { label, latlng, type }]);
        }
    };

    const savePin = async (latlng, pinType, label) => {
        setLoading(true);
        setStatus('SINCRONIZANDO...');
        try {
            const data = JSON.stringify({ type: 'pin', latlng, pinType, label });
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

    return (
        <div className="tactical-overlay">
            <div className="tactical-sidebar" style={{ width: '400px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '100vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.4rem', flexShrink: 0, gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', margin: 0, whiteSpace: 'nowrap' }}>OP: ID-INC{eventoId.padStart(3, '0')}</h2>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {isActivo && (
                            <button onClick={cerrarIncidente} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', border: '1px solid #ff4444', color: '#ff4444' }}>🔒 CERRAR</button>
                        )}
                        <button onClick={onBack} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>← VOLVER</button>
                    </div>
                </div>

                {/* ZONA ROJA: RECURSOS */}
                <div className="card-mini" style={{ border: '2px solid #ff444455', padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h3 style={{ fontSize: '0.7rem', color: '#ff4444', marginBottom: '0.8rem', flexShrink: 0 }}>🔴 RECURSOS DE CAMPO</h3>
                    <div className="tool-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', overflowY: 'auto', opacity: isActivo ? 1 : 0.4, pointerEvents: isActivo ? 'auto' : 'none' }}>
                        <button className={`tool-btn ${activeTool === 'engine' ? 'active' : ''}`} onClick={() => setActiveTool('engine')}>🚒 MOTOBOMBA</button>
                        <button className={`tool-btn ${activeTool === 'crew' ? 'active' : ''}`} onClick={() => setActiveTool('crew')}>👨‍🚒 BRIGADA</button>
                        <button className={`tool-btn ${activeTool === 'water' ? 'active' : ''}`} onClick={() => setActiveTool('water')}>💧 PUNTO AGUA</button>
                        <button className={`tool-btn ${activeTool === 'hazard' ? 'active' : ''}`} onClick={() => setActiveTool('hazard')}>⚠️ PELIGRO</button>
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
                                <div key={i} style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '4px', borderLeft: `3px solid ${itemColor}` }}>
                                    <div style={{ fontWeight: 'bold', color: itemColor }}>{m.label}</div>
                                    <code style={{ color: '#aaa', fontSize: '0.65rem' }}>
                                        LAT: {m.latlng.lat.toFixed(6)} | LON: {m.latlng.lng.toFixed(6)}
                                    </code>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ZONA AZUL: BITÁCORA DE COMBATE */}
                <div className="card-mini" style={{ border: '2px solid #4444ff55', padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexShrink: 0 }}>
                        <h3 style={{ fontSize: '0.7rem', color: '#4444ff', margin: 0 }}>🔵 BITÁCORA DE COMBATE</h3>
                        <button onClick={() => setShowV360(true)} style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid var(--accent-color)', color: '#fff', fontSize: '0.65rem', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '0.5rem' }}>
                            📋 RESUMEN DEL EVENTO
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {milestones.length === 0 ? (
                            <div style={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>Esperando reportes de campo...</div>
                        ) : (
                            milestones.map((ms, i) => (
                                <div key={i} style={{ fontSize: '0.65rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--accent-color)' }}>[{new Date(ms.timestamp * 1000).toLocaleTimeString()}]</span>
                                        <button onClick={() => setSelectedHito(ms)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem' }}>🔍</button>
                                    </div>
                                    <div style={{ color: '#fff', paddingRight: '1rem' }}>{ms.detalles.length > 50 ? ms.detalles.substring(0, 50) + '...' : ms.detalles}</div>
                                    <div style={{ color: '#666', fontSize: '0.6rem' }}>Op: {ms.operador.substring(0, 8)}...</div>
                                </div>
                            ))
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
                        <div style={{ background: '#000', padding: '1rem', borderRadius: '4px', border: '1px solid #333', maxHeight: '300px', overflowY: 'auto' }}>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', margin: 0 }}>{selectedHito.detalles}</pre>
                        </div>
                        <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#666' }}>
                            Operador: {selectedHito.operador}<br />
                            Fecha: {new Date(selectedHito.timestamp * 1000).toLocaleString()}
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
                                <h3 style={{ margin: 0, letterSpacing: '1px' }}>RESUMEN DEL EVENTO</h3>
                            </div>
                            <button onClick={() => setShowV360(false)} className="btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>×</button>
                        </div>

                        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,165,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,165,0,0.1)' }}>
                                <div>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>INCIDENTE:</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>ID-INC{eventoId.padStart(3, '0')}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>ESTADO:</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: isActivo ? '#4dff4d' : '#ff4d4d' }}>{isActivo ? 'INCIDENTE EN CURSO' : 'INCIDENTE FINALIZADO'}</div>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <div style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}>COORDENADAS BASE:</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ccc' }}>{coordenadas}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', marginBottom: '0.8rem', letterSpacing: '1px' }}>RECURSOS EN CAMPO ({markers.length - 1})</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                    {markers.filter(m => m.type !== 'origin').map((m, i) => (
                                        <div key={i} style={{ fontSize: '0.75rem', background: 'rgba(255,165,0,0.05)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,165,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <div style={{ fontWeight: 'bold', color: '#eee' }}>📍 {m.label} <span style={{ color: 'var(--accent-color)', fontSize: '0.6rem' }}>({m.type.toUpperCase()})</span></div>
                                            <div style={{ fontSize: '0.6rem', color: '#666', fontFamily: 'monospace' }}>{m.latlng ? `${m.latlng.lat.toFixed(4)}, ${m.latlng.lng.toFixed(4)}` : 'N/A'}</div>
                                        </div>
                                    ))}
                                    {markers.length <= 1 && <div style={{ color: '#555', fontSize: '0.75rem', fontStyle: 'italic', gridColumn: 'span 2' }}>Sin marcas tácticas en el mapa...</div>}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', borderLeft: '3px solid var(--accent-color)', paddingLeft: '0.5rem', marginBottom: '0.8rem', letterSpacing: '1px' }}>ÚLTIMOS HITOS REGISTRADOS</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {milestones.slice(0, 10).map((ms, i) => {
                                        let hitoText = ms.detalles;
                                        try {
                                            const parsed = JSON.parse(ms.detalles);
                                            if (parsed.type === 'pin') {
                                                const pinCoords = parsed.latlng ? `[${parsed.latlng.lat.toFixed(4)}, ${parsed.latlng.lng.toFixed(4)}]` : '';
                                                hitoText = `📍 ${parsed.label} (${parsed.pinType.toUpperCase()}) ${pinCoords}`;
                                            } else if (parsed.text) {
                                                hitoText = parsed.text;
                                            }
                                        } catch (e) { }

                                        return (
                                            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--accent-color)', marginBottom: '0.2rem' }}>
                                                    <span>{new Date(ms.timestamp * 1000).toLocaleTimeString()}</span>
                                                    <span style={{ color: '#666' }}>Op: {ms.operador.substring(0, 6)}...</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#fff', lineHeight: '1.4' }}>{hitoText}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', borderTop: '1px solid #333', textAlign: 'center' }}>
                            <button onClick={() => setShowV360(false)} className="btn btn-secondary" style={{ width: '50%', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TacticalPanel;
