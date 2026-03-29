import React, { useState, useRef } from 'react';
import { ethers } from 'ethers';
import Papa from 'papaparse';
import PersonnelTable from './components/PersonnelTable';
import AssetTable from './components/AssetTable';

const BaseOperativaDashboard = ({ contract, account, inventory, personnel, loading, setLoading, setStatus, hardRefresh, fetchAssetHistory, openReturnModal }) => {
    const fileInputRef = useRef(null);
    const [newPerson, setNewPerson] = useState({ address: '', name: '', specialty: '', role: 2 });

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const processCsv = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoading(true);
        setStatus({ type: 'info', message: 'Procesando inventario...' });
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const codigos = [];
                    const descripciones = [];
                    const consumos = [];
                    const currentHashes = new Set(inventory.map(item => item.hash));
                    
                    results.data.forEach((row, index) => {
                        const codigoId = (row.codigo_id || row.codigo || '').trim();
                        const descripcion = (row.descripcion || '').trim();
                        const consumoRaw = row.consumo_nominal_L_h || row.consumo_nominal_ml_h || row.consumo || 0;

                        if (codigoId && descripcion) {
                            const numConsumo = Number(consumoRaw);
                            const hash = ethers.keccak256(ethers.toUtf8Bytes(codigoId));
                            if (!currentHashes.has(hash)) {
                                codigos.push(hash);
                                descripciones.push(`${codigoId} | ${descripcion}`);
                                const consumoML = Math.round(Number(numConsumo) * 1000);
                                consumos.push(BigInt(consumoML));

                            }
                        }
                    });

                    if (codigos.length === 0) {
                        setStatus({ type: 'info', message: 'Sin items nuevos para registrar.' });
                        setLoading(false);
                        return;
                    }

                    const tx = await contract.registrarInsumosBatch(codigos, descripciones, consumos);
                    await tx.wait();
                    setStatus({ type: 'success', message: `Registrados ${codigos.length} ítems exitosamente.` });
                    await hardRefresh();
                } catch (error) {
                    setStatus({ type: 'error', message: error.message || 'Error en subida.' });
                } finally {
                    setLoading(false);
                    if (event.target) event.target.value = '';
                }
            }
        });
    };

    const registrarPersonal = async () => {
        if (!newPerson.address || !newPerson.name) {
            setStatus({ type: 'error', message: 'Address y Nombre son obligatorios.' });
            return;
        }
        setLoading(true);
        try {
            const roleHash = newPerson.role === 2 
                ? await contract.OPERADOR_ROLE() 
                : await contract.JEFE_ESCENA_ROLE();

            const tx = await contract.registrarPersonal(
                newPerson.address.trim(),
                newPerson.name.trim(),
                newPerson.specialty.trim(),
                roleHash
            );
            await tx.wait();
            setStatus({ type: 'success', message: 'Personal registrado exitosamente.' });
            setNewPerson({ address: '', name: '', specialty: '', role: 2 });
            await hardRefresh();
        } catch (error) {
            console.error("Error al registrar personal:", error);
            const reason = error.reason || error.message || "Error desconocido";
            setStatus({ type: 'error', message: `Error registrar personal: ${reason}` });
        } finally {
            setLoading(false);
        }
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* CABECERA CON ROL */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                <div className="badge-role" style={{ background: 'rgba(77, 255, 77, 0.15)', color: '#4dff4d', border: '1px solid rgba(77,255,77,0.3)' }}>
                    🏢 BASE OPERATIVA
                </div>
            </div>

            {/* PANEL DE CONTROL LOGÍSTICO */}
            <div className="card" style={{ borderColor: 'var(--accent-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2>📦 CENTRO DE GESTIÓN LOGÍSTICA</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Control de inventario, auditoría de recepciones y gestión de personal.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <a href="/plantilla_inventario.csv" className="btn btn-secondary" download style={{ fontSize: '0.8rem' }}>Plantilla CSV</a>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={processCsv} />
                        <button className="btn" onClick={handleUploadClick} disabled={loading}>Cargar Stock</button>
                    </div>
                </div>
            </div>


            {/* GESTIÓN DE PERSONAL (BRIGADISTAS) */}
            <PersonnelTable 
                personnel={personnel}
                inventory={inventory}
                canManage={true}
                newPerson={newPerson}
                setNewPerson={setNewPerson}
                registrarPersonal={registrarPersonal}
                loading={loading}
                hardRefresh={hardRefresh}
            />

            {/* TABLERO DE LOGÍSTICA Y AUDITORÍA */}
            <AssetTable 
                inventory={inventory}
                canAudit={true}
                fetchAssetHistory={fetchAssetHistory}
                openReturnModal={openReturnModal}
                hardRefresh={hardRefresh}
            />
        </div>
    );
};

export default BaseOperativaDashboard;
