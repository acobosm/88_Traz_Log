import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const ROLES = {
    DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
    BASE_OPERATIVA_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BASE_OPERATIVA_ROLE")),
    JEFE_ESCENA_ROLE: ethers.keccak256(ethers.toUtf8Bytes("JEFE_ESCENA_ROLE")),
    OPERADOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("OPERADOR_ROLE")),
    AUDITOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE")),
    CONSULTOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("CONSULTOR_ROLE"))
};

const AdminDashboard = ({ contract, account, personnel, onRefresh, setStatus }) => {
    const [loading, setLoading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [newPerson, setNewPerson] = useState({ address: '', name: '', specialty: '', role: ROLES.AUDITOR_ROLE });

    useEffect(() => {
        checkPauseStatus();
    }, [contract]);

    const checkPauseStatus = async () => {
        if (!contract) return;
        try {
            const paused = await contract.paused();
            setIsPaused(paused);
        } catch (error) {
            console.error("Error checking pause status:", error);
        }
    };

    const togglePause = async () => {
        setLoading(true);
        setStatus({ type: 'info', message: isPaused ? 'REANUDANDO CONTRATO...' : 'PAUSANDO CONTRATO...' });
        try {
            const tx = isPaused ? await contract.unpause() : await contract.pause();
            await tx.wait();
            setIsPaused(!isPaused);
            setStatus({ type: 'success', message: `CONTRATO ${isPaused ? 'REANUDADO' : 'PAUSADO'} EXITOSAMENTE` });
        } catch (error) {
            setStatus({ type: 'error', message: `ERROR: ${error.message}` });
        } finally {
            setLoading(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        }
    };

    const handleUpdateRole = async (targetAddress, roleHash, action) => {
        setLoading(true);
        setStatus({ type: 'info', message: `${action === 'GRANT' ? 'ASIGNANDO' : 'REVOCANDO'} ROL...` });
        try {
            const tx = action === 'GRANT' 
                ? await contract.grantRole(roleHash, targetAddress) 
                : await contract.revokeRole(roleHash, targetAddress);
            await tx.wait();
            setStatus({ type: 'success', message: 'ROL ACTUALIZADO CORRECTAMENTE' });
            if (onRefresh) onRefresh();
        } catch (error) {
            setStatus({ type: 'error', message: `ERROR: ${error.message}` });
        } finally {
            setLoading(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        }
    };

    const registrarPersonal = async () => {
        if (!newPerson.address || !newPerson.name) {
            setStatus({ type: 'error', message: 'Address y Nombre son obligatorios.' });
            return;
        }
        setLoading(true);
        setStatus({ type: 'info', message: 'REGISTRANDO NUEVA AUTORIDAD...' });
        try {
            const tx = await contract.registrarPersonal(
                newPerson.address.trim(),
                newPerson.name.trim(),
                newPerson.specialty.trim(),
                newPerson.role
            );
            await tx.wait();
            setStatus({ type: 'success', message: 'PERSONAL REGISTRADO EXITOSAMENTE' });
            setNewPerson({ address: '', name: '', specialty: '', role: ROLES.AUDITOR_ROLE });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Error al registrar autoridad:", error);
            setStatus({ type: 'error', message: `ERROR: ${error.reason || error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const getRoleName = (address) => {
        const p = personnel.find(per => per.address.toLowerCase() === address.toLowerCase());
        if (!p) return "SIN REGISTRO";
        if (p.isJefe) return "JEFE DE ESCENA";
        return "BRIGADISTA / OPERADOR";
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* BADGE DE ROL ADMINISTRADOR */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                <div className="badge-role">
                    👑 ADMINISTRADOR DEL SISTEMA
                </div>
            </div>

            {/* HEADER GOBERNANZA */}
            <div className="card" style={{ border: '2px solid #ff0000', boxShadow: '0 0 20px rgba(255,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ color: '#ff4d4d', margin: 0 }}>🛡️ GOBERNANZA GLOBAL (SISTEMA CRÍTICO)</h2>
                        <p style={{ color: '#888', marginTop: '0.5rem' }}>Administración de privilegios de red y control de emergencia del contrato inteligente.</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem' }}>ESTADO DEL CONTRATO:</div>
                        <button 
                            className={`btn ${isPaused ? 'btn-success' : 'btn-danger'}`} 
                            onClick={togglePause} 
                            disabled={loading}
                            style={{ minWidth: '180px', fontWeight: 'bold' }}
                        >
                            {isPaused ? '🟢 REANUDAR SISTEMA' : '🛑 PAUSAR SISTEMA'}
                        </button>
                    </div>
                </div>
            </div>

            {/* GESTIÓN DE ROLES */}
            <div className="card">
                <h3 style={{ borderLeft: '4px solid var(--accent-color)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>👥 GESTIÓN DE AUTORIDAD Y PERSONAL</h3>
                
                {/* FORMULARIO DE ALTA (NUEVO) */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #444', marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#888' }}>➕ REGISTRAR NUEVA AUTORIDAD (ALTA)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#666', display: 'block', marginBottom: '0.4rem' }}>DIRECCIÓN WALLET (0x...)</label>
                            <input 
                                type="text" 
                                className="skin-select" 
                                style={{ width: '100%', padding: '0.6rem', backgroundImage: 'none', fontSize: '0.8rem' }}
                                placeholder="0x..."
                                value={newPerson.address}
                                onChange={(e) => setNewPerson({ ...newPerson, address: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#666', display: 'block', marginBottom: '0.4rem' }}>NOMBRE TÁCTICO</label>
                            <input 
                                type="text" 
                                className="skin-select" 
                                style={{ width: '100%', padding: '0.6rem', backgroundImage: 'none', fontSize: '0.8rem' }}
                                placeholder="Ej: Kento Nanami"
                                value={newPerson.name}
                                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: '#666', display: 'block', marginBottom: '0.4rem' }}>ROL INICIAL</label>
                            <select 
                                className="skin-select" 
                                style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}
                                value={newPerson.role}
                                onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}
                            >
                                <option value={ROLES.AUDITOR_ROLE}>🕵️ AUDITOR</option>
                                <option value={ROLES.JEFE_ESCENA_ROLE}>👨‍🚒 JEFE DE ESCENA</option>
                                <option value={ROLES.OPERADOR_ROLE}>🏃 BRIGADISTA / OPERADOR</option>
                            </select>
                        </div>
                        <button 
                            className="btn" 
                            style={{ padding: '0.6rem' }}
                            onClick={registrarPersonal}
                            disabled={loading}
                        >
                            {loading ? '...' : 'DAR DE ALTA'}
                        </button>
                    </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', border: '1px solid #333' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: 'var(--accent-color)', fontSize: '0.8rem', borderBottom: '1px solid #444' }}>
                                <th style={{ padding: '1rem' }}>NOMBRE / IDENTIDAD</th>
                                <th style={{ padding: '1rem' }}>DIRECCIÓN WALLET</th>
                                <th style={{ padding: '1rem' }}>ROL ACTUAL</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>ACCIONES DE MANDO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personnel.map((p, i) => (
                                <tr key={p.address} style={{ borderBottom: '1px solid #222', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.name}</td>
                                    <td style={{ padding: '1rem' }}><code style={{ color: '#666', fontSize: '0.8rem' }}>{p.address}</code></td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className="status-pill" style={{ fontSize: '0.65rem', background: p.isJefe ? 'rgba(255,140,0,0.1)' : 'rgba(0,150,255,0.1)', color: p.isJefe ? '#ff8c00' : '#0096ff', border: `1px solid ${p.isJefe ? '#ff8c00' : '#0096ff'}` }}>
                                            {p.isJefe ? 'JEFE DE ESCENA' : 'OPERADOR'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {!p.isJefe ? (
                                                <>
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', border: '1px solid #ff8c00', color: '#ff8c00' }}
                                                        onClick={() => handleUpdateRole(p.address, ROLES.JEFE_ESCENA_ROLE, 'GRANT')}
                                                        disabled={loading}
                                                    >
                                                        ⬆️ JEFE
                                                    </button>
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', border: '1px solid #4dff4d', color: '#4dff4d' }}
                                                        onClick={() => handleUpdateRole(p.address, ROLES.AUDITOR_ROLE, 'GRANT')}
                                                        disabled={loading}
                                                    >
                                                        🕵️ AUDITOR
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', border: '1px solid #0096ff', color: '#0096ff' }}
                                                    onClick={() => handleUpdateRole(p.address, ROLES.JEFE_ESCENA_ROLE, 'REVOKE')}
                                                    disabled={loading}
                                                >
                                                    ⬇️ DEMOVER A OPERADOR
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AUDITORÍA DE SEGURIDAD */}
            <div className="card" style={{ opacity: 0.7 }}>
                <h3 style={{ fontSize: '0.9rem', color: '#666' }}>⚙️ AJUSTES DE AUDITORÍA</h3>
                <p style={{ fontSize: '0.8rem', color: '#444' }}>Funciones de auditoría y configuración de red próximamente disponibles para la Cuenta #0.</p>
            </div>
        </div>
    );
};

export default AdminDashboard;
