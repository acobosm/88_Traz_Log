import React from 'react';

const ConsultasDashboard = ({ incidents, onRefresh, onViewTactical, onViewSummary, formatTime, account }) => {
  // Solo incidentes cerrados para rendición de cuentas
  const closedIncidents = incidents.filter(f => !f.activo);

  return (
    <div className="consultas-dashboard">
      <div className="card" style={{ borderColor: 'var(--accent-color)', borderStyle: 'solid', position: 'relative', overflow: 'hidden' }}>
        {/* Badge de Rendición de Cuentas */}
        <div style={{
          position: 'absolute',
          top: '1.4rem',
          right: '-6.1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
          padding: '0.6rem 4rem',
          transform: 'rotate(45deg)',
          fontWeight: '900',
          fontSize: '0.7rem',
          letterSpacing: '3px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          zIndex: 10,
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          &nbsp;&nbsp;....   ACCESO PÚBLICO&nbsp;&nbsp;
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ textTransform: 'uppercase', letterSpacing: '2px' }}>Portal de Transparencia Ciudadana</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '80%' }}>
              Bienvenido al visor público de FireOPS. Aquí puede consultar el historial inmutable de incidentes finalizados,
              recursos utilizados y la trazabilidad de las operaciones de socorro.
            </p>
          </div>
          <div className="badge-role" style={{
            background: 'rgba(255, 111, 0, 0.2)',
            color: 'var(--accent-color)',
            border: '1px solid var(--accent-color)',
            marginRight: '2rem'
          }}>
            🏛️ RENDICIÓN DE CUENTAS
          </div>
        </div>

        <div className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem' }}>
          <span className="status-dot" style={{ backgroundColor: '#00ff7f' }}></span>
          <span style={{ fontSize: '0.85rem' }}>Billetera Conectada (Invitado): <code style={{ color: 'var(--accent-color)' }}>{account}</code></span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📋 HISTORIAL DE INCIDENTES FINALIZADOS</h2>
          <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} onClick={onRefresh}>🔄 REFRESCAR DATOS</button>
        </div>

        {closedIncidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed #333', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
            <h3 style={{ color: '#666' }}>No hay incidentes cerrados registrados para auditoría pública.</h3>
            <p style={{ color: '#444', fontSize: '0.9rem' }}>La información se mostrará aquí una vez que los Jefes de Escena finalicen las operaciones tácticas.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {closedIncidents.map((fire) => (
              <div key={fire.id} className="status-badge" style={{
                flexDirection: 'column',
                padding: '1.5rem',
                background: 'linear-gradient(145deg, var(--bg-primary), #1a1a1a)',
                alignItems: 'stretch',
                border: '1px solid #333',
                gap: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: '900', color: 'var(--accent-color)', fontSize: '1.1rem' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                    <span style={{ margin: '0 1rem', color: '#444' }}>|</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatTime(fire.timestamp)}</span>
                    <span style={{ margin: '0 1rem', color: '#444' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>RIESGO FINAL:</span>
                      <span className={`status-pill risk-${fire.riesgo}`} style={{ fontSize: '0.65rem', fontWeight: '900' }}>
                        {fire.riesgo === '1' && 'BAJO'}
                        {fire.riesgo === '2' && 'MODERADO'}
                        {fire.riesgo === '3' && 'ALTO'}
                        {fire.riesgo === '4' && 'MUY ALTO'}
                        {fire.riesgo === '5' && 'EXTREMO'}
                      </span>
                    </div>
                  </div>
                  <span style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6464', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ff646433' }}>
                    INMUTABLE EN BLOCKCHAIN
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <span style={{ color: '#ccc', fontSze: '0.9rem' }}>{fire.coords}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '0.8rem 1.2rem',
                        fontSize: '0.75rem',
                        border: '1px solid var(--accent-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onClick={() => onViewSummary(fire)}
                    >
                      <span>👁️</span> RESUMEN DE EVENTO
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: '0.8rem 1.2rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onClick={() => onViewTactical(fire)}
                    >
                      <span>🚀</span> CONSULTAR TABLERO TÁCTICO
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'rgba(255,165,0,0.02)', border: '1px solid rgba(255,165,0,0.1)' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>🛡️ GARANTÍA DE INMUTABILIDAD</h3>
        <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
          Toda la información mostrada en este portal proviene directamente de registros inalterables en la red Blockchain.
          Las firmas digitales de los brigadistas y jefes de escena garantizan la veracidad de los datos presentados.
        </p>
      </div>
    </div>
  );
};

export default ConsultasDashboard;
