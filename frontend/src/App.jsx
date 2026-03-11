import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import Papa from 'papaparse'
import './index.css'
import trazabilidadAbi from './contracts/TrazabilidadLogistica.json'

const CONTRACT_ADDRESS = "0x84ea74d481ee0a5332c457a4d796187f6ba67feb"

function App() {
  const [skin, setSkin] = useState('forest-fire')
  const [account, setAccount] = useState(null)
  const [isBaseOperativa, setIsBaseOperativa] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [runtimeError, setRuntimeError] = useState(null)
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

      const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi, provider)
      const role = await contract.BASE_OPERATIVA_ROLE()
      const hasRole = await contract.hasRole(role, address)
      setIsBaseOperativa(hasRole)

      if (!hasRole) {
        setStatus({ type: 'warning', message: 'Conectado, pero sin rol de Base Operativa.' })
      } else {
        setStatus({ type: 'success', message: 'Sistema sincronizado. Rol verificado.' })
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

          results.data.forEach(row => {
            if (row.codigo && row.descripcion) {
              codigos.push(ethers.keccak256(ethers.toUtf8Bytes(row.codigo)))
              descripciones.push(row.descripcion)
              consumos.push(BigInt(row.consumo || 0))
            }
          })

          if (codigos.length === 0) throw new Error('CSV inválido.')

          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const contract = new ethers.Contract(CONTRACT_ADDRESS, trazabilidadAbi, signer)

          const tx = await contract.registrarInsumosBatch(codigos, descripciones, consumos)
          setStatus({ type: 'info', message: 'Esperando confirmación...' })
          const receipt = await tx.wait()

          const eventFragment = contract.interface.getEvent("InsumoRegistrado")
          const topic = eventFragment.topicHash
          const registrosExitosos = receipt.logs.filter(log => log.topics[0] === topic).length
          const duplicados = codigos.length - registrosExitosos

          if (duplicados > 0) {
            setStatus({
              type: 'success',
              message: `Éxito: ${registrosExitosos} nuevos (${duplicados} omitidos).`
            })
          } else {
            setStatus({
              type: 'success',
              message: `Éxito: ${registrosExitosos} procesados.`
            })
          }
        } catch (error) {
          console.error(error)
          setStatus({ type: 'error', message: 'Error en la subida.' })
        } finally {
          setLoading(false)
          event.target.value = ''
        }
      }
    })
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

        <div className="card">
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
              href="/inventario_semilla.csv"
              className="btn btn-secondary"
              download
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}
            >
              📥 Descargar Semilla CSV
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

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '1px' }}>
          FIREOPS v1.1 • Web3 Ecosystem
        </p>
      </footer>
    </div>
  )
}

export default App
