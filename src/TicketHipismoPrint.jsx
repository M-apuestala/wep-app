import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TicketHipismoPrint = () => {
  useEffect(() => {
    // Auto-invoke print when this route is opened in a new tab
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  // Minimal standalone ticket markup for clean printing
  return (
    <div>
      <div id="ticket-hipico-termico" style={{ padding: '6mm 4mm', boxSizing: 'border-box', background: '#fff', color: '#000', width: '54mm', fontFamily: 'Courier, monospace' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 6 }}>BANCA LA REFORMA</div>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>- Apuestas Hípicas -</div>
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        <div style={{ fontFamily: 'Courier, monospace', fontSize: '9pt' }}>
          <div>Ticket: #A987654321</div>
          <div>Fecha: 18/06/2026  Hora: 17:05</div>
          <div>Taquilla: TQ-04</div>
          <div>--------------------------------</div>
          <div style={{ fontWeight: 700 }}>HIPÓDROMO: LA RINCONADA</div>
          <div>--------------------------------</div>
          <div>Carrera: 5  | Tipo: GANADOR</div>
          <div>Ejemplar(es):</div>
          <div>  &gt; #04 PAPÁ PEDRO</div>
          <div>--------------------------------</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Monto Jugado:</span>
            <span>$10.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Premio Potencial:</span>
            <span>$35.00</span>
          </div>
          <div>--------------------------------</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div>CÓDIGO DE CONTROL</div>
          <div style={{ fontWeight: 700 }}>*X89J-23LK-P90W*</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <QRCodeSVG value="X89J-23LK-P90W" size={90} level="M" includeMargin={false} fgColor="#000000" />
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
