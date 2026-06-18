import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TicketHipismoPrint = () => {
  useEffect(() => {
    // Auto-invoke print when this route is opened in a new tab
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  // Read the last printed ticket from sessionStorage
  let ticket = null;
  try {
    const raw = sessionStorage.getItem('lastPrintedTicket');
    ticket = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('No se pudo parsear lastPrintedTicket', e);
    ticket = null;
  }

  const use = ticket || {
    ticketId: '#A987654321',
    fecha: '18/06/2026',
    hora: '17:05',
    taquilla: 'TQ-04',
    hipodromo: 'LA RINCONADA',
    carrera: '5',
    tipo: 'GANADOR',
    ejemplar: '#04 PAPÁ PEDRO',
    monto: '10.00',
    premio: '35.00',
    codigoControl: 'X89J-23LK-P90W'
  };

  // Minimal standalone ticket markup for clean printing (dynamic)
  return (
    <div>
      <div id="ticket-hipico-termico" style={{ padding: '18mm 16mm', boxSizing: 'border-box', background: '#fff', color: '#000', width: '100%', minHeight: '100vh', fontFamily: 'Courier, monospace', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', marginBottom: '16mm' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Logo Apuestala" style={{ display: 'block' }}>
            <rect width="120" height="120" rx="24" fill="#0f172a" />
            <path d="M34 42L60 82L86 42" stroke="#fff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 62L60 42L76 62" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, letterSpacing: '0.12em' }}>APUESTALA</div>
            <div style={{ fontSize: '22px', letterSpacing: '0.18em', marginTop: '6px' }}>BANCA LA REFORMA</div>
          </div>
        </div>

        <div style={{ width: '100%', textAlign: 'center', marginBottom: '14mm' }}>
          <div style={{ fontSize: '40px', fontWeight: 900 }}>TICKET HÍPICO</div>
          <div style={{ fontSize: '24px', color: '#333', marginTop: '8px' }}>Formato A4 completo y de gran tamaño</div>
        </div>

        <div style={{ width: '100%', maxWidth: '75%', margin: '0 auto', display: 'grid', gap: '22px', fontSize: '22pt', lineHeight: 1.5, marginBottom: '12mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '24pt' }}><span>Ticket:</span><span>{use.ticketId}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22pt' }}><span>Fecha:</span><span>{use.fecha} {use.hora}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22pt' }}><span>Taquilla:</span><span>{use.taquilla}</span></div>
          <div style={{ borderBottom: '1px solid #000', margin: '18px 0' }} />
          <div style={{ fontWeight: 900, fontSize: '24pt' }}>HIPÓDROMO: {use.hipodromo}</div>
          <div style={{ borderBottom: '1px dashed #000', margin: '18px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22pt' }}><span>Carrera:</span><span>{use.carrera}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22pt' }}><span>Tipo:</span><span>{use.tipo}</span></div>
          <div style={{ fontSize: '22pt' }}>Ejemplar(es): {use.ejemplar}</div>
          <div style={{ borderBottom: '1px solid #000', margin: '18px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '30pt', fontWeight: 900 }}><span>Monto Jugado:</span><span>${use.monto}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '30pt', fontWeight: 900 }}><span>Premio Potencial:</span><span>${use.premio}</span></div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>CÓDIGO DE CONTROL</div>
          <div style={{ fontWeight: 900, marginTop: '12px', fontSize: '24pt' }}>*{use.codigoControl}*</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '18px' }}>
            <QRCodeSVG value={use.codigoControl} size={360} level="M" includeMargin={false} fgColor="#000000" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '14mm', fontSize: '10pt', lineHeight: 1.4 }}>
          <div>* Caduca en 30 días.</div>
          <div>* Revise su ticket. No se aceptan reclamos posteriores.</div>
          <div>================================</div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
          body { background: #fff; }
          body * { visibility: hidden; }
          #ticket-hipico-termico, #ticket-hipico-termico * { visibility: visible; }
          #ticket-hipico-termico { position: absolute; left: 0; top: 0; width: 100%; height: 100%; max-width: 100%; }
          #ticket-hipico-termico > div { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default TicketHipismoPrint;
