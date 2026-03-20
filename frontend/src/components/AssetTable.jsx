import React, { useState } from 'react';

const AssetTable = ({ 
    inventory, 
    canAudit = false, 
    fetchAssetHistory, 
    openReturnModal, 
    hardRefresh 
}) => {
    const [showInventoryBoard, setShowInventoryBoard] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryFilter, setInventoryFilter] = useState('all');

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = 
            item.serialId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.incidente.toLowerCase().includes(searchTerm.toLowerCase());
            
        if (inventoryFilter === 'available') return matchesSearch && item.estado === 0;
        if (inventoryFilter === 'operation') return matchesSearch && item.estado === 1;
        if (inventoryFilter === 'return') return matchesSearch && item.estado === 4;
        if (inventoryFilter === 'workshop') return matchesSearch && item.estado === 2;
        return matchesSearch;
    });

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowInventoryBoard(!showInventoryBoard)}
                    style={{ padding: '0.8rem 2rem', letterSpacing: '1px', fontWeight: 'bold', border: '1px solid var(--accent-color)' }}
                >
                    {showInventoryBoard ? '🔼 OCULTAR CONTROL DE STOCK' : '📦 ABRIR CONTROL DE STOCK Y AUDITORÍA'}
                </button>
            </div>

            {showInventoryBoard && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0 }}>📦 TABLERO DE LOGÍSTICA Y AUDITORÍA</h2>
                            <input 
                                type="text" 
                                placeholder="Buscar recurso..." 
                                className="skin-select" 
                                style={{ padding: '0.4rem 0.8rem', width: '160px', backgroundImage: 'none', fontSize: '0.75rem' }} 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.7rem', color: '#666' }}>FILTRAR:</label>
                                <select 
                                    className="skin-select" 
                                    style={{ padding: '0.3rem', fontSize: '0.7rem', width: 'auto' }} 
                                    value={inventoryFilter} 
                                    onChange={(e) => setInventoryFilter(e.target.value)}
                                >
                                    <option value="all">TODOS</option>
                                    <option value="available">DISPONIBLES 🟢</option>
                                    <option value="operation">EN OPERACIÓN 🔴</option>
                                    <option value="return">EN RETORNO 🟠</option>
                                    <option value="workshop">TALLER 🛠️</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }} 
                            onClick={hardRefresh}
                        >
                            🔄 ACTUALIZAR STOCK
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--accent-color)' }}>
                                    <th style={{ padding: '1rem', width: '50px' }}>#</th>
                                    <th style={{ padding: '1rem', width: '100px' }}>ID SERIAL</th>
                                    <th style={{ padding: '1rem' }}>RECURSO / CUSTODIO</th>
                                    <th style={{ padding: '1rem' }}>HISTORIAL</th>
                                    <th style={{ padding: '1rem' }}>ESTADO</th>
                                    <th style={{ padding: '1rem' }}>INCIDENTE</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.map((item, index) => (
                                    <tr key={item.hash} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', color: '#666' }}>{index + 1}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.serialId}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold' }}>{item.descripcion}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#666' }}>Custodio: {item.custodioNombre}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button 
                                                onClick={() => fetchAssetHistory(item)} 
                                                className="btn btn-secondary" 
                                                style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem' }}
                                            >
                                                🔍 VER HISTORIAL
                                            </button>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span 
                                                className={`status-pill ${
                                                    item.estado === 0 ? 'risk-1' : 
                                                    item.estado === 1 ? 'risk-4' : 
                                                    item.estado === 2 ? 'risk-workshop' : 
                                                    item.estado === 4 ? 'risk-3' : 'risk-5'
                                                }`} 
                                                style={{ fontSize: '0.65rem', fontWeight: 'bold' }}
                                            >
                                                {item.estadoLabel.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', color: item.incidente !== '---' ? 'var(--accent-color)' : '#666' }}>{item.incidente}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            {canAudit && (item.estado === 1 || item.estado === 4) && (
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ 
                                                        fontSize: '0.7rem', 
                                                        border: item.estado === 4 ? '1px solid #4dff4d' : '1px solid #ffcc00', 
                                                        color: item.estado === 4 ? '#4dff4d' : '#ffcc00' 
                                                    }}
                                                    onClick={() => openReturnModal(item)}
                                                >
                                                    {item.estado === 4 ? '✅ RECIBIR Y AUDITAR' : '🚨 RETIRO ANTICIPADO'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetTable;
