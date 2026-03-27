import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AuditorDashboard = ({ contract, inventory, personnel, incidents, hardRefresh, fetchAssetHistory, generarReportePDF, onViewV360 }) => {
    const [auditFilter, setAuditFilter] = useState('all');
    const [discrepancies, setDiscrepancies] = useState([]);
    const [peritajesConcluidos, setPeritajesConcluidos] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showFindingModal, setShowFindingModal] = useState(false);
    const [currentFindingFire, setCurrentFindingFire] = useState(null);

    useEffect(() => {
        const checkPeritajes = async () => {
            if (!contract || !incidents) return;
            const newPeritajes = {};
            try {
                // Solo escaneamos incidentes cerrados para optimizar
                const closedIncidents = incidents.filter(i => !i.activo);
                await Promise.all(closedIncidents.map(async (fire) => {
                    const logs = await contract.obtenerLogEvento(BigInt(fire.id));
                    const peritaje = logs.find(l => l.detalles.startsWith("PERITAJE FINAL AUDITORIA:"));
                    if (peritaje) {
                        newPeritajes[fire.id] = true;
                    }
                }));
                setPeritajesConcluidos(newPeritajes);
            } catch (err) {
                console.error("Error detectando peritajes:", err);
            }
        };
        checkPeritajes();
    }, [incidents, contract]);

    useEffect(() => {
        const loadDiscrepancies = async () => {
            if (!contract) return;
            // En una versión real, esto consultaría eventos DiscrepanciaRegistrada
            // Por ahora, simulamos buscando en los estados de los equipos y logs si fuera posible
            setLoading(true);
            try {
                // 1. Obtener hallazgos desde Blockchain (Génesis -> Actual)
                const discFilter = contract.filters.DiscrepanciaRegistrada();
                const consFilter = contract.filters.AlertaConsumo();
                
                const [discEvents, consEvents] = await Promise.all([
                    contract.queryFilter(discFilter, 0),
                    contract.queryFilter(consFilter, 0)
                ]);

                const manualDiscs = discEvents.map(evt => {
                    const item = inventory.find(i => i.hash === evt.args[1]);
                    return {
                        incidenteId: evt.args[0].toString(),
                        serialId: item ? item.serialId : ('ITEM-' + evt.args[1].substring(2, 6)),
                        motivo: evt.args[2]
                    };
                });

                const autoAlerts = consEvents.map(evt => {
                    const item = inventory.find(i => i.hash === evt.args[1]);
                    return {
                        incidenteId: evt.args[0].toString(),
                        serialId: item ? item.serialId : ('ITEM-' + evt.args[1].substring(2, 6)),
                        motivo: `🏁 ALERTA DE CONSUMO: Real ${evt.args[3]}L vs Máx ${evt.args[2]}L`
                    };
                });

                // 2. Unificar y filtrar duplicados por motivo + incidente
                const allFindings = [...manualDiscs, ...autoAlerts];
                
                // Registro de hallazgos concluido

                setDiscrepancies(allFindings);
            } catch (err) {
                console.error("Error crítico de sincronización:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDiscrepancies();
    }, [inventory, contract]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* CABECERA AUDITORÍA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                <div className="badge-role">
                    🔍 MÓDULO DE AUDITORÍA
                </div>
            </div>

            <div className="card" style={{ borderColor: '#333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ color: 'var(--text-primary)' }}>🕵️ CENTRO DE SUPERVISIÓN TÁCTICA</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Monitoreo inmutable de la cadena de custodia y análisis de discrepancias operativas.
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={hardRefresh}>🔄 SINCRONIZAR RED</button>
                </div>
            </div>

            {/* ESTADÍSTICAS RÁPIDAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="status-badge" style={{ background: 'rgba(255, 77, 77, 0.05)', border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                    <div style={{ fontSize: '1.5rem' }}>🚨</div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>DISCREPANCIAS ACTIVAS</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff4d4d' }}>
                            {discrepancies.length}
                        </div>
                    </div>
                </div>
                <div className="status-badge" style={{ background: 'rgba(77, 255, 77, 0.05)', border: '1px solid rgba(77, 255, 77, 0.2)' }}>
                    <div style={{ fontSize: '1.5rem' }}>🔥</div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>INCIDENTES EN CURSO</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4dff4d' }}>{incidents.filter(i => i.activo).length}</div>
                    </div>
                </div>
                <div className="status-badge" style={{ background: 'rgba(50, 150, 255, 0.05)', border: '1px solid rgba(50, 150, 255, 0.2)' }}>
                    <div style={{ fontSize: '1.5rem' }}>📦</div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>RECURSOS EN TALLER</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#aaa' }}>{inventory.filter(i => i.estado === 2).length}</div>
                    </div>
                </div>
            </div>

            {/* LISTADO DE INCIDENTES PARA REPORTE MAESTRO */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ borderLeft: '4px solid #888', paddingLeft: '1rem', margin: 0 }}>📑 HISTORIAL DE INCIDENTES</h3>
                    
                    {/* SELECTOR DE FILTRADO TÁCTICO (UNIFICADO) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>FILTRAR POR:</span>
                        <select 
                            className="skin-select" 
                            style={{ fontSize: '0.7rem', padding: '0.4rem 2rem 0.4rem 1rem', minWidth: '180px' }}
                            value={auditFilter}
                            onChange={(e) => setAuditFilter(e.target.value)}
                        >
                            <option value="all">🌐 TODOS LOS INCIDENTES</option>
                            <option value="active">🔥 SOLO ACTIVOS</option>
                            <option value="discrepancy">🚨 CON DISCREPANCIAS</option>
                            <option value="unsigned">✍️ SIN PERITAJE (PENDIENTES)</option>
                            <option value="signed">✅ PERITAJE CONCLUIDO</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {incidents
                        .filter(fire => {
                            if (auditFilter === 'all') return true;
                            if (auditFilter === 'active') return fire.activo;
                            
                            const fireDiscrepancies = discrepancies.filter(d => d.incidenteId === fire.id);
                            const hasIssues = fireDiscrepancies.length > 0;
                            const isSigned = peritajesConcluidos[fire.id];

                            if (auditFilter === 'discrepancy') return hasIssues;
                            if (auditFilter === 'unsigned') return !fire.activo && !isSigned;
                            if (auditFilter === 'signed') return isSigned;
                            return true;
                        })
                        .map(fire => {
                            const isClosed = !fire.activo;
                            const fireDiscrepancies = discrepancies.filter(d => d.incidenteId === fire.id);
                            const hasIssues = fireDiscrepancies.length > 0;

                            return (
                            <div key={fire.id} className="card-mini" style={{ padding: '1.2rem', border: hasIssues ? '1px solid #ff4d4d' : (isClosed ? '1px solid rgba(50, 150, 255, 0.3)' : '1px solid #333') }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                                        <span style={{ margin: '0 0.8rem', opacity: 0.2 }}>|</span>
                                        <span style={{ fontSize: '0.9rem' }}>{fire.coords}</span>
                                        {!fire.activo && (
                                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span className="status-pill risk-1" style={{ fontSize: '0.6rem' }}>FINALIZADO / ARCHIVADO</span>
                                                <span style={{ fontSize: '0.75rem', color: '#888' }}>• Cierre Detectado: {fire.timestampFin ? new Date(fire.timestampFin * 1000).toLocaleString() : 'N/A'}</span>
                                            </div>
                                        )}
                                        {peritajesConcluidos[fire.id] && (
                                            <span style={{ marginLeft: '0.8rem', color: '#4dff4d', fontWeight: 'bold', fontSize: '0.9rem' }}>✓ PERITAJE CONCLUIDO</span>
                                        )}
                                        {hasIssues && (
                                            <>
                                                <span style={{ margin: '0 0.8rem', opacity: 0.2 }}>|</span>
                                                <span style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '0.9rem' }}>🚨 {fireDiscrepancies.length} DISCREPANCIA(S) DETECTADA(S)</span>
                                                <button 
                                                    className="btn" 
                                                    style={{ marginLeft: '1rem', fontSize: '0.65rem', padding: '0.3rem 0.6rem', background: 'rgba(255, 77, 77, 0.2)', color: '#ff4d4d', border: '1px solid #ff4d4d' }}
                                                    onClick={() => {
                                                        setCurrentFindingFire(fire);
                                                        setShowFindingModal(true);
                                                    }}
                                                >
                                                    🔍 VER HALLAZGOS
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', border: '1px solid var(--accent-color)' }}
                                            onClick={() => onViewV360(fire)}
                                        >
                                            RESUMEN EVENTO
                                        </button>
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                                            onClick={async () => {
                                            const eventId = BigInt(fire.id);
                                            const rawLogs = await contract.obtenerLogEvento(eventId);
                                            const formatted = rawLogs.map(l => ({
                                                timestamp: Number(l.timestamp),
                                                operador: l.operador,
                                                codigoInsumo: l.codigoInsumo,
                                                detalles: l.detalles
                                            }));

                                            const historicAssignments = {};
                                            try {
                                                const assignmentFilter = contract.filters.InsumoAsignado(eventId);
                                                const assignmentEvents = await contract.queryFilter(assignmentFilter, 0);
                                                assignmentEvents.forEach(evt => {
                                                    const insumoHash = evt.args[1];
                                                    const brigadistaAddr = evt.args[2].toLowerCase();
                                                    if (!historicAssignments[brigadistaAddr]) historicAssignments[brigadistaAddr] = [];
                                                    const item = inventory.find(inv => inv.hash === insumoHash);
                                                    if (item && !historicAssignments[brigadistaAddr].some(i => i.hash === insumoHash)) {
                                                        historicAssignments[brigadistaAddr].push(item);
                                                    }
                                                });
                                            } catch (e) { console.error(e); }

                                            const allLogs = [...formatted];
                                            try {
                                                const allIncidentHashes = Object.values(historicAssignments).flat().map(i => i.hash);
                                                const discFilter = contract.filters.DiscrepanciaRegistrada();
                                                const discEvents = await contract.queryFilter(discFilter, 0);
                                                const retFilter = contract.filters.InsumoRetornado();
                                                const retEvents = await contract.queryFilter(retFilter, 0);
                                                const consFilter = contract.filters.AlertaConsumo();
                                                const consEvents = await contract.queryFilter(consFilter, 0);

                                                const estadoLabels = ["Disponible", "En Uso", "Taller", "Perdido", "En Retorno"];

                                                for (const evt of retEvents) {
                                                    const insumoHash = evt.args[1];
                                                    const currentEventIdNum = Number(eventId);
                                                    
                                                    if (allIncidentHashes.includes(insumoHash)) {
                                                        const block = await evt.getBlock();
                                                        // Búsqueda robusta por EventoID e InsumoHash
                                                        const disc = discEvents.find(d => Number(d.args[0]) === currentEventIdNum && d.args[1] === insumoHash);
                                                        const alert = consEvents.find(c => Number(c.args[0]) === currentEventIdNum && c.args[1] === insumoHash);
                                                        
                                                        let detalles = `Firma Recepción Base: Recurso retornado con estado [${estadoLabels[Number(evt.args[2])] || 'Desconocido'}].`;
                                                        if (disc) detalles += ` Motivo: ${disc.args[2]}`;
                                                        if (alert) detalles += ` [AUDITORÍA AUTOMÁTICA] ALERTA DE CONSUMO: Real ${alert.args[3]}L vs Máx ${alert.args[2]}L`;
                                                        if (!disc && !alert) detalles += ` Recibido conforme.`;

                                                        allLogs.push({
                                                            timestamp: block.timestamp,
                                                            operador: "MANDO BASE OPERATIVA",
                                                            detalles: detalles,
                                                            codigoInsumo: insumoHash
                                                        });
                                                    }
                                                }

                                                for (const evt of consEvents) {
                                                    const insumoHash = evt.args[1];
                                                    if (allIncidentHashes.includes(insumoHash) && Number(evt.args[0]) === Number(fire.id)) {
                                                        const block = await evt.getBlock();
                                                        allLogs.push({
                                                            timestamp: block.timestamp,
                                                            operador: "AUDITORÍA AUTOMÁTICA",
                                                            detalles: `ALERTA DE CONSUMO: Real ${evt.args[3]}L vs Máx ${evt.args[2]}L`,
                                                            codigoInsumo: insumoHash,
                                                            isAlert: true
                                                        });
                                                    }
                                                }

                                                // Registro de logs concluido
                                            } catch (e) { console.error(e); }

                                            const fullySorted = allLogs.sort((a, b) => b.timestamp - a.timestamp);
                                            generarReportePDF(fire, fullySorted, historicAssignments);
                                        }}
                                    >
                                        📥 DESCARGAR PDF
                                    </button>
                                </div>
                            </div>

                            {isClosed && (
                                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px dotted rgba(255, 255, 255, 0.2)' }}>
                                        <h4 style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.8rem', letterSpacing: '1px' }}>✍️ CONCLUSIÓN PERICIAL (BLOCKCHAIN)</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input 
                                                type="text" 
                                                id={`report-${fire.id}`}
                                                className="skin-select" 
                                                placeholder="Escriba las conclusiones inmutables del incidente..."
                                                style={{ flex: 1, backgroundImage: 'none', background: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}
                                            />
                                            <button 
                                                className="btn" 
                                                style={{ fontSize: '0.75rem', minWidth: '120px' }}
                                                onClick={async () => {
                                                    const input = document.getElementById(`report-${fire.id}`);
                                                    const report = input.value;
                                                    if (!report) return alert("Ingrese el contenido del reporte");
                                                    try {
                                                        setLoading(true);
                                                        const tx = await contract.registrarReporteAuditoria(BigInt(fire.id), report);
                                                        await tx.wait();
                                                        alert("¡Peritaje registrado exitosamente en la Blockchain!");
                                                        input.value = "";
                                                        hardRefresh();
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error al registrar reporte: " + (err.reason || err.message));
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                disabled={loading}
                                            >
                                                {loading ? '...' : 'FIRMADO'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* TABLERO DE INVESTIGACIÓN DE EQUIPOS */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ borderLeft: '4px solid #ffcc00', paddingLeft: '1rem', margin: 0 }}>🔍 INVESTIGACIÓN DE RECURSOS</h3>
                    
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        {/* BUSCADOR POR PALABRAS CLAVE */}
                        <input 
                            type="text" 
                            className="skin-select" 
                            placeholder="Buscar por Serial o Recurso..." 
                            style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', minWidth: '220px', backgroundImage: 'none', background: 'rgba(0,0,0,0.3)' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        {/* FILTRO DE ESTADO OPERATIVO */}
                        <select 
                            className="skin-select" 
                            style={{ fontSize: '0.75rem', padding: '0.4rem 2rem 0.4rem 1rem', minWidth: '160px' }}
                            value={resourceFilter}
                            onChange={(e) => setResourceFilter(e.target.value)}
                        >
                            <option value="all">🌐 TODOS LOS ESTADOS</option>
                            <option value="0">🟢 DISPONIBLE</option>
                            <option value="1">🔥 EN INCIDENTE</option>
                            <option value="2">🛠️ EN TALLER</option>
                            <option value="3">🚨 PERDIDO</option>
                            <option value="4">🔄 EN RETORNO</option>
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '0.8rem' }}>SERIAL</th>
                                <th style={{ padding: '0.8rem' }}>RECURSO</th>
                                <th style={{ padding: '0.8rem' }}>ESTADO</th>
                                <th style={{ padding: '0.8rem' }}>ADVERTENCIAS</th>
                                <th style={{ padding: '0.8rem', textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory
                                .filter(item => {
                                    // Filtro de Texto (Serial o Descripción)
                                    const matchesText = 
                                        item.serialId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
                                    
                                    // Filtro de Estado
                                    const matchesStatus = resourceFilter === 'all' || item.estado.toString() === resourceFilter;

                                    return matchesText && matchesStatus;
                                })
                                .map(item => (
                                <tr key={item.hash} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{item.serialId}</td>
                                    <td style={{ padding: '0.8rem' }}>{item.descripcion}</td>
                                    <td style={{ padding: '0.8rem' }}>
                                        <span className={`status-pill ${
                                            item.estado === 0 ? 'risk-1' : 
                                            item.estado === 1 ? 'risk-4' : 
                                            item.estado === 2 ? 'risk-workshop' : 
                                            item.estado === 4 ? 'risk-3' : 'risk-5'
                                        }`} style={{ fontSize: '0.6rem' }}>
                                            {item.estadoLabel}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.8rem' }}>
                                        {item.auditoriaPendiente && (
                                            <span style={{ color: '#ffcc00', fontSize: '0.7rem' }}>⚠️ Auditoría pendiente (Cruce de Firmas)</span>
                                        )}
                                        {item.estado === 3 && (
                                            <span style={{ color: '#ff4d4d', fontSize: '0.7rem' }}>🚨 RECURSO EXTRAVIADO</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ fontSize: '0.65rem' }}
                                            onClick={() => fetchAssetHistory(item)}
                                        >
                                            🕵️ VER TRAZA
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE INSPECCIÓN DE HALLAZGOS FORENSES */}
            {showFindingModal && currentFindingFire && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ maxWidth: '700px', width: '90%', border: '2px solid #ff4d4d' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #555', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#ff4d4d' }}>🚨 DESGLOSE DE HALLAZGOS: ID-INC{currentFindingFire.id.padStart(3, '0')}</h3>
                            <button className="btn btn-secondary" onClick={() => setShowFindingModal(false)}>×</button>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {discrepancies
                                .filter(d => d.incidenteId === currentFindingFire.id)
                                .map((disc, idx) => (
                                    <div key={idx} style={{ background: 'rgba(255, 77, 77, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ff4d4d' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#888' }}>RECURSO:</span>
                                            <span style={{ fontSize: '0.8rem', color: '#ff4d4d', fontWeight: 'bold' }}>{disc.serialId}</span>
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#eee' }}>
                                            {(disc.motivo || '').includes('ALERTA DE CONSUMO') ? (
                                                <span style={{ color: '#ff6b6b' }}>🏁 {disc.motivo}</span>
                                            ) : (
                                                <span>📋 {disc.motivo}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                            <button className="btn" style={{ background: 'rgba(255, 77, 77, 0.25)', color: '#fff', border: '1px solid #ff4d4d', fontWeight: 'bold', boxShadow: '0 0 15px rgba(255, 77, 77, 0.4)', textTransform: 'uppercase', letterSpacing: '1px' }} onClick={() => setShowFindingModal(false)}>FINALIZAR INSPECCIÓN</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditorDashboard;
