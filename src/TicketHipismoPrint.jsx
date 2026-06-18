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
      <div id="ticket-hipico-termico" style={{ padding: '6mm 4mm', boxSizing: 'border-box', background: '#fff', color: '#000', width: '54mm', fontFamily: 'Courier, monospace' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 6 }}>BANCA LA REFORMA</div>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>- Apuestas Hípicas -</div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        <div style={{ fontFamily: 'Courier, monospace', fontSize: '9pt' }}>
          <div>Ticket: {use.ticketId}</div>
          <div>Fecha: {use.fecha}  Hora: {use.hora}</div>
          <div>Taquilla: {use.taquilla}</div>
          <div>--------------------------------</div>
          <div style={{ fontWeight: 700 }}>HIPÓDROMO: {use.hipodromo}</div>
          <div>--------------------------------</div>
          <div>Carrera: {use.carrera}  | Tipo: {use.tipo}</div>
          <div>Ejemplar(es):</div>
          <div>  &gt; {use.ejemplar}</div>
          <div>--------------------------------</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Monto Jugado:</span>
            <span>${use.monto}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Premio Potencial:</span>
            <span>${use.premio}</span>
          </div>
          <div>--------------------------------</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div>CÓDIGO DE CONTROL</div>
          <div style={{ fontWeight: 700 }}>*{use.codigoControl}*</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <QRCodeSVG value={use.codigoControl} size={90} level="M" includeMargin={false} fgColor="#000000" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '8.5pt' }}>
          <div>* Caduca en 30 días.</div>
          <div>* Revise su ticket. No se aceptan reclamos posteriores.</div>
          <div>================================</div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body { background: #fff; }
          body * { visibility: hidden; }
          #ticket-hipico-termico, #ticket-hipico-termico * { visibility: visible; }
          #ticket-hipico-termico { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
};

export default TicketHipismoPrint;
