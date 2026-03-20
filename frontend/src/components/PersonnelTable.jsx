import React, { useState } from 'react';

const PersonnelTable = ({ 
    personnel, 
    inventory, 
    canManage = false, 
    newPerson, 
    setNewPerson, 
    registrarPersonal, 
    loading, 
    hardRefresh 
}) => {
    const [personnelFilter, setPersonnelFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPersonnel, setExpandedPersonnel] = useState({});

    const toggleExpand = (address) => {
        setExpandedPersonnel(prev => ({
            ...prev,
            [address]: !prev[address]
        }));
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>👥 GESTIÓN DE PERSONAL (BRIGADISTAS)</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                        type="text" 
                        className="skin-select" 
                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.8rem', width: '200px', backgroundImage: 'none' }} 
                        placeholder="🔍 Buscar por nombre o INC..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select 
                        className="skin-select" 
                        style={{ fontSize: '0.7rem', padding: '0.3rem', width: 'auto' }} 
                        value={personnelFilter} 
                        onChange={(e) => setPersonnelFilter(e.target.value)}
                    >
                        <option value="all">ESTADO: TODOS</option>
                        <option value="available">DISPONIBLES</option>
                        <option value="incident">EN INCIDENTE</option>
                    </select>
                    <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} 
                        onClick={hardRefresh}
                    >
                        🔄 ACTUALIZAR PERSONAL
                    </button>
                </div>
            </div>

            {/* Formulario de registro (Solo si canManage es true) */}
            {canManage && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <label className="skin-label">WALLET ADDRESS</label>
                        <input 
                            type="text" 
                            className="skin-select" 
                            style={{ backgroundImage: 'none', height: '38px' }} 
                            placeholder="0x..." 
                            value={newPerson.address} 
                            onChange={(e) => setNewPerson({ ...newPerson, address: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="skin-label">NOMBRE COMPLETO</label>
                        <input 
                            type="text" 
                            className="skin-select" 
                            style={{ backgroundImage: 'none', height: '38px' }} 
                            placeholder="Ej: Alice Liang" 
                            value={newPerson.name} 
                            onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="skin-label">ESPECIALIDAD</label>
                        <input 
                            type="text" 
                            className="skin-select" 
                            style={{ backgroundImage: 'none', height: '38px' }} 
                            placeholder="Ej: Motobombista" 
                            value={newPerson.specialty} 
                            onChange={(e) => setNewPerson({ ...newPerson, specialty: e.target.value })} 
                        />
                    </div>
                    <div>
                        <label className="skin-label">ROL INICIAL</label>
                        <select 
                            className="skin-select" 
                            style={{ height: '38px' }} 
                            value={newPerson.role} 
                            onChange={(e) => setNewPerson({ ...newPerson, role: Number(e.target.value) })}
                        >
                            <option value="2">Brigadista (Operador)</option>
                            <option value="1">Jefe de Escena</option>
                        </select>
                    </div>
                    <button 
                        className="btn" 
                        onClick={registrarPersonal} 
                        disabled={loading} 
                        style={{ alignSelf: 'end', height: '38px' }}
                    >
                        {loading ? '...' : '➕ REGISTRAR'}
                    </button>
                </div>
            )}

            {/* Lista de Personal */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ color: 'var(--accent-color)', fontSize: '0.75rem', borderBottom: '1px solid #333' }}>
                            <th style={{ padding: '0.8rem' }}>NOMBRE</th>
                            <th style={{ padding: '0.8rem' }}>ESPECIALIDAD</th>
                            <th style={{ padding: '0.8rem' }}>DIRECCIÓN</th>
                            <th style={{ padding: '0.8rem' }}>ESTADO</th>
                            <th style={{ padding: '0.8rem' }}>INCIDENTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {personnel
                            .filter(p => {
                                // Filtro por dropdown de estado
                                if (personnelFilter === 'available' && p.incidente !== '---') return false;
                                if (personnelFilter === 'incident' && p.incidente === '---') return false;
                                
                                // Filtro por texto de búsqueda (nombre o incidente)
                                if (searchTerm) {
                                    const search = searchTerm.toLowerCase();
                                    const matchesName = p.name.toLowerCase().includes(search);
                                    const matchesIncident = p.incidente.toLowerCase().includes(search);
                                    if (!matchesName && !matchesIncident) return false;
                                }
                                
                                return true;
                            })
                            .map((p) => {
                                const assignedResources = inventory.filter(i => i.custodio?.toLowerCase() === p.address?.toLowerCase() && i.estado === 1);
                                const isExpanded = expandedPersonnel[p.address];
                                return (
                                    <React.Fragment key={p.address}>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    <span style={{ fontSize: '1.4rem' }}>{p.isJefe ? '👨‍🚒' : '👤'}</span>
                                                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                                                    {assignedResources.length > 0 && (
                                                        <button 
                                                            onClick={() => toggleExpand(p.address)}
                                                            style={{ 
                                                                background: 'rgba(255,165,0,0.1)', 
                                                                border: '1px solid var(--accent-color)', 
                                                                color: 'var(--accent-color)', 
                                                                borderRadius: '4px', 
                                                                cursor: 'pointer',
                                                                minWidth: '28px',
                                                                height: '28px', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center', 
                                                                fontSize: '1.2rem', 
                                                                fontWeight: 'bold', 
                                                                transition: 'all 0.2s'
                                                            }}
                                                            title="Ver equipamiento"
                                                        >
                                                            {isExpanded ? '−' : '＋'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', color: '#ccc' }}>{p.specialty}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.7rem', color: '#666', fontFamily: 'monospace' }}>{p.address}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className={`status-pill risk-${p.incidente === '---' ? '1' : '4'}`} style={{ fontSize: '0.65rem' }}>
                                                    {p.incidente === '---' ? 'DISPONIBLE' : 'EN DESPLIEGUE'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: p.incidente !== '---' ? 'var(--accent-color)' : '#666', fontWeight: 'bold' }}>{p.incidente}</td>
                                        </tr>
                                        {isExpanded && assignedResources.length > 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '0', background: 'rgba(0,0,0,0.2)' }}>
                                                    <div style={{ padding: '1rem 3rem', borderLeft: '3px solid var(--accent-color)', margin: '0.5rem 0' }}>
                                                        <h4 style={{ fontSize: '0.75rem', color: 'var(--accent-color)', margin: '0 0 0.8rem 0' }}>📦 EQUIPO VINCULADO:</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                                                            {assignedResources.map(item => (
                                                                <div key={item.hash} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                                    <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{item.descripcion}</span>
                                                                        <span style={{ fontSize: '0.65rem', color: '#666' }}>S/N: {item.serialId}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PersonnelTable;
