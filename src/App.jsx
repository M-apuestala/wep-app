import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const App = () => {
  // Estados de datos del ticket
  const [datosTicket, setDatosTicket] = useState({
    qr: '',
    magnetico: '',
    nfc: ''
  });

  // Estados de control de UI
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState({ tipo: '', texto: '' });

  // Referencias y variables para la captura de Banda Magnética (Teclado HID)
  const bufferMagnetico = useRef('');
  const ultimoKeypressTime = useRef(0);

  // Auxiliar para notificaciones en pantalla
  const mostrarFeedback = (tipo, texto) => {
    setMensajeEstado({ tipo, texto });
    setTimeout(() => setMensajeEstado({ tipo: '', texto: '' }), 4000);
  };

  // 2. EFECTO: Captura Global del Lector de Banda Magnética (Emulación de Teclado HID)
  useEffect(() => {
    const manejarKeydownGlobal = (e) => {
      const ahora = Date.now();
      
      // Los lectores HID envían las teclas extremadamente rápido (generalmente < 30ms entre caracteres).
      // Si pasa demasiado tiempo, asumimos que el usuario está escribiendo manualmente y limpiamos el buffer.
      if (ahora - ultimoKeypressTime.current > 50) {
        bufferMagnetico.current = '';
      }
      ultimoKeypressTime.current = ahora;

      // Si el lector envía 'Enter', significa que terminó de leer la banda magnética
      if (e.key === 'Enter') {
        if (bufferMagnetico.current.length > 0) {
          setDatosTicket(prev => ({ ...prev, magnetico: bufferMagnetico.current }));
          mostrarFeedback('success', '💳 Tarjeta magnética leída con éxito');
          bufferMagnetico.current = ''; // Resetear buffer local
        }
      } else {
        // Ignorar teclas de control del sistema para no ensuciar la cadena
        if (e.key.length === 1) {
          bufferMagnetico.current += e.key;
        }
      }
    };

    // Escuchar el teclado a nivel global en la aplicación
    window.addEventListener('keydown', manejarKeydownGlobal);
    return () => window.removeEventListener('keydown', manejarKeydownGlobal);
  }, []);

  // 3. EFECTO: Control del Escáner de Cámara para Código QR
  useEffect(() => {
    let scanner = null;

    if (escaneandoQR) {
      // Configuramos el lector apuntando al div contenedor
      scanner = new Html5QrcodeScanner('lector-qr', {
        fps: 15,
        qrbox: { width: 180, height: 180 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // Forzar sólo uso de cámara trasera/principal
      }, false);

      scanner.render(
        (textoDecodificado) => {
          setDatosTicket(prev => ({ ...prev, qr: textoDecodificado }));
          mostrarFeedback('success', '📷 Código QR escaneado con éxito');
          setEscaneandoQR(false);
          scanner.clear();
        },
        (error) => {
          // Fallas menores de lectura por frame (silencioso)
          console.debug("Buscando QR...", error);
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(err => console.error("Error destruyendo scanner", err));
      }
    };
  }, [escaneandoQR]);

  // 4. LÓGICA: Guardar en Supabase e invocar LocalPrintService
  const procesarEImprimirTicket = async () => {
    // Validación de negocio opcional (ej: al menos un dato recolectado)
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
      // Guardar en la Base de Datos de Supabase
      const { error } = await supabase
        .from('tickets')
        .insert([{
          qr_data: datosTicket.qr || null,
          magnetic_data: datosTicket.magnetico || null,
          nfc_data: datosTicket.nfc || null
        }]);

      if (error) throw error;

      mostrarFeedback('success', '💾 Sincronizado con Supabase. Imprimiendo...');
      
      // Pequeña pausa táctil para asegurar fluidez antes del print prompt
      setTimeout(() => {
        window.print(); // Invoca el LocalPrintService nativo a través del navegador/WebView
      }, 300);

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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 flex flex-col justify-between app-container">
      
      {/* --- VISTA NORMAL EN PANTALLA (UI DEL TERMINAL POS) --- */}
      <main className="max-w-md w-full mx-auto space-y-4 interface-screen">
        
        {/* Encabezado */}
        <header className="text-center py-2 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-wider text-emerald-400">POS SMART TERMINAL</h1>
          <p className="text-xs text-slate-400">Android 8.0 Oreo Hybrid App</p>
        </header>

        {/* Alertas dinámicas de estado */}
        {mensajeEstado.texto && (
          <div className={`p-3 rounded-lg text-sm text-center font-medium transition-all ${
            mensajeEstado.tipo === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            mensajeEstado.tipo === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
            'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}>
            {mensajeEstado.texto}
          </div>
        )}

        {/* 1. MÓDULO QR */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-300 mb-2 flex justify-between items-center">
            <span>1. Escáner de Cámara (QR)</span>
            {datosTicket.qr && <span className="text-xs text-emerald-400 font-bold">✓ CAPTURADO</span>}
          </h2>
          {datosTicket.qr ? (
            <div className="bg-slate-950 p-2 rounded text-xs break-all font-mono text-emerald-300 border border-emerald-900/40">
              {datosTicket.qr}
            </div>
          ) : (
            <button
              onClick={() => setEscaneandoQR(!escaneandoQR)}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition ${
                escaneandoQR ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {escaneandoQR ? 'Apagar Cámara' : 'Encender Cámara Trasera'}
            </button>
          )}
          {escaneandoQR && <div id="lector-qr" className="mt-3 overflow-hidden rounded-lg bg-black"></div>}
        </section>

        {/* 2. MÓDULO BANDA MAGNÉTICA */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-300 mb-2 flex justify-between items-center">
            <span>2. Banda Magnética (Pasar Tarjeta)</span>
            {datosTicket.magnetico && <span className="text-xs text-emerald-400 font-bold">✓ LEÍDO</span>}
          </h2>
          {datosTicket.magnetico ? (
            <div className="bg-slate-950 p-2 rounded text-xs break-all font-mono text-emerald-300 border border-emerald-900/40">
              {datosTicket.magnetico}
            </div>
          ) : (
            <div className="text-center py-3 border border-dashed border-slate-600 rounded-lg text-xs text-slate-400 animate-pulse">
              Deslice la tarjeta por el lector físico en cualquier momento...
            </div>
          )}
        </section>

        {/* 3. MÓDULO NFC */}
        <section className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-300 mb-2 flex justify-between items-center">
            <span>3. Interfaz NFC Tag</span>
            {datosTicket.nfc && <span className="text-xs text-emerald-400 font-bold">✓ REGISTRADO</span>}
          </h2>
          <input
            type="text"
            placeholder="Escribe o acerca un Tag NFC..."
            value={datosTicket.nfc}
            onChange={(e) => setDatosTicket(prev => ({ ...prev, nfc: e.target.value }))}
            className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-700 text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </section>

        {/* BOTONES DE ACCIÓN */}
        <footer className="pt-2 space-y-2">
          <button
            onClick={procesarEImprimirTicket}
            disabled={guardando}
            className="w-full bg-emerald-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-emerald-500 transition disabled:opacity-50 text-base"
          >
            {guardando ? 'Guardando Registro...' : 'PROCESAR E IMPRIMIR'}
          </button>
          
          <button
            onClick={limpiarFormulario}
            className="w-full bg-slate-800 text-slate-400 font-medium py-2 px-4 rounded-xl hover:bg-slate-700 transition text-xs"
          >
            Vaciar Campos Actuales
          </button>
        </footer>
      </main>


      {/* --- VISTA EXCLUSIVA PARA EL CONTROLADOR DE IMPRESIÓN (OCULTO EN LA UI) --- */}
      <div id="ticket-termico-54mm" className="print-only-ticket">
        <div className="t-center font-bold">
          <p className="t-title">COMPROBANTE POS</p>
          <p>SISTEMA CENTRALIZADO</p>
          <p className="t-small">{new Date().toLocaleString()}</p>
        </div>
        
        <div className="t-divider">--------------------------------</div>
        
        <div className="t-body">
          {datosTicket.qr && (
            <div className="t-section">
              <p className="font-bold">[LECTURA QR]</p>
              <p className="t-break">{datosTicket.qr}</p>
            </div>
          )}
          
          {datosTicket.magnetico && (
            <div className="t-section">
              <p className="font-bold">[BANDA MAGNÉTICA]</p>
              <p className="t-break">{datosTicket.magnetico}</p>
            </div>
          )}
          
          {datosTicket.nfc && (
            <div className="t-section">
              <p className="font-bold">[ID TAG NFC]</p>
              <p className="t-break">{datosTicket.nfc}</p>
            </div>
          )}

          {!datosTicket.qr && !datosTicket.magnetico && !datosTicket.nfc && (
            <p className="t-center">TICKET EN BLANCO - SIN DATOS</p>
          )}
        </div>
        
        <div className="t-divider">--------------------------------</div>
        
        <div className="t-footer font-bold">
          <p>REGISTRO EXITOSO EN CLOUD</p>
          <p>PROCESADO OK</p>
          <p className="t-spacer">. . . . . . . . . . . . . . . .</p>
        </div>
      </div>


      {/* --- ESTILOS CSS DE PRODUCCIÓN PARA IMPRESORA DE 54MM --- */}
      <style>{`
        /* Ocultar bloque de impresión en renderizado regular de pantalla */
        #ticket-termico-54mm {
          display: none;
        }

        /* Bloque ejecutable exclusivamente durante window.print() */
        @media print {
          /* Calibración del Driver de Android (LocalPrintService) para rollos de 58mm/54mm de impresión real */
          @page {
            size: 58mm auto; /* Configura tamaño continuo del ticket */
            margin: 0mm;    /* Elimina encabezados por defecto del navegador (como URL o fecha arriba) */
          }
          
          /* Ocultar completamente la UI oscura del terminal */
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .interface-screen, .app-container, body > div:not(#ticket-termico-54mm) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Forzar visibilidad exclusiva del bloque térmico */
          #ticket-termico-54mm, #ticket-termico-54mm * {
            display: block !important;
            visibility: visible !important;
          }
          
          /* Construcción estructural del papel de 54mm */
          #ticket-termico-54mm {
            position: absolute;
            left: 0;
            top: 0;
            width: 54mm;               /* Ancho exacto imprimible del hardware */
            padding: 2mm 3mm;
            box-sizing: border-box;
            font-family: 'Courier New', Courier, monospace; /* Fuente monoespaciada requerida */
            font-size: 10pt;           /* Tamaño legible para impresoras térmicas de baja densidad */
            line-height: 1.2;
            color: #000000;
            background: #ffffff;
          }

          /* Helpers de formateo alineados a un máximo de 32 caracteres */
          .t-center { text-align: center; }
          .t-title { font-size: 12pt; margin-bottom: 2px; }
          .t-small { font-size: 8pt; }
          .t-divider { text-align: center; margin: 4px 0; font-weight: bold; }
          .t-section { margin-bottom: 8px; }
          
          /* Obliga a cadenas largas (URLs o tokens de tarjetas) a saltar de línea sin romper el ancho de página */
          .t-break {
            word-break: break-all;
            white-space: pre-wrap;
            font-size: 9pt;
          }

          /* Padding de cortesía: previene que la cuchilla del terminal corte la última línea de texto */
          .t-footer {
            text-align: center;
            margin-top: 10px;
          }
          .t-spacer {
            margin-top: 15px;
            padding-bottom: 25px; 
          }
        }
      `}</style>
    </div>
  );
};

export default App;