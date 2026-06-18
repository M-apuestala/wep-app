import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TicketHipismo from './TicketHipismo.jsx';
import TicketHipismoPrint from './TicketHipismoPrint.jsx';
import { supabase } from './supabaseClient.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Dashboard = () => {
  const [datosTicket, setDatosTicket] = useState({ qr: '', magnetico: '', nfc: '' });
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState({ tipo: '', texto: '' });

  const bufferMagnetico = useRef('');
  const ultimoKeypressTime = useRef(0);

  const mostrarFeedback = (tipo, texto) => {
    setMensajeEstado({ tipo, texto });
    setTimeout(() => setMensajeEstado({ tipo: '', texto: '' }), 4000);
  };

  useEffect(() => {
    const manejarKeydownGlobal = (e) => {
      const ahora = Date.now();

      if (ahora - ultimoKeypressTime.current > 50) {
        bufferMagnetico.current = '';
      }
      ultimoKeypressTime.current = ahora;

      if (e.key === 'Enter') {
        if (bufferMagnetico.current.length > 0) {
          setDatosTicket(prev => ({ ...prev, magnetico: bufferMagnetico.current }));
          mostrarFeedback('success', '💳 Tarjeta magnética leída con éxito');
          bufferMagnetico.current = '';
        }
      } else if (e.key.length === 1) {
        bufferMagnetico.current += e.key;
      }
    };

    window.addEventListener('keydown', manejarKeydownGlobal);
    return () => window.removeEventListener('keydown', manejarKeydownGlobal);
  }, []);

  useEffect(() => {
    let scanner = null;

    if (escaneandoQR) {
      scanner = new Html5QrcodeScanner('lector-qr', {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0]
      }, false);

      scanner.render(
        (textoDecodificado) => {
          setDatosTicket(prev => ({ ...prev, qr: textoDecodificado }));
          mostrarFeedback('success', '📷 Código QR escaneado con éxito');
          setEscaneandoQR(false);
          scanner.clear();
        },
        (error) => {
          console.debug('Buscando QR...', error);
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error('Error destruyendo scanner', err));
      }
    };
  }, [escaneandoQR]);

  const procesarEImprimirTicket = async () => {
    if (!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc) {
      mostrarFeedback('error', '⚠️ No hay datos capturados para generar un ticket.');
      return;
    }

    if (!supabase) {
      mostrarFeedback('error', '❌ Supabase no está configurado correctamente en el despliegue. Verifica las variables de entorno.');
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase.from('tickets').insert([{
        qr_data: datosTicket.qr || null,
        magnetic_data: datosTicket.magnetico || null,
        nfc_data: datosTicket.nfc || null
      }]);

      if (error) throw error;
      mostrarFeedback('success', '💾 Sincronizado con Supabase. Imprimiendo...');
      setTimeout(() => window.print(), 300);
    } catch (err) {
      console.error(err);
      mostrarFeedback('error', '❌ Fallo en base de datos: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormulario = () => {
    setDatosTicket({ qr: '', magnetico: '', nfc: '' });
    mostrarFeedback('info', 'Formulario reiniciado');
  };

  return (
    <div className="app-root">
      <div className="topbar">
        <div className="topbar-left">
          <div>
            <p className="eyebrow">Deploy 12</p>
            <h1 className="title">Apuestala POS Dashboard</h1>
          </div>
        </div>

        <div className="topbar-right">
          <div className="status-pill">
            <span className="status-dot" /> Conectado
          </div>
          <button
            type="button"
            className="pill-button"
            onClick={() => window.open('/#/print/ticket-hipico', '_blank')}
          >
            Abrir Ticket Hípico (Imprimir)
          </button>
        </div>
      </div>

      <main className="main-content">
        <div className="header-row">
          <div>
            <p className="eyebrow">Panel central</p>
            <h2 className="headline">Mantén el frontend del deploy 12 y sigue trabajando con tus tickets.</h2>
          </div>
          <div className="header-actions">
            <button className="pill-button" type="button" onClick={() => setEscaneandoQR(true)}>
              Escanear QR
            </button>
            <button className="pill-button" type="button" onClick={limpiarFormulario}>
              Reiniciar datos
            </button>
          </div>
        </div>

        {mensajeEstado.texto && (
          <div className="bento-card small-card">
            <p>{mensajeEstado.texto}</p>
          </div>
        )}

        <div className="grid-layout">
          <div className="grid-left">
            <section className="bento-card big-card">
              <p className="eyebrow">Terminal POS</p>
              <div className="stats-card">
                <p><strong>QR capturado:</strong> {datosTicket.qr || 'Ninguno'}</p>
                <p><strong>Banda magnética:</strong> {datosTicket.magnetico || 'Ninguna'}</p>
                <p><strong>Tag NFC:</strong> {datosTicket.nfc || 'Ninguno'}</p>
              </div>

              <div className="header-actions" style={{ marginTop: '20px', gap: '12px', flexWrap: 'wrap' }}>
                <button className="pill-button" type="button" onClick={() => window.open('/#/print/ticket-hipico', '_blank')}>
                  Ticket Hípico (Imprimir)
                </button>
                <button className="pill-button" type="button" onClick={procesarEImprimirTicket} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Imprimir ticket'}
                </button>
              </div>
            </section>

            <section className="bento-card small-card">
              <p className="eyebrow">Escáner QR</p>
              {escaneandoQR ? (
                <div id="lector-qr" style={{ minHeight: '260px', borderRadius: '20px', overflow: 'hidden' }} />
              ) : (
                <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                  Pulsa el botón para iniciar la cámara y leer el QR.
                </p>
              )}
            </section>

            <section className="bento-card small-card">
              <p className="eyebrow">Tag NFC</p>
              <input
                type="text"
                placeholder="Acerca o escribe el tag NFC"
                value={datosTicket.nfc}
                onChange={(e) => setDatosTicket(prev => ({ ...prev, nfc: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(170, 137, 135, 0.2)',
                  background: 'rgba(30, 16, 15, 0.9)',
                  color: 'inherit',
                  marginTop: '12px'
                }}
              />
            </section>
          </div>

          <aside className="grid-right">
            <section className="bento-card stats-card">
              <p className="eyebrow">Indicadores</p>
              <div style={{ display: 'grid', gap: '16px', marginTop: '18px' }}>
                <div className="bento-card small-card" style={{ padding: '18px' }}>
                  <p className="eyebrow">Estado</p>
                  <p>Supabase: conectado</p>
                </div>
                <div className="bento-card small-card" style={{ padding: '18px' }}>
                  <p className="eyebrow">Tickets hoy</p>
                  <p>{datosTicket.qr || datosTicket.magnetico || datosTicket.nfc ? '1+' : '0'}</p>
                </div>
              </div>
            </section>

            <section className="bento-card small-card">
              <p className="eyebrow">Estado</p>
              <div style={{ minHeight: '120px', padding: '16px', border: '1px solid rgba(170, 137, 135, 0.15)', borderRadius: '18px', color: 'var(--text-muted)' }}>
                {mensajeEstado.texto || 'Aquí aparecerán los avisos rápidos del sistema.'}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/ticket-hipico" element={<TicketHipismo />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
