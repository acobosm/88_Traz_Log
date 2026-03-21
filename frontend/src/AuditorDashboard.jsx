import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AuditorDashboard = ({ contract, inventory, personnel, incidents, hardRefresh, fetchAssetHistory, generarReportePDF }) => {
    const [auditFilter, setAuditFilter] = useState('all');
    const [discrepancies, setDiscrepancies] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadDiscrepancies = async () => {
            if (!contract) return;
            // En una versión real, esto consultaría eventos DiscrepanciaRegistrada
            // Por ahora, simulamos buscando en los estados de los equipos y logs si fuera posible
            setLoading(true);
            try {
                // Consultamos el inventario para ver qué tiene auditoría pendiente o estado 'Perdido'
                const itemsWithIssues = inventory.filter(item => 
                    item.estado === 3 || item.auditoriaPendiente !== null
                );
                setDiscrepancies(itemsWithIssues);
            } catch (err) {
                console.error(err);
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

            <div className="card" style={{ borderColor: '#3296ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ color: '#3296ff' }}>🕵️ CENTRO DE SUPERVISIÓN TÁCTICA</h2>
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
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff4d4d' }}>{discrepancies.length}</div>
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
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3296ff' }}>{inventory.filter(i => i.estado === 2).length}</div>
                    </div>
                </div>
            </div>

            {/* LISTADO DE INCIDENTES PARA REPORTE MAESTRO */}
            <div className="card">
                <h3 style={{ borderLeft: '4px solid #3296ff', paddingLeft: '1rem', marginBottom: '1.5rem' }}>📑 HISTORIAL DE INCIDENTES (REPORTES MAESTROS)</h3>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {incidents.map(fire => {
                        const isClosed = !fire.activo;
                        return (
                            <div key={fire.id} className="card-mini" style={{ padding: '1.2rem', border: isClosed ? '1px solid rgba(50, 150, 255, 0.3)' : '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: '#3296ff', fontSize: '1.1rem' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                                        <span style={{ margin: '0 0.8rem', opacity: 0.2 }}>|</span>
                                        <span style={{ fontSize: '0.9rem' }}>{fire.coords}</span>
                                        {!fire.activo && <span className="status-pill risk-1" style={{ marginLeft: '1rem', fontSize: '0.6rem' }}>FINALIZADO / ARCHIVADO</span>}
                                    </div>
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
                                                    const insumoHash = evt.args[0];
                                                    if (allIncidentHashes.includes(insumoHash)) {
                                                        const block = await evt.getBlock();
                                                        const disc = discEvents.find(d => d.args[1] === insumoHash && Math.abs(d.blockNumber - evt.blockNumber) < 10);
                                                        allLogs.push({
                                                            timestamp: block.timestamp,
                                                            operador: "MANDO BASE OPERATIVA",
                                                            detalles: `Firma Recepción Base: Recurso retornado con estado [${estadoLabels[Number(evt.args[1])] || 'Desconocido'}]. ${disc ? `Discrepancia: ${disc.args[2]}` : 'Recibido conforme.'}`,
                                                            codigoInsumo: insumoHash
                                                        });
                                                    }
                                                }

                                                for (const evt of consEvents) {
                                                    const insumoHash = evt.args[1];
                                                    if (allIncidentHashes.includes(insumoHash)) {
                                                        const block = await evt.getBlock();
                                                        allLogs.push({
                                                            timestamp: block.timestamp,
                                                            operador: "SISTEMA DE AUDITORÍA",
                                                            detalles: `⚠️ ALERTA DE CONSUMO: Real ${evt.args[3]} vs Máx Esperado ${evt.args[2]}`,
                                                            codigoInsumo: insumoHash
                                                        });
                                                    }
                                                }
                                            } catch (e) { console.error(e); }

                                            const fullySorted = allLogs.sort((a, b) => b.timestamp - a.timestamp);
                                            generarReportePDF(fire, fullySorted, historicAssignments);
                                        }}
                                    >
                                        📥 DESCARGAR PDF
                                    </button>
                                </div>

                                {isClosed && (
                                    <div style={{ background: 'rgba(50, 150, 255, 0.03)', padding: '1rem', borderRadius: '8px', border: '1px dotted rgba(50, 150, 255, 0.2)' }}>
                                        <h4 style={{ fontSize: '0.75rem', color: '#3296ff', marginBottom: '0.8rem', letterSpacing: '1px' }}>✍️ CONCLUSIÓN PERICIAL (BLOCKCHAIN)</h4>
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
                <h3 style={{ borderLeft: '4px solid #ffcc00', paddingLeft: '1rem', marginBottom: '1.5rem' }}>🔍 INVESTIGACIÓN DE RECURSOS Y DISCREPANCIAS</h3>
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
                            {inventory.map(item => (
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
        </div>
    );
};

export default AuditorDashboard;
