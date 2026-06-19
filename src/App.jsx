import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TicketHipismo from './TicketHipismo.jsx';
import TicketHipismoPrint from './TicketHipismoPrint.jsx';
import TicketPreview from './TicketPreview.jsx';
import { supabase, isSupabaseConfigured, getSupabaseSummary, testSupabaseConnection, saveTicket, initSupabase, getCurrentConfig, clearSupabaseConfig } from './supabaseClient.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Dashboard = () => {
  const [datosTicket, setDatosTicket] = useState({ qr: '', magnetico: '', nfc: '' });
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [rotate90, setRotate90] = useState(false);
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
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState('');

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
    let mounted = true;

    const startScanner = async () => {
      try {
        console.log('[QR] iniciando scanner...');
        mostrarFeedback('info', 'Iniciando cámara...');
        const container = document.getElementById('lector-qr');
        if (!container) {
          mostrarFeedback('error', 'Contenedor del lector no encontrado');
          return;
        }
        // ensure container is empty
        container.innerHTML = '';

        scanner = new Html5QrcodeScanner('lector-qr', {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          rememberLastUsedCamera: true
        }, false);

        scanner.render(
          (textoDecodificado) => {
            if (!mounted) return;
            console.log('[QR] decodificado:', textoDecodificado);
            setDatosTicket(prev => ({ ...prev, qr: textoDecodificado }));
            mostrarFeedback('success', '📷 Código QR escaneado con éxito');
            setEscaneandoQR(false);
            try { scanner.clear(); } catch (e) { /* ignore */ }
          },
          (error) => {
            console.debug('[QR] buscando...', error);
          }
        );
      } catch (err) {
        console.error('[QR] error iniciando scanner', err);
        mostrarFeedback('error', 'Error iniciando cámara: ' + (err.message || String(err)));
      }
    };

    if (escaneandoQR) startScanner();

    return () => {
      mounted = false;
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

    // initialize inputs from current config
    try {
      const cfg = getCurrentConfig();
      if (cfg) {
        setSupabaseUrlInput(cfg.url || '');
        setSupabaseKeyInput(''); // don't prefill secret
      }
    } catch (e) {}

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
            @page { size: A4 portrait; margin: 0; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
            body { font-family: Courier, monospace; margin: 0; padding: 0; background: #fff; }
            .ticket { width: 100%; height: 100%; box-sizing: border-box; padding: 22mm 18mm; display: flex; flex-direction: column; justify-content: space-between; }
            .logo { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-bottom: 18mm; }
            .logo-mark { width: 120px; height: 120px; border-radius: 18px; background: #0f172a; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 28px; letter-spacing: 0.08em; }
            .logo-text { text-align: center; }
            .logo-text h1 { margin: 0; font-size: 54px; letter-spacing: 0.09em; }
            .logo-text p { margin: 8px 0 0; font-size: 22px; letter-spacing: 0.16em; }
            .details { width: 100%; display: grid; gap: 18px; font-size: 20pt; line-height: 1.5; max-width: 72%; margin: 0 auto; }
            .details .row { display: flex; justify-content: space-between; }
            .divider { border-bottom: 1px solid #000; margin: 16px 0; }
            .footer { text-align: center; margin-top: 18mm; font-size: 14pt; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="logo">
              <svg width="76" height="76" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Logo Apuestala">
                <rect width="120" height="120" rx="24" fill="#0f172a" />
                <path d="M34 42L60 82L86 42" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M44 62L60 42L76 62" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="logo-text">
                <h1 style="font-size: 62px;">APUESTALA</h1>
                <p style="font-size: 26px;">BANCA LA REFORMA</p>
              </div>
            </div>
            <div style="text-align:center; margin-bottom: 16mm; font-size: 44px; font-weight: 900;">TICKET HÍPICO</div>
            <div style="font-size: 26px; color: #333; margin-top: 6px;">Formato A4 completo y de gran tamaño</div>
          </div>
          <div class="details" style="font-size: 22pt; gap: 18px; max-width: 72%; margin: 0 auto;">
              <div class="row" style="font-size: 26pt;"><span>Ticket:</span><span>${apuesta.ticketId}</span></div>
              <div class="row" style="font-size: 24pt;"><span>Fecha:</span><span>${apuesta.fecha} ${apuesta.hora}</span></div>
              <div class="row" style="font-size: 24pt;"><span>Taquilla:</span><span>${apuesta.taquilla}</span></div>
              <div class="divider"></div>
              <div class="row" style="font-weight:700; font-size: 26pt;"><span>HIPÓDROMO:</span><span>${apuesta.hipodromo}</span></div>
              <div class="divider" style="border-style:dashed;"></div>
              <div class="row" style="font-size: 24pt;"><span>Carrera:</span><span>${apuesta.carrera}</span></div>
              <div class="row" style="font-size: 24pt;"><span>Tipo:</span><span>${apuesta.tipo}</span></div>
              <div class="row" style="font-size: 24pt;"><span>Ejemplar:</span><span>${apuesta.ejemplar}</span></div>
              <div class="divider"></div>
              <div class="row" style="font-size: 34pt; font-weight: 900;"><span>Monto:</span><span>$${apuesta.monto}</span></div>
            </div>
            <div style="text-align:center; margin-top: auto;">
              <div style="font-size: 22px; font-weight: 900;">CÓDIGO DE CONTROL</div>
              <div style="margin: 14px 0 0; font-size: 28pt; font-weight: 900;">*${apuesta.codigoControl}*</div>
            </div>
            <div class="footer">
              <div>* Caduca en 30 días.</div>
              <div>* Revise su ticket. No se aceptan reclamos posteriores.</div>
              <div>================================</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const w = window.open('', '_blank', 'width=1000,height=800');
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
      <header className="app-header">
        <div>
          <p className="eyebrow">Apuestala POS</p>
          <h1 className="app-title">Dashboard central</h1>
        </div>
        <div className="header-meta">
          <span className="status-badge">WEB APP MODE</span>
          <div className="status-chip">
            <span className="status-dot" />
            {supabaseStatus.ok ? 'Sincronizado' : `Sincronizado: ${supabaseStatus.detail || 'sin respuesta'}`}
          </div>
        </div>
      </header>

      <main className="page-shell">
        <div className="hero-top-centered">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBby3qyaYen6cS0lvzOxw9CXesT7C1sKKgCRNXaaBnv243dAr7rUtkCQHYVp-7SWCWfZ4hNXzlQ-x5smEdKY9EssXWFAfCOEToahQAQSYlzdgNRw4yO_MTwgA_mzBpmgKxVaNLlOnH8nMQD5IcsdIGSQ4bZgjcBveUJ8xyZP1BaGqhLdTtXQ89SeuAL6cVMvPzFYgCMRMqaex9dQ-oIyDYMBfmtvn2kwSbrpXePFO-wcB7RpmEzsZoTzPv5ZriHqs3xs1aEScQ4RUw5" alt="Apuestala Logo" className="hero-logo" />
        </div>
        <section className="hero-card">
          <div className="hero-card-top">
            <div>
              <p className="eyebrow">Gestión de apuestas</p>
              <h2 className="hero-title">Terminal inteligente POS</h2>
            </div>
          </div>

          <div className="hero-actions">
            <button className="button-secondary" type="button" onClick={preSaveAndOpenPreview}>
              <span className="material-symbols-outlined">history</span>
              Historial
            </button>
            <button className="button-secondary" type="button" onClick={procesarEImprimirTicket}>
              <span className="material-symbols-outlined">refresh</span>
              Refrescar
            </button>
            <button className="button-secondary" type="button" onClick={() => setShowSupabaseConfig((prev) => !prev)}>
              <span className="material-symbols-outlined">storage</span>
              Supabase
            </button>
          </div>

          {showSupabaseConfig && (
            <section className="bento-card compact-card db-config-card">
              <div className="panel-heading">
                <div className="panel-icon">
                  <span className="material-symbols-outlined">storage</span>
                </div>
                <div>
                  <h4>Configuración Supabase</h4>
                </div>
              </div>
              <div className="input-group">
                <input
                  placeholder="URL de Supabase"
                  type="text"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                />
              </div>
              <div className="input-group">
                <input
                  placeholder="Anon Key de Supabase"
                  type="password"
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                />
              </div>
              <div className="db-actions">
                <button className="button-secondary" type="button" onClick={async () => {
                  if (!supabaseUrlInput || !supabaseKeyInput) {
                    mostrarFeedback('error', 'Rellena URL y Anon Key para conectar.');
                    return;
                  }
                  initSupabase(supabaseUrlInput.trim(), supabaseKeyInput.trim(), true);
                  const res = await testSupabaseConnection();
                  setSupabaseStatus({ ok: !!res.ok, detail: res.error || null });
                  if (res.ok) mostrarFeedback('success', 'Supabase conectado correctamente.');
                  else mostrarFeedback('error', 'Error al conectar: ' + (res.error || 'sin respuesta'));
                }}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Guardar y probar
                </button>
                <button className="button-outline" type="button" onClick={() => {
                  clearSupabaseConfig();
                  setSupabaseUrlInput('');
                  setSupabaseKeyInput('');
                  setSupabaseStatus({ ok: false, detail: 'configuración borrada' });
                  mostrarFeedback('info', 'Configuración de Supabase eliminada.');
                }}>
                  <span className="material-symbols-outlined">delete</span>
                  Borrar config
                </button>
              </div>
              <div className="summary-row summary-row--muted" style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                <div><strong>URL actual:</strong> {supabaseUrlInput || 'No configurada'}</div>
                <div><strong>Anon key:</strong> {supabaseKeyInput ? 'Ingresada' : 'No ingresada'}</div>
                <div><strong>Conexión:</strong> {supabaseStatus.ok ? 'Conectado' : supabaseStatus.detail || 'No conectado'}</div>
              </div>
              <div className="db-actions" style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="eyebrow" style={{ marginBottom: 10 }}>Auto-save</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className={`button-secondary ${autoSaveEnabled ? '' : 'button-outline'}`} type="button" onClick={() => setAutoSaveEnabled(true)}>
                      Activado
                    </button>
                    <button className={`button-secondary ${!autoSaveEnabled ? '' : 'button-outline'}`} type="button" onClick={() => setAutoSaveEnabled(false)}>
                      Desactivado
                    </button>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(249,220,218,0.8)' }}>Último auto-save: {lastAutoSaveAt ? new Date(lastAutoSaveAt).toLocaleTimeString() : 'Nunca'}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
          </section>

        <div className="dashboard-grid">
          <div className="dashboard-main-panel">
            <section className="bento-card card-splash">
              <div className="hero-intro">
                <div className="hero-icon">
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                </div>
                <div>
                  <h3>Validación de Tickets QR</h3>
                  <p>Escanea con la cámara integrada para validar y procesar apuestas al instante, con soporte entero para registro y rendimiento.</p>
                </div>
              </div>

              <div className="scan-preview">
                <div className="scan-artwork" />
                <div className="scan-overlay">
                  <span className="material-symbols-outlined">center_focus_strong</span>
                  <p>Esperando señal...</p>
                </div>
              </div>

              <button className="button-primary" type="button" onClick={() => setEscaneandoQR(true)}>
                <span className="material-symbols-outlined">videocam</span>
                ACTIVAR ESCÁNER
              </button>
            </section>

            <section className="bento-card compact-card">
              <div className="panel-heading">
                <div className="panel-icon">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <div>
                  <h4>Resumen de captura</h4>
                </div>
              </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                      <button className="pill-button" type="button" onClick={() => setFlipX(v => !v)}>{flipX ? 'FlipX ✓' : 'FlipX'}</button>
                      <button className="pill-button" type="button" onClick={() => setFlipY(v => !v)}>{flipY ? 'FlipY ✓' : 'FlipY'}</button>
                      <button className="pill-button" type="button" onClick={() => setRotate90(v => !v)}>{rotate90 ? 'Rot90 ✓' : 'Rot90'}</button>
                      <button className="pill-button" type="button" onClick={() => { setFlipX(false); setFlipY(false); setRotate90(false); }}>Reset</button>
                    </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div className="summary-row summary-row--muted" style={{ display: 'grid', gap: '6px' }}>
                  <div><strong>QR capturado:</strong> {datosTicket.qr || 'Ninguno'}</div>
                  <div><strong>Banda magnética:</strong> {datosTicket.magnetico || 'Ninguna'}</div>
                  <div><strong>Tag NFC:</strong> {datosTicket.nfc || 'Ninguno'}</div>
                </div>
                <div className="hero-actions" style={{ gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <button className="button-secondary" type="button" onClick={preSaveAndOpenPreview} disabled={!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc}>
                    <span className="material-symbols-outlined">preview</span>
                    Vista previa
                  </button>
                  <button className="button-secondary" type="button" onClick={() => window.open('/#/print/ticket-hipico', '_blank')} disabled={!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc}>
                    <span className="material-symbols-outlined">print</span>
                    Ticket Hípico
                  </button>
                  <button className="button-primary" type="button" onClick={procesarEImprimirTicket} disabled={guardando || (!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc)}>
                    {guardando ? 'Guardando...' : 'Imprimir ticket'}
                  </button>
                </div>
              </div>
            </section>

            <section className="action-strip">
              <button className="button-gold" type="button" onClick={procesarEImprimirTicket}>
                <span className="material-symbols-outlined">print_connect</span>
                PROCESAR E IMPRIMIR COMPROBANTE
              </button>
              <button className="button-outline" type="button" onClick={limpiarFormulario}>
                <span className="material-symbols-outlined">delete_sweep</span>
                LIMPIAR
              </button>
            </section>
          </div>

          <aside className="dashboard-side-panel">
            <section className="bento-card compact-card">
              <div className="panel-heading">
                <div className="panel-icon">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
                <div>
                  <h4>Lector de Banda</h4>
                </div>
              </div>
              <div className="reader-panel">
                <div className="reader-icon">
                  <span className="material-symbols-outlined">swipe_vertical</span>
                </div>
                <p>Deslice la tarjeta por el canal lateral del dispositivo para iniciar cobro.</p>
              </div>
              <div className="reader-status">
                <span className="status-label">Estado del lector</span>
                <div className="status-indicator">
                  <span className="status-dot status-dot--active" />
                  <span>LISTO</span>
                </div>
              </div>
            </section>

            <section className="bento-card compact-card">
              <div className="panel-heading">
                <div className="panel-icon">
                  <span className="material-symbols-outlined">contactless</span>
                </div>
                <div>
                  <h4>Procesador NFC</h4>
                </div>
              </div>
              <div className="input-group">
                <input
                  placeholder="ID de Tag NFC o escaneo..."
                  type="text"
                  value={datosTicket.nfc}
                  onChange={(e) => setDatosTicket(prev => ({ ...prev, nfc: e.target.value }))}
                />
                <span className="material-symbols-outlined input-icon">sensors</span>
              </div>
              <div className="info-box">
                <span className="material-symbols-outlined">info</span>
                <p>Compatible con chips NTAG213-216. El sistema detecta el acercamiento automáticamente.</p>
              </div>
            </section>

            <section className="bento-card compact-card stats-summary">
              <p className="eyebrow">Rendimiento de Sesión</p>
              <div className="summary-row">
                <span>Operaciones</span>
                <strong>142 tickets</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" />
              </div>
              <div className="summary-row summary-row--muted">
                <span>Cuota diaria</span>
                <span>75% completado</span>
              </div>
            </section>
          </aside>
        </div>

        <footer className="app-footer">
          <p className="eyebrow">Apuestala Web Dashboard • Enterprise Secure Portal • Terminal #402-A9</p>
        </footer>
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
