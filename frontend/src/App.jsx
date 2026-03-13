import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import Papa from 'papaparse'
import './index.css'
import trazabilidadAbi from './contracts/TrazabilidadLogistica.json'
import TacticalPanel from './TacticalPanel'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

const KNOWN_SERIALS = [
  "ID-HZ001", "ID-MA001", "ID-PL001", "ID-MC001",
  "ID-BF001", "ID-BF002", "ID-BF003", "ID-BF004", "ID-BF005",
  "ID-BF006", "ID-BF007", "ID-BF008", "ID-BF009", "ID-BF010",
  "ID-PA001", "ID-MB001", "ID-MG001", "ID-MX001",
  "ID-V4001", "ID-AM001", "ID-TC001", "ID-RD001",
  "ID-GP001", "ID-CS001", "ID-GT001", "ID-BT001", "ID-MS001"
];

function App() {
  const [skin, setSkin] = useState('forest-fire')
  const [account, setAccount] = useState(null)
  const [isBaseOperativa, setIsBaseOperativa] = useState(false)
  const [isJefeEscena, setIsJefeEscena] = useState(false)
  const [contractInstance, setContractInstance] = useState(null)
  const [inventory, setInventory] = useState([])
  const [incidents, setIncidents] = useState([])
  const [fireCoords, setFireCoords] = useState('')
  const [riskLevel, setRiskLevel] = useState(3)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentView, setCurrentView] = useState('inventory')
  const [showInventory, setShowInventory] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [runtimeError, setRuntimeError] = useState(null)
  const [loadAudit, setLoadAudit] = useState(null)
  /* FASE 5: GESTIÓN DE PERSONAL (Comentado para Push Fase 4)
  const [personnel, setPersonnel] = useState([])
  const [newPerson, setNewPerson] = useState({ address: '', name: '', specialty: '', role: 2 })
  */
  const fileInputRef = useRef(null)

  useEffect(() => {
    window.onerror = (msg, url, line, col, error) => {
      setRuntimeError(`Error: ${msg} at ${line}:${col}`)
      return false
    }
    document.body.setAttribute('data-skin', skin)
  }, [skin])

  const connectWallet = async () => {
    if (!window.ethereum) {
      return setStatus({ type: 'error', message: 'MetaMask no detectado.' })
    }

    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setAccount(address)

      const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi.abi, signer)
      setContractInstance(contract)
      const roleBase = await contract.BASE_OPERATIVA_ROLE()
      const roleJefe = await contract.JEFE_ESCENA_ROLE()

      const hasRoleBase = await contract.hasRole(roleBase, address)
      const hasRoleJefe = await contract.hasRole(roleJefe, address)

      setIsBaseOperativa(hasRoleBase)
      setIsJefeEscena(hasRoleJefe)

      if (hasRoleJefe) {
        await fetchIncidents(contract)
        await fetchInventory(contract)
        // await fetchPersonnel(contract) // FASE 5
      } else if (hasRoleBase) {
        await fetchInventory(contract)
        // await fetchPersonnel(contract) // FASE 5
      }

      if (!hasRoleBase && !hasRoleJefe) {
        setStatus({ type: 'warning', message: 'Conectado. Sin roles operativos asignados.' })
      } else {
        setStatus({ type: 'success', message: 'Sistema sincronizado. Identidad verificada.' })
      }
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', message: 'Error al conectar billetera.' })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadClick = () => {
    if (!account) return connectWallet()
    fileInputRef.current?.click()
  }

  const processCsv = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setStatus({ type: 'info', message: 'Procesando inventario...' })

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const codigos = []
          const descripciones = []
          const consumos = []
          const erroresCSV = []

          let totalEnArchivo = 0
          let nuevos = 0
          let duplicados = 0
          const codigosDuplicados = []

          // Mapa de hashes actuales para búsqueda rápida
          const currentHashes = new Set(inventory.map(item => item.hash))

          results.data.forEach((row, index) => {
            // Soporte para ambos formatos: técnico (codigo) y plantilla (codigo_id)
            const codigoId = (row.codigo_id || row.codigo || '').trim()
            const descripcion = (row.descripcion || '').trim()
            const consumoRaw = row.consumo_nominal_ml_h || row.consumo || 0

            if (codigoId && descripcion) {
              totalEnArchivo++

              // Validación de Consumo (Debe ser un número positivo)
              const numConsumo = Number(consumoRaw)
              if (isNaN(numConsumo) || numConsumo < 0) {
                erroresCSV.push(`Fila ${index + 1}: El consumo "${consumoRaw}" es inválido (debe ser un número positivo).`)
                return
              }

              const hash = ethers.keccak256(ethers.toUtf8Bytes(codigoId))

              if (currentHashes.has(hash)) {
                duplicados++
                codigosDuplicados.push(codigoId)
              } else {
                nuevos++
                codigos.push(hash)
                descripciones.push(`${codigoId} | ${descripcion}`)
                consumos.push(BigInt(numConsumo))
              }
            }
          })

          if (erroresCSV.length > 0) {
            throw new Error(`Se detectaron errores en el archivo CSV:\n\n${erroresCSV.join('\n')}`)
          }

          if (totalEnArchivo === 0) throw new Error('El archivo CSV no contiene datos válidos.')

          if (nuevos === 0) {
            setStatus({
              type: 'info',
              message: `Omitido: Los ${duplicados} ítems ya existen en la blockchain.`
            })
            setLoading(false)
            return
          }

          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi.abi, signer)

          // Validación extra de rol antes de enviar para evitar require(false)
          const roleBase = await contract.BASE_OPERATIVA_ROLE()
          const hasRole = await contract.hasRole(roleBase, account)
          if (!hasRole) throw new Error("Acción denegada: No tienes permisos de Base Operativa para escribir en la red.")

          const tx = await contract.registrarInsumosBatch(codigos, descripciones, consumos)
          setStatus({
            type: 'info',
            message: `Registrando ${nuevos} ítems nuevos... (${duplicados} omitidos)`
          })

          await tx.wait()

          if (duplicados > 0) {
            console.group('🛡️ Auditoría de Logística FireOps: Duplicados Omitidos')
            console.log('Los siguientes códigos ya existen en la blockchain y han sido omitidos para ahorrar gas:')
            codigosDuplicados.forEach(id => console.log(`- ${id}`))
            console.groupEnd()
          }

          setLoadAudit({ nuevos, duplicados, idsDuplicados: codigosDuplicados })

          setStatus({
            type: 'success',
            message: `¡Carga Exitosa! +${nuevos} nuevos registrados.`
          })
        } catch (error) {
          console.error(error)
          setStatus({ type: 'error', message: error.reason || error.message || 'Error en la subida.' })
        } finally {
          setLoading(false)
          if (event.target) event.target.value = ''
        }
      }
    })
  }

  const abrirIncidente = async () => {
    if (!fireCoords) return setStatus({ type: 'error', message: 'Coordenadas requeridas.' })

    setLoading(true)
    setStatus({ type: 'info', message: 'Abriendo incidente en blockchain...' })

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi.abi, signer)

      const tx = await contract.abrirEventoIncendio(fireCoords, riskLevel)
      await tx.wait()

      await fetchIncidents(contract) // Actualizar lista
      setStatus({ type: 'success', message: 'Incidente abierto exitosamente.' })
      setFireCoords('')
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', message: 'Error al abrir incidente.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchIncidents = async (contract) => {
    try {
      const nextID = await contract.nextEventoID()
      const list = []
      for (let i = 1; i < nextID; i++) {
        const fire = await contract.incendios(i)
        if (fire.activo) {
          list.push({
            id: fire.eventoID.toString(),
            jefe: fire.jefeDeEscena,
            coords: fire.coordenadas,
            riesgo: fire.riesgo.toString()
          })
        }
      }
      setIncidents(list)
    } catch (error) {
      console.error("Error fetching incidents:", error)
    }
  }

  /* FASE 5: LÓGICA DE PERSONAL (Comentado para Push Fase 4)
  const fetchPersonnel = async (contract) => {
    ...
  }

  const registrarPersonal = async () => {
    ...
  }
  */

  const fetchInventory = async (contract) => {
    try {
      const filter = contract.filters.InsumoRegistrado()
      const events = await contract.queryFilter(filter, 0)

      const items = await Promise.all(events.map(async (event) => {
        const codigo = event.args[0]
        const data = await contract.inventario(codigo)

        // Intentar extraer ID Serial de la descripción (Formato: "ID-XXX | Desc")
        let serialId = "N/A"
        let finalDesc = data.descripcion
        if (data.descripcion.includes(" | ")) {
          const parts = data.descripcion.split(" | ")
          serialId = parts[0]
          finalDesc = parts[1]
        } else {
          // Heurística para items legacy: comparar hash con seriales conocidos
          for (const id of KNOWN_SERIALS) {
            if (ethers.keccak256(ethers.toUtf8Bytes(id)) === codigo) {
              serialId = id
              break
            }
          }
        }

        return {
          hash: codigo,
          serialId: serialId,
          descripcion: finalDesc,
          estado: Number(data.estado),
          consumo: data.consumoNominal.toString()
        }
      }))
      setInventory(items)
    } catch (error) {
      console.error("Error fetching inventory:", error)
    }
  }


  return (
    <div className="app-container">
      {runtimeError && (
        <div style={{ background: '#ff3232', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid white' }}>
          <strong>⚠️ FALLO TÁCTICO DETECTADO:</strong> {runtimeError}
        </div>
      )}
      <header>
        <div className="logo-section">
          <span style={{ fontSize: '2.5rem' }}>🔥</span>
          <h1>FireOps</h1>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div className="skin-dropdown-container">
            <label className="skin-label">SKINS</label>
            <select
              className="skin-select"
              value={skin}
              onChange={(e) => setSkin(e.target.value)}
            >
              <option value="forest-fire">🔥 Forest Fire</option>
              <option value="night-ops">🌑 Night Ops</option>
              <option value="wild-green">🌿 Wild Green</option>
            </select>
          </div>

          <button
            className={`btn ${account ? 'btn-outline' : ''}`}
            onClick={connectWallet}
            disabled={loading}
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? <span className="spin">⏳</span> : <span>👛</span>}
            {account ? `${account.substring(0, 6)}...` : 'CONECTAR WALLET'}
          </button>
        </div>
      </header>

      {currentView === 'inventory' ? (
        <main>
          {status.message && (
            <div className={`status-banner ${status.type}`}>
              {status.type === 'success' && <span>✅</span>}
              {status.type === 'error' && <span>❌</span>}
              {status.type === 'warning' && <span>⚠️</span>}
              {status.type === 'info' && <span className="spin">⏳</span>}
              <span>{status.message}</span>
            </div>
          )}

          {loadAudit && loadAudit.duplicados > 0 && (
            <div className="status-banner info" style={{ marginTop: '1rem', display: 'block', textAlign: 'left', animation: 'fadeIn 0.5s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>📋 Reporte de Auditoría (Logística)</strong>
                <button
                  onClick={() => setLoadAudit(null)}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ×
                </button>
              </div>
              <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                Se detectaron <strong>{loadAudit.duplicados} ítems</strong> que ya estaban registrados en la red y fueron omitidos automáticamente:
              </p>
              <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                {loadAudit.idsDuplicados.map(id => (
                  <code key={id} style={{ display: 'inline-block', marginRight: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-color)' }}>
                    [{id}]
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* FASE 5: UI GESTIÓN DE PERSONAL (Comentado para Push Fase 4)
          <div className="card" style={{ display: isBaseOperativa ? 'block' : 'none' }}>
            ...
          </div>
          */}

          <div className="card" style={{ display: isBaseOperativa ? 'block' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>Centro de Gestión de Inventario</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', maxWidth: '600px' }}>
                  Panel táctico para la logística de insumos críticos. Controle el flujo de recursos en tiempo real mediante registros inmutables.
                </p>
              </div>
              {isBaseOperativa && (
                <div className="badge-role">
                  🛡️ BASE OPERATIVA
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <a
                href="/plantilla_inventario.csv"
                className="btn btn-secondary"
                download
                style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}
              >
                📥 Descargar Plantilla CSV
              </a>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={processCsv}
              />

              <button
                className="btn"
                onClick={handleUploadClick}
                disabled={loading || (account && !isBaseOperativa)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}
              >
                {loading ? <span className="spin">⏳</span> : <span>📤</span>}
                {account && !isBaseOperativa ? 'RESTRINGIDO' : 'Subir Inventario'}
              </button>
            </div>
          </div>

          {/* Acceso Táctico al Inventario */}
          {(isJefeEscena || isBaseOperativa) && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowInventory(!showInventory)}
                style={{ padding: '0.8rem 2rem', letterSpacing: '1px', fontWeight: 'bold', border: '1px solid var(--accent-color)' }}
              >
                {showInventory ? '🔼 OCULTAR INVENTARIO' : '📦 REVISAR INVENTARIO TÁCTICO'}
              </button>
            </div>
          )}

          {/* Tablero de Logística - Ahora Colapsable */}
          {(isJefeEscena || isBaseOperativa) && showInventory && (
            <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2>📦 Tablero de Logística Forestal</h2>
                  <input
                    type="text"
                    placeholder="Buscar recurso o ID..."
                    className="skin-select"
                    style={{ padding: '0.4rem 1rem', width: '250px', backgroundImage: 'none', fontSize: '0.8rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                  onClick={() => fetchInventory(contractInstance)}
                >
                  🔄 Refrescar Stock
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem', width: '50px' }}>#</th>
                      <th style={{ padding: '1rem', width: '120px' }}>ID SERIAL</th>
                      <th style={{ padding: '1rem', width: '120px' }}>HASH ACTIVO</th>
                      <th style={{ padding: '1rem' }}>RECURSO</th>
                      <th style={{ padding: '1rem' }}>ESTADO</th>
                      <th style={{ padding: '1rem' }}>CAPACIDAD/CONSUMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                          Esperando sincronización de inventario...
                        </td>
                      </tr>
                    ) : (
                      inventory
                        .filter(item =>
                          item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.serialId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.hash.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((item, index) => (
                          <tr key={item.hash} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem', color: '#666' }}>{index + 1}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{item.serialId}</span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <code style={{ fontSize: '0.75rem', color: '#444' }}>
                                {item.hash.substring(0, 10)}...
                              </code>
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.descripcion}</td>
                            <td style={{ padding: '1rem' }}>
                              <span className="status-badge" style={{
                                padding: '0.2rem 0.6rem',
                                fontSize: '0.7rem',
                                background: item.estado === 0 ? 'rgba(0,255,0,0.1)' : 'rgba(255,165,0,0.1)',
                                color: item.estado === 0 ? '#4caf50' : '#ff9800'
                              }}>
                                {item.estado === 0 ? 'DISPONIBLE' : 'EN OPERACIÓN'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                              {item.consumo > 0 ? `${item.consumo} ml/h` : 'Manual / Herramienta'}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isJefeEscena && (
            <div className="card" style={{ borderColor: 'var(--accent-color)', borderStyle: 'dashed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2>Operaciones de Campo (Jefe de Escena)</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Apertura y seguimiento de incidentes activos. Genere bitácoras de combate directamente en la red.
                  </p>
                </div>
                <div className="badge-role" style={{ background: 'rgba(255, 111, 0, 0.2)' }}>
                  👨‍🚒 JEFE DE ESCENA
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
                <div>
                  <label className="skin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>COORDENADAS (LAT, LON)</label>
                  <input
                    type="text"
                    className="skin-select"
                    style={{ width: '100%', padding: '0.8rem', backgroundImage: 'none' }}
                    placeholder="-1.023, -78.456"
                    value={fireCoords}
                    onChange={(e) => setFireCoords(e.target.value)}
                  />
                </div>
                <div>
                  <label className="skin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>NIVEL DE RIESGO</label>
                  <select
                    className="skin-select"
                    style={{ width: '100%', padding: '0.8rem' }}
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(Number(e.target.value))}
                  >
                    <option value="1">1 - Bajo</option>
                    <option value="2">2 - Moderado</option>
                    <option value="3">3 - Alto</option>
                    <option value="4">4 - Crítico</option>
                    <option value="5">5 - Catastrófico</option>
                  </select>
                </div>
                <button
                  className="btn"
                  onClick={abrirIncidente}
                  disabled={loading}
                  style={{ padding: '0.8rem' }}
                >
                  {loading ? <span className="spin">⏳</span> : <span>📡</span>}
                  Desplegar Incidente
                </button>
              </div>
            </div>
          )}

          {isJefeEscena && incidents.length > 0 && (
            <div className="card">
              <h2>Incidentes Activos en Tablero</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {incidents.map((fire) => (
                  <div key={fire.id} className="status-badge" style={{ justifyContent: 'space-between', padding: '1.2rem', background: 'var(--bg-primary)' }}>
                    <div>
                      <span style={{ fontWeight: '800', color: 'var(--accent-color)' }}>ID-INC{fire.id.padStart(3, '0')}</span>
                      <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                      <span>📍 {fire.coords}</span>
                      <span style={{ margin: '0 1rem', color: '#666' }}>|</span>
                      <span style={{ color: fire.riesgo > 3 ? '#ff3232' : 'var(--text-secondary)' }}>
                        ⚠ Riesgo: {fire.riesgo}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setSelectedIncident(fire)
                        setCurrentView('tactical')
                      }}
                    >
                      🚀 PANEL DE CONTROL
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2>Estado del Sistema de Monitoreo</h2>
            <div className="status-badge">
              <span className="status-dot"></span>
              <span>NODO LOCAL: 31337</span>
            </div>
            {account && (
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Sesión activa: <code style={{ color: 'var(--accent-color)' }}>{account}</code>
              </div>
            )}
          </div>
        </main>
      ) : (
        <TacticalPanel
          eventoId={selectedIncident.id}
          coordenadas={selectedIncident.coords}
          contract={contractInstance}
          onBack={() => setCurrentView('inventory')}
        />
      )}

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '1px' }}>
          FIREOPS v1.1 • Web3 Ecosystem
        </p>
      </footer>
    </div>
  )
}

export default App
