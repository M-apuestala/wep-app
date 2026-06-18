import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const App = () => {
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
          setDatosTicket((prev) => ({ ...prev, magnetico: bufferMagnetico.current }));
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
      scanner = new Html5QrcodeScanner(
        'lector-qr',
        {
          fps: 12,
          qrbox: { width: 220, height: 220 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (textoDecodificado) => {
          setDatosTicket((prev) => ({ ...prev, qr: textoDecodificado }));
          mostrarFeedback('success', '📷 Código QR escaneado con éxito');
          setEscaneandoQR(false);
          scanner.clear();
        },
        () => {
          // Lectura en progreso
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => null);
      }
    };
  }, [escaneandoQR]);

  const procesarEImprimirTicket = async () => {
    if (!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc) {
      mostrarFeedback('error', '⚠️ No hay datos capturados para generar un ticket.');
      return;
    }

    if (!supabase) {
      mostrarFeedback('error', '❌ Supabase no está configurado. Verifica las variables de entorno.');
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase.from('tickets').insert([
        {
          qr_data: datosTicket.qr || null,
          magnetic_data: datosTicket.magnetico || null,
          nfc_data: datosTicket.nfc || null,
        },
      ]);

      if (error) throw error;

      mostrarFeedback('success', '💾 Registro enviado a Supabase. Preparando impresión...');
      setTimeout(() => {
        window.print();
      }, 250);
    } catch (err) {
      console.error(err);
      mostrarFeedback('error', '❌ Error al guardar: ' + err.message);
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
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="title">Dashboard Central</h1>
          <span className="badge">WEB APP MODE</span>
        </div>
        <div className="topbar-right">
          <div className="status-pill">
            <span className="status-dot" />
            Sincronizado
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="hero-logo">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBby3qyaYen6cS0lvzOxw9CXesT7C1sKKgCRNXaaBnv243dAr7rUtkCQHYVp-7SWCWfZ4hNXzlQ-x5smEdKY9EssXWFAfCOEToahQAQSYlzdgNRw4yO_MTwgA_mzBpmgKxVaNLlOnH8nMQD5IcsdIGSQ4bZgjcBveUJ8xyZP1BaGqhLdTtXQ89SeuAL6cVMvPzFYgCMRMqaex9dQ-oIyDYMBfmtvn2kwSbrpXePFO-wcB7RpmEzsZoTzPv5ZriHqs3xs1aEScQ4RUw5"
            alt="Apuestala Logo"
            className="hero-logo-img"
          />
        </div>

        <section className="header-row">
          <div>
            <p className="eyebrow">Gestión de Apuestas</p>
            <h2 className="headline">Terminal Inteligente POS</h2>
          </div>
          <div className="header-actions">
            <button type="button" className="pill-button">
              <span className="material-symbols-outlined">history</span>
              Historial
            </button>
            <button type="button" className="pill-button">
              <span className="material-symbols-outlined">refresh</span>
              Refrescar
            </button>
          </div>
        </section>

        {mensajeEstado.texto && (
          <div className={`toast ${mensajeEstado.tipo}`}>
            {mensajeEstado.texto}
          </div>
        )}

        <div className="grid-layout">
          <div className="grid-left">
            <section className="bento-card big-card">
              <div className="module-heading">
                <div>
                  <p className="module-label">Validación de Tickets QR</p>
                  <h3 className="module-title">Escaneo y confirmación automática</h3>
                </div>
                <div className="icon-badge">
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                </div>
              </div>
              <p className="module-copy">
                Utilice la cámara integrada para el escaneo instantáneo de apuestas. El sistema procesará automáticamente el identificador del ticket para validación o pago.
              </p>
              <div className="scanner-card">
                <div className="scanner-stage">
                  {escaneandoQR ? (
                    <div id="lector-qr" className="scanner-view" />
                  ) : (
                    <div className="scanner-placeholder">
                      <span className="material-symbols-outlined scanner-icon">center_focus_strong</span>
                      <p>Esperando señal...</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEscaneandoQR((prev) => !prev)}
                  className={escaneandoQR ? 'secondary-action' : 'primary-action'}
                >
                  <span className="material-symbols-outlined">videocam</span>
                  {escaneandoQR ? 'DETENER ESCÁNER' : 'ACTIVAR ESCÁNER'}
                </button>
              </div>
            </section>

            <section className="action-row">
              <button
                type="button"
                disabled={guardando}
                onClick={procesarEImprimirTicket}
                className="gold-shimmer action-primary"
              >
                <span className="material-symbols-outlined">print_connect</span>
                PROCESAR E IMPRIMIR COMPROBANTE
              </button>
              <button type="button" onClick={limpiarFormulario} className="action-secondary">
                <span className="material-symbols-outlined">delete_sweep</span>
                LIMPIAR
              </button>
            </section>
          </div>

          <aside className="grid-right">
            <section className="bento-card small-card">
              <div className="module-heading">
                <div>
                  <p className="module-label">Lector de Banda</p>
                  <h3 className="module-title small">Monitoreo magnético</h3>
                </div>
                <div className="icon-badge">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
              </div>
              <div className="status-card">
                <div className="status-icon">
                  <span className="material-symbols-outlined">swipe_vertical</span>
                </div>
                <p className="status-copy">
                  Deslice la tarjeta por el canal lateral del dispositivo para iniciar cobro.
                </p>
              </div>
              <div className="status-footer">
                <span className="module-label">Estado del Lector</span>
                <span className="status-badge">{datosTicket.magnetico ? 'LEÍDO' : 'LISTO'}</span>
              </div>
            </section>

            <section className="bento-card small-card">
              <div className="module-heading">
                <div>
                  <p className="module-label">Procesador NFC</p>
                  <h3 className="module-title small">Tag NFC / UID</h3>
                </div>
                <div className="icon-badge">
                  <span className="material-symbols-outlined">contactless</span>
                </div>
              </div>
              <div className="field-group">
                <input
                  type="text"
                  placeholder="ID de Tag NFC o escaneo..."
                  value={datosTicket.nfc}
                  onChange={(e) => setDatosTicket((prev) => ({ ...prev, nfc: e.target.value }))}
                />
                <span className="material-symbols-outlined field-icon">sensors</span>
              </div>
              <p className="hint-text">
                Compatible con chips NTAG213-216. El sistema detecta el acercamiento automáticamente.
              </p>
            </section>

            <section className="stats-card">
              <h4 className="stats-label">Rendimiento de Sesión</h4>
              <div className="stats-item">
                <span>Operaciones</span>
                <strong>142 tickets</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" />
              </div>
              <div className="stats-meta">
                <span>Cuota diaria</span>
                <span>75% completado</span>
              </div>
            </section>
          </aside>
        </div>

        <footer className="page-footer">
          <p>Apuestala Web Dashboard • Enterprise Secure Portal • Terminal #402-A9</p>
        </footer>
      </main>

      <div className="print-ticket" id="ticket-termico-54mm">
        <div className="ticket-header">
          <p className="ticket-title">COMPROBANTE POS</p>
          <p>SISTEMA CENTRALIZADO</p>
          <p className="ticket-small">{new Date().toLocaleString()}</p>
        </div>
        <div className="ticket-divider">--------------------------------</div>
        {datosTicket.qr && (
          <div className="ticket-section">
            <p className="ticket-label">[LECTURA QR]</p>
            <p className="ticket-text">{datosTicket.qr}</p>
          </div>
        )}
        {datosTicket.magnetico && (
          <div className="ticket-section">
            <p className="ticket-label">[BANDA MAGNÉTICA]</p>
            <p className="ticket-text">{datosTicket.magnetico}</p>
          </div>
        )}
        {datosTicket.nfc && (
          <div className="ticket-section">
            <p className="ticket-label">[ID TAG NFC]</p>
            <p className="ticket-text">{datosTicket.nfc}</p>
          </div>
        )}
        {!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc && (
          <p className="ticket-center">TICKET EN BLANCO - SIN DATOS</p>
        )}
        <div className="ticket-divider">--------------------------------</div>
        <div className="ticket-footer">
          <p>REGISTRO EXITOSO EN CLOUD</p>
          <p>PROCESADO OK</p>
          <p className="ticket-spacer">. . . . . . . . . . . . . . . .</p>
        </div>
      </div>
    </div>
  );
};

export default App;
