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
                fadeAnimation: true
            }).setView([lat, lon], 15);

            L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Esri',
                maxZoom: 19
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.4rem', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', margin: 0 }}>OPERACIÓN ID-INC{eventoId.padStart(3, '0')}</h2>
                    <button onClick={onBack} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>← VOLVER</button>
                </div>

                {/* ZONA ROJA: RECURSOS */}
                <div className="card-mini" style={{ border: '2px solid #ff444455', padding: '0.8rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h3 style={{ fontSize: '0.7rem', color: '#ff4444', marginBottom: '0.8rem', flexShrink: 0 }}>🔴 RECURSOS DE CAMPO</h3>
                    <div className="tool-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', overflowY: 'auto' }}>
                        <button className={`tool-btn ${activeTool === 'engine' ? 'active' : ''}`} onClick={() => setActiveTool('engine')}>🚒 MOTOBOMBA</button>
                        <button className={`tool-btn ${activeTool === 'crew' ? 'active' : ''}`} onClick={() => setActiveTool('crew')}>👨‍🚒 BRIGADA</button>
                        <button className={`tool-btn ${activeTool === 'water' ? 'active' : ''}`} onClick={() => setActiveTool('water')}>💧 PUNTO AGUA</button>
                        <button className={`tool-btn ${activeTool === 'hazard' ? 'active' : ''}`} onClick={() => setActiveTool('hazard')}>⚠️ PELIGRO</button>
                        <button className="tool-btn disabled" disabled title="Próximamente">🚁 HELI (PRO)</button>
                        <button className="tool-btn disabled" disabled title="Próximamente">🛩️ CISTERNA (PRO)</button>
                    </div>
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
                    <h3 style={{ fontSize: '0.7rem', color: '#4444ff', marginBottom: '0.8rem', flexShrink: 0 }}>🔵 BITÁCORA DE COMBATE (HITOS)</h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {milestones.length === 0 ? (
                            <div style={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>Esperando reportes de campo...</div>
                        ) : (
                            milestones.map((ms, i) => (
                                <div key={i} style={{ fontSize: '0.65rem', borderBottom: '1px solid #222', paddingBottom: '0.3rem' }}>
                                    <span style={{ color: 'var(--accent-color)' }}>[{new Date(ms.timestamp * 1000).toLocaleTimeString()}]</span>
                                    <div style={{ color: '#fff' }}>{ms.detalles}</div>
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
        </div>
    );
};

export default TacticalPanel;
