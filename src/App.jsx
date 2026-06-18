import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TicketHipismo from './TicketHipismo.jsx';
import TicketHipismoPrint from './TicketHipismoPrint.jsx';
import TicketPreview from './TicketPreview.jsx';
import { supabase, isSupabaseConfigured, getSupabaseSummary, testSupabaseConnection, saveTicket } from './supabaseClient.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Dashboard = () => {
  const [datosTicket, setDatosTicket] = useState({ qr: '', magnetico: '', nfc: '' });
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState({ tipo: '', texto: '' });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [apuestaPreview, setApuestaPreview] = useState({ ticketId: 'A987654321', fecha: '18/06/2026', hora: '17:05', taquilla: 'TQ-04', hipodromo: 'LA RINCONADA', carrera: '5', tipo: 'GANADOR', ejemplar: '#04 PAPÁ PEDRO', monto: '10.00', premio: '35.00', codigoControl: 'X89J-23LK-P90W' });
  const [supabaseStatus, setSupabaseStatus] = useState({ ok: false, detail: null });

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveIntervalMs, setAutoSaveIntervalMs] = useState(10000);
  const [isDirty, setIsDirty] = useState(false);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState(null);

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

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await testSupabaseConnection();
        if (mounted) setSupabaseStatus({ ok: !!res.ok, detail: res.error || null });
      } catch (e) {
        if (mounted) setSupabaseStatus({ ok: false, detail: e.message || String(e) });
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // mark dirty when inputs change
  useEffect(() => {
    const has = !!(datosTicket.qr || datosTicket.magnetico || datosTicket.nfc);
    if (has) setIsDirty(true);
  }, [datosTicket.qr, datosTicket.magnetico, datosTicket.nfc]);

  // background auto-save interval
  useEffect(() => {
    if (!autoSaveEnabled) return;
    let mounted = true;
    const id = setInterval(async () => {
      if (!mounted) return;
      if (!isDirty) return;
      if (!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc) return;
      const controlCode = `C-${Date.now().toString(36).toUpperCase().slice(-8)}`;
      const ticketObj = {
        ticketId: `A${Math.floor(Math.random() * 900000000) + 100000000}`,
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        taquilla: 'TQ-01',
        hipodromo: 'LA RINCONADA',
        carrera: '1',
        tipo: 'AUTOSAVE',
        ejemplar: datosTicket.qr || datosTicket.magnetico || datosTicket.nfc || 'N/D',
        monto: '10.00',
        premio: '0.00',
        codigoControl: controlCode
      };

      try {
        const saveRes = await saveTicket({
          qr_data: datosTicket.qr || null,
          magnetic_data: datosTicket.magnetico || null,
          nfc_data: datosTicket.nfc || null,
          control_code: controlCode
        });
        if (saveRes.ok) {
          try { sessionStorage.setItem('lastPrintedTicket', JSON.stringify(ticketObj)); } catch (e) { console.warn('sessionStorage write failed', e); }
          setApuestaPreview(ticketObj);
          setIsDirty(false);
          setLastAutoSaveAt(new Date().toISOString());
          mostrarFeedback('info', `Auto-guardado (${saveRes.source})`);
        } else {
          mostrarFeedback('error', 'Auto-guardado falló: ' + (saveRes.error || ''));
        }
      } catch (e) {
        console.error('Auto-save error', e);
        mostrarFeedback('error', 'Auto-guardado excepción');
      }
    }, autoSaveIntervalMs);

    return () => { mounted = false; clearInterval(id); };
  }, [autoSaveEnabled, autoSaveIntervalMs, isDirty, datosTicket]);

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
      const controlCode = `C-${Date.now().toString(36).toUpperCase().slice(-8)}`;
      const ticketObj = {
        ticketId: `A${Math.floor(Math.random() * 900000000) + 100000000}`,
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        taquilla: 'TQ-01',
        hipodromo: 'LA RINCONADA',
        carrera: '1',
        tipo: 'COMBINADA',
        ejemplar: datosTicket.qr || datosTicket.magnetico || datosTicket.nfc || 'N/D',
        monto: '10.00',
        premio: '0.00',
        codigoControl: controlCode
      };

      const saveRes = await saveTicket({
        qr_data: datosTicket.qr || null,
        magnetic_data: datosTicket.magnetico || null,
        nfc_data: datosTicket.nfc || null,
        control_code: controlCode
      });

      if (!saveRes.ok) throw new Error(saveRes.error || 'save failed');

      // store ticket for the print route to consume
      try { sessionStorage.setItem('lastPrintedTicket', JSON.stringify(ticketObj)); } catch (e) { console.warn('sessionStorage write failed', e); }

      mostrarFeedback('success', `💾 Ticket guardado (${saveRes.source}). Abriendo impresión...`);
      // open print route in a new tab which will auto-call window.print()
      window.open('/#/print/ticket-hipico', '_blank');
    } catch (err) {
      console.error(err);
      mostrarFeedback('error', '❌ Fallo en base de datos: ' + (err.message || String(err)));
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormulario = () => {
    setDatosTicket({ qr: '', magnetico: '', nfc: '' });
    mostrarFeedback('info', 'Formulario reiniciado');
  };

  const handlePreviewPrint = (apuesta) => {
    // Open a minimal print window containing the preview content
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket Hípico</title>
          <style>
            body { font-family: Courier, monospace; margin: 0; padding: 6mm 4mm; }
            .ticket { width: 54mm; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div style="text-align:center;font-weight:700;">BANCA LA REFORMA</div>
            <div style="text-align:center;">- Apuestas Hípicas -</div>
            <hr/>
            <div>Ticket: ${apuesta.ticketId}</div>
            <div>Fecha: ${apuesta.fecha} Hora: ${apuesta.hora}</div>
            <div>Taquilla: ${apuesta.taquilla}</div>
            <div>--------------------------------</div>
            <div style="font-weight:700">HIPÓDROMO: ${apuesta.hipodromo}</div>
            <div>Carrera: ${apuesta.carrera} | Tipo: ${apuesta.tipo}</div>
            <div>Ejemplar: ${apuesta.ejemplar}</div>
            <div>--------------------------------</div>
            <div style="display:flex;justify-content:space-between;"><span>Monto:</span><span>$${apuesta.monto}</span></div>
            <div style="text-align:center;margin-top:8px;">CÓDIGO: ${apuesta.codigoControl}</div>
          </div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      mostrarFeedback('error', '❌ Bloqueador de popups bloqueó la ventana de impresión.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // give it a moment to render resources
    setTimeout(() => {
      w.focus();
      w.print();
    }, 400);
  };

  const preSaveAndOpenPreview = async () => {
    if (!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc) {
      mostrarFeedback('error', '⚠️ No hay datos capturados para generar un ticket.');
      return;
    }

    if (!supabase) {
      mostrarFeedback('error', '❌ Supabase no está configurado. No se puede guardar el ticket.');
      return;
    }

    setGuardando(true);
    try {
      const controlCode = `C-${Date.now().toString(36).toUpperCase().slice(-8)}`;
      const ticketObj = {
        ticketId: `A${Math.floor(Math.random() * 900000000) + 100000000}`,
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        taquilla: 'TQ-01',
        hipodromo: 'LA RINCONADA',
        carrera: '1',
        tipo: 'PREVIEW',
        ejemplar: datosTicket.qr || datosTicket.magnetico || datosTicket.nfc || 'N/D',
        monto: '10.00',
        premio: '0.00',
        codigoControl: controlCode
      };

      const saveRes = await saveTicket({
        qr_data: datosTicket.qr || null,
        magnetic_data: datosTicket.magnetico || null,
        nfc_data: datosTicket.nfc || null,
        control_code: controlCode
      });

      if (!saveRes.ok) throw new Error(saveRes.error || 'save failed');

      try { sessionStorage.setItem('lastPrintedTicket', JSON.stringify(ticketObj)); } catch (e) { console.warn('sessionStorage write failed', e); }
      setApuestaPreview(ticketObj);
      setPreviewOpen(true);
      mostrarFeedback('success', `💾 Ticket guardado (${saveRes.source}). Abriendo vista previa...`);
    } catch (err) {
      console.error(err);
      mostrarFeedback('error', '❌ Error guardando ticket: ' + (err.message || String(err)));
    } finally {
      setGuardando(false);
    }
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
              <span className="status-dot" style={{ background: supabaseStatus.ok ? '#34d399' : '#f97316' }} /> {supabaseStatus.ok ? 'Supabase: conectado' : 'Supabase: NO conectado'}
              <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.9 }}>{autoSaveEnabled ? `Auto-save: ON${lastAutoSaveAt ? ' • ' + new Date(lastAutoSaveAt).toLocaleTimeString() : ''}` : 'Auto-save: OFF'}</span>
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
                {(() => {
                  const hasCaptured = !!(datosTicket.qr || datosTicket.magnetico || datosTicket.nfc);
                  return (
                    <>
                      <button className="pill-button" type="button" onClick={preSaveAndOpenPreview} disabled={!hasCaptured}>
                        Vista previa
                      </button>
                      <button className="pill-button" type="button" onClick={() => window.open('/#/print/ticket-hipico', '_blank')} disabled={!hasCaptured}>
                        Ticket Hípico (Imprimir)
                      </button>
                      <button className="pill-button" type="button" onClick={procesarEImprimirTicket} disabled={guardando || !hasCaptured}>
                        {guardando ? 'Guardando...' : 'Imprimir ticket'}
                      </button>
                    </>
                  );
                })()}
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
                  <p>{supabaseStatus.ok ? 'Supabase conectado' : `Supabase ERROR: ${supabaseStatus.detail || 'sin respuesta'}`}</p>
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
      {previewOpen && (
        <TicketPreview
          apuesta={apuestaPreview}
          onClose={() => setPreviewOpen(false)}
          onPrint={() => { handlePreviewPrint(apuestaPreview); setPreviewOpen(false); }}
        />
      )}
    </div>
  );
};

const App = () => (
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/print/ticket-hipico" element={<TicketHipismoPrint />} />
    <Route path="/ticket-hipico" element={<TicketHipismo />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
