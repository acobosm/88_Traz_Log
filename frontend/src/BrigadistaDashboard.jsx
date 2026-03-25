import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const BrigadistaDashboard = ({ personnel, inventory, incidents = [], contract, account, onConnect, onBack, onRefresh }) => {
  const [activeBrigadista, setActiveBrigadista] = useState(null);
  const [assignedIncident, setAssignedIncident] = useState(null);
  const [myResources, setMyResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ resourceHash: '', status: '0', note: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [myHistory, setMyHistory] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [showResources, setShowResources] = useState(false); // Colapsado por defecto para ahorrar espacio

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setSyncing(true);
    await onRefresh();
    setTimeout(() => setSyncing(false), 800);
  };

  // Sincronización PROFUNDA con la wallet (Sin Dropdowns)
  useEffect(() => {
    if (account && personnel.length > 0) {
      const isPerson = personnel.find(p => p.address.toLowerCase() === account.toLowerCase());
      if (isPerson) {
        setActiveBrigadista(isPerson);
        // Buscar incidente asignado
        if (isPerson.incidente !== '---' && isPerson.incidente !== '') {
          const idStr = isPerson.incidente.replace('ID-INC', '');
          const id = parseInt(idStr);
          
          // Buscar estado real del incidente en la lista global
          const incidentDetail = incidents.find(inc => parseInt(inc.id) === id);
          
          setAssignedIncident({ 
            id, 
            label: isPerson.incidente,
            activo: incidentDetail ? incidentDetail.activo : true // Por defecto true si no se encuentra
          });
        } else {
          setAssignedIncident(null);
        }
      }
    } else {
      setActiveBrigadista(null);
      setAssignedIncident(null);
    }
  }, [account, personnel, incidents]);
  // Sincronizar mis recursos basándose en la identidad real (Wallet)
  useEffect(() => {
    if (activeBrigadista) {
      const mine = inventory.filter(i => i.custodio?.toLowerCase() === activeBrigadista.address.toLowerCase());
      setMyResources(mine);
    } else {
      setMyResources([]);
    }
  }, [activeBrigadista, inventory]);

  // Fetch recent activity for the current account using the incident log
  useEffect(() => {
    const fetchActivity = async () => {
      if (!contract || !account || !assignedIncident) return;
      try {
        // Consultamos directamente el log del incidente en el estado del contrato
        const incidentLog = await contract.obtenerLogEvento(BigInt(assignedIncident.id));
        
        // Filtramos por el operador actual
        const myLogs = incidentLog.filter(log => 
          log.operador.toLowerCase() === account.toLowerCase()
        );

        const activity = myLogs.map((log) => {
          const resourceHash = log.codigoInsumo;
          const resource = inventory.find(i => i.hash === resourceHash);
          
          return {
            timestamp: Number(log.timestamp),
            details: log.detalles,
            serialId: resource ? resource.serialId : (resourceHash === ethers.ZeroHash ? 'MANDO' : 'ID Desconocido')
          };
        });
        
        console.log(`[Bitácora] Hitos de ${account} en INC-${assignedIncident.id}:`, activity.length);
        setMyHistory(activity.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error("Error fetching brigadista activity:", error);
      }
    };
    fetchActivity();
  }, [account, assignedIncident, contract, inventory]);

  const registrarMiHito = async (e) => {
    e.preventDefault();
    if (!assignedIncident || !reportData.resourceHash || !reportData.note) {
      setMessage({ type: 'error', text: 'Complete todos los campos del reporte.' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Enviando hito a Blockchain...' });

    try {
      const statusLabels = { '0': 'OPERATIVO', '1': 'DAÑO MENOR', '2': 'DAÑO CRÍTICO', '3': 'PERDIDO' };
      const statusText = statusLabels[reportData.status] || 'DESCONOCIDO';
      const fullNote = `[ESTADO: ${statusText}] ${reportData.note}`;

      const tx = await contract.registrarHito(
        BigInt(assignedIncident.id),
        reportData.resourceHash,
        fullNote,
        parseInt(reportData.status)
      );
      await tx.wait();
      
      setMessage({ type: 'success', text: '¡Hito registrado correctamente!' });
      setReportData({ resourceHash: '', status: '0', note: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error al registrar hito. Verifique su conexión.' });
    } finally {
      setLoading(false);
    }
  };

  const iniciarRetornoManual = async (hash, serialId) => {
    const confirmar = window.confirm(`¿Estás seguro de iniciar el retorno de ${serialId}? Esta acción es irreversible y notificará a Base que el equipo está en tránsito de vuelta.`);
    if (!confirmar) return;

    setLoading(true);
    setMessage({ type: 'info', message: `Iniciando retorno de ${serialId}...` });
    try {
      const tx = await contract.iniciarRetorno(hash);
      await tx.wait();
      setMessage({ type: 'success', text: 'Retorno iniciado. Diríjase a Base para entrega física.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al iniciar retorno.' });
    } finally {
      setLoading(false);
    }
  };

  const firmarDeslinde = async (hash, serialId) => {
    setLoading(true);
    setMessage({ type: 'info', text: `Firmando deslinde de ${serialId}...` });
    try {
      const tx = await contract.firmarDeslinde(hash);
      await tx.wait();
      setMessage({ type: 'success', text: '¡Acta firmada! Has quedado libre de custodia.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al firmar deslinde.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-brigadista animate-fade-in" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', textAlign: 'center', position: 'relative' }}>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-color)', margin: 0, textShadow: '0 0 10px rgba(255,165,0,0.3)' }}>🛡️ INTERFAZ DE CAMPO</h2>
        <span style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '2px', display: 'block' }}>V1.1 | OPERACIONES TÁCTICAS</span>
        
        {onRefresh && (
          <button 
            className={`btn ${syncing ? 'spin' : ''}`} 
            style={{ 
              marginTop: '0.8rem', 
              fontSize: '0.75rem', 
              padding: '0.5rem', 
              minWidth: '60px',
              height: '40px',
              borderRadius: '8px',
              background: syncing ? 'rgba(255,165,0,0.1)' : 'var(--accent-color)',
              color: syncing ? 'var(--accent-color)' : '#000',
              border: syncing ? '1px solid var(--accent-color)' : 'none',
              fontWeight: 'bold'
            }} 
            onClick={handleManualRefresh}
            disabled={syncing}
          >
            {syncing ? '⌛' : 'SYNC'}
          </button>
        )}
      </header>

      {activeBrigadista ? (
        <>
          {/* Info de Despliegue */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #111 0%, #050505 100%)', border: '1px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                👨‍🚒
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{activeBrigadista.name}</h3>
                <span style={{ fontSize: '0.7rem', color: '#888' }}>{activeBrigadista.specialty} | {activeBrigadista.address.slice(0, 7)}...{activeBrigadista.address.slice(-5)}</span>
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid #222' }}>
              <span style={{ fontSize: '0.7rem', color: '#666', display: 'block' }}>INCIDENTE ASIGNADO:</span>
              {assignedIncident ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{assignedIncident.label}</span>
                    <span 
                      className={`status-pill risk-${assignedIncident.activo ? '3' : '1'}`} 
                      style={{ fontSize: '0.6rem' }}
                    >
                      {assignedIncident.activo ? 'EN CURSO' : 'FINALIZADO'}
                    </span>
                  </div>
                  {assignedIncident && !assignedIncident.activo && myResources.length > 0 && (
                    <div className="pulse-warning" style={{ 
                      marginTop: '1rem', 
                      padding: '0.8rem', 
                      background: 'rgba(255,204,0,0.1)', 
                      border: '1px solid #ffcc00', 
                      borderRadius: '6px',
                      color: '#ffcc00',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      ⚠️ PENDIENTE DE DEVOLUCIÓN DE EQUIPO ASIGNADO
                    </div>
                  )}
                </>
              ) : (
                <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '0.9rem' }}>SIN ASIGNACIÓN ACTIVA</span>
              )}
            </div>
          </div>

          {/* ACTAS PENDIENTES DE FIRMA (HANDSHAKE) - PRIORIDAD ALTA */}
          {inventory.some(i => i.custodio?.toLowerCase() === account?.toLowerCase() && i.auditoriaPendiente) && (
            <section className="card" style={{ marginBottom: '1.5rem', border: '2px solid #ffcc00', background: 'rgba(255,204,0,0.05)', boxShadow: '0 0 15px rgba(255,204,0,0.1)' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#ffcc00', marginBottom: '1rem', letterSpacing: '1px' }}>📥 ACTAS DE DEVOLUCIÓN POR FIRMAR</h4>
              <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '-0.5rem', marginBottom: '1rem' }}>Revisa la auditoría de base y firma para deslindar responsabilidad.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {inventory
                  .filter(i => i.custodio?.toLowerCase() === account?.toLowerCase() && i.auditoriaPendiente)
                  .map(item => (
                    <div key={item.hash} style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', borderLeft: '3px solid #ffcc00' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{item.serialId}</span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{item.incidente}</span>
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.8rem' }}>
                        <div><strong>Resultado Auditoría:</strong> {item.auditoriaPendiente.estadoPropuesto === 0 ? '✅ Disponible' : item.auditoriaPendiente.estadoPropuesto === 2 ? '🛠️ Taller' : '❌ Baja'}</div>
                        <div><strong>Consumo Registrado:</strong> {item.auditoriaPendiente.consumoReal} Litros</div>
                        {item.auditoriaPendiente.motivo && <div style={{ color: '#ffcc00', marginTop: '0.3rem' }}>📝 <em>"{item.auditoriaPendiente.motivo}"</em></div>}
                      </div>

                      <button 
                        className="btn" 
                        style={{ width: '100%', fontSize: '0.75rem', background: '#ffcc00', color: '#000', fontWeight: 'bold' }}
                        onClick={() => firmarDeslinde(item.hash, item.serialId)}
                        disabled={loading}
                      >
                        {loading ? '...' : '✍️ REVISADO Y CONFORME'}
                      </button>
                    </div>
                ))}
              </div>
            </section>
          )}

          {/* MIS RECURSOS (COLAPSABLE) */}
          <section style={{ marginBottom: '1.5rem' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}
              onClick={() => setShowResources(!showResources)}
            >
              <h4 style={{ fontSize: '0.8rem', color: '#888', margin: 0, letterSpacing: '1px' }}>🛠️ MIS RECURSOS ({myResources.length})</h4>
              <span style={{ color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: 'bold' }}>{showResources ? '−' : '+'}</span>
            </div>

            {showResources && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myResources.length > 0 ? (
                  myResources.map(res => (
                    <div key={res.hash} className="card-mini" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{res.serialId}</div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>{res.descripcion}</div>
                      </div>
                      <div>
                        {res.estado === 1 ? (
                          <button 
                            className="btn" 
                            style={{ fontSize: '0.6rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
                            onClick={() => iniciarRetornoManual(res.hash, res.serialId)}
                            disabled={loading}
                          >
                            ENTREGAR 📥
                          </button>
                        ) : (
                          <div className="status-pill" style={{ fontSize: '0.6rem', background: '#ffa50022', color: '#ffa500', border: '1px solid #ffa50044' }}>
                            {res.estadoLabel.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#444', fontStyle: 'italic', textAlign: 'center' }}>No tienes herramientas asignadas aún.</p>
                )}
              </div>
            )}
          </section>

          {/* REPORTE DE HITO */}
          {assignedIncident && myResources.length > 0 && (
            <section className="card" style={{ borderTop: '4px solid var(--accent-color)' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-color)', marginBottom: '1rem' }}>📝 INFORME DE CAMPO</h4>
              
              <form onSubmit={registrarMiHito}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem' }}>RECURSO DE REFERENCIA:</label>
                  <select 
                    className="skin-select" 
                    value={reportData.resourceHash}
                    onChange={(e) => setReportData({...reportData, resourceHash: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem' }}
                  >
                    <option value="">-- Seleccionar Equipo --</option>
                    {myResources.map(r => (
                      <option key={r.hash} value={r.hash}>{r.serialId} - {r.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem' }}>ESTADO DEL EQUIPO:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setReportData({...reportData, status: '0'})} className={`btn-secondary ${reportData.status === '0' ? 'active-status' : ''}`} style={{ fontSize: '0.7rem', padding: '0.5rem' }}>✅ OPERATIVO</button>
                    <button type="button" onClick={() => setReportData({...reportData, status: '1'})} className={`btn-secondary ${reportData.status === '1' ? 'active-status' : ''}`} style={{ fontSize: '0.7rem', padding: '0.5rem' }}>⚠️ DAÑO MENOR</button>
                    <button type="button" onClick={() => setReportData({...reportData, status: '2'})} className={`btn-secondary ${reportData.status === '2' ? 'active-status' : ''}`} style={{ fontSize: '0.7rem', padding: '0.5rem' }}>🚫 DAÑO CRÍTICO</button>
                    <button type="button" onClick={() => setReportData({...reportData, status: '3'})} className={`btn-secondary ${reportData.status === '3' ? 'active-status' : ''}`} style={{ fontSize: '0.7rem', padding: '0.5rem' }}>❌ PERDIDO</button>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem' }}>NOVEDADES / OBSERVACIONES:</label>
                  <textarea 
                    className="skin-select" 
                    rows="3"
                    placeholder="Escriba aquí los detalles del despliegue..."
                    value={reportData.note}
                    onChange={(e) => setReportData({...reportData, note: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', background: '#000', borderRadius: '4px', border: '1px solid #333' }}
                  />
                </div>

                {message.text && (
                  <div style={{ padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', backgroundColor: message.type === 'error' ? '#ff444422' : '#ffa50022', color: message.type === 'error' ? '#ff4444' : 'var(--accent-color)', border: `1px solid ${message.type === 'error' ? '#ff444444' : 'var(--accent-color)'}` }}>
                    {message.text}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn" 
                  disabled={loading} 
                  style={{ 
                    width: '100%', 
                    height: '50px', 
                    fontSize: '1rem', 
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'SINCRONIZANDO...' : '🚀 ENVIAR REPORTE A BASE'}
                </button>
              </form>
            </section>
          )}

          {/* LISTADO DE MIS HITOS (Histórico Reciente) */}
          <section style={{ marginTop: '2rem' }}>
             <h4 style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', letterSpacing: '1px' }}>📑 MI ACTIVIDAD RECIENTE</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {myHistory.length > 0 ? (
                   myHistory.map((h, idx) => (
                      <div key={idx} className="card-mini" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-color)', background: 'rgba(255,165,0,0.02)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem' }}>
                            <span>{new Date(h.timestamp * 1000).toLocaleString()}</span>
                            <span style={{ color: 'var(--accent-color)' }}>{h.serialId}</span>
                         </div>
                         <div style={{ fontSize: '0.85rem', color: '#eee' }}>{h.details}</div>
                      </div>
                   ))
                ) : (
                   <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#444' }}>No hay reportes previos registrados.</p>
                )}
             </div>
          </section>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
          <p>Identifíquese para ver sus misiones y recursos asignados.</p>
        </div>
      )}

      <style>{`
        .active-status {
          border: 2px solid var(--accent-color) !important;
          background: rgba(255,165,0,0.1) !important;
          color: #fff !important;
        }
        .pulse-warning {
          animation: pulse-border 2s infinite;
        }
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 204, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 204, 0, 0); }
        }
        .dashboard-brigadista select {
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffa500' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.7rem center;
          background-size: 1rem;
        }
      `}</style>
    </div>
  );
};

export default BrigadistaDashboard;
