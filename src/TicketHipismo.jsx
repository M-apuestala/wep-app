import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TicketHipismo = () => {
  const [apuesta, setApuesta] = useState({
    ticketId: 'A987654321',
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
  });

  const ejecutarImpresion = () => {
    window.print();
  };

  return (
    <div className="ticket-hipismo-shell">
      <h2 className="ticket-hipismo-title">
        🎟️ Generador de Ticket Hípico
      </h2>

      <div className="ticket-hipismo-form grid-cols-2">
        <div className="ticket-field">
          <label>Hipódromo</label>
          <input
            type="text"
            value={apuesta.hipodromo}
            onChange={(e) => setApuesta({ ...apuesta, hipodromo: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="ticket-field">
          <label>Ejemplar</label>
          <input
            type="text"
            value={apuesta.ejemplar}
            onChange={(e) => setApuesta({ ...apuesta, ejemplar: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="ticket-field">
          <label>Carrera</label>
          <input
            type="text"
            value={apuesta.carrera}
            onChange={(e) => setApuesta({ ...apuesta, carrera: e.target.value })}
          />
        </div>
        <div className="ticket-field">
          <label>Monto ($)</label>
          <input
            type="text"
            value={apuesta.monto}
            onChange={(e) => setApuesta({ ...apuesta, monto: e.target.value })}
          />
        </div>
      </div>

      <button type="button" className="ticket-print-button" onClick={ejecutarImpresion}>
        IMPRIMIR TICKET HÍPICO
      </button>

      <div id="ticket-hipico-termico" className="print-ticket-area">
        <div className="logo-container">
          <img
            src="https://images.unsplash.com/photo-1598946174697-dfaa4866679b?auto=format&fit=crop&w=120&q=80"
            alt="Logo Banca"
            className="company-logo"
          />
        </div>
        <div className="text-center font-bold ticket-header-text">
          <p>BANCA LA REFORMA</p>
          <p>- Apuestas Hípicas -</p>
          <p>================================</p>
        </div>

        <div className="ticket-meta font-mono">
          <p>Ticket: #{apuesta.ticketId}</p>
          <p>Fecha: {apuesta.fecha}  Hora: {apuesta.hora}</p>
          <p>Taquilla: {apuesta.taquilla}</p>
          <p>--------------------------------</p>
          <p className="font-bold">HIPÓDROMO: {apuesta.hipodromo}</p>
          <p>--------------------------------</p>
          <p>Carrera: {apuesta.carrera}  | Tipo: {apuesta.tipo}</p>
          <p>Ejemplar(es):</p>
          <p>  &gt; {apuesta.ejemplar}</p>
          <p>--------------------------------</p>
          <div className="flex-row">
            <span>Monto Jugado:</span>
            <span className="pull-right">${apuesta.monto}</span>
          </div>
          <div className="flex-row">
            <span>Premio Potencial:</span>
            <span className="pull-right">${apuesta.premio}</span>
          </div>
          <p>--------------------------------</p>
        </div>

        <div className="text-center font-mono">
          <p>CÓDIGO DE CONTROL</p>
          <p className="font-bold">*{apuesta.codigoControl}*</p>
          <div className="qr-container">
            <QRCodeSVG value={apuesta.codigoControl} size={110} level="M" includeMargin={false} fgColor="#000000" />
          </div>
          <p>--------------------------------</p>
        </div>

        <div className="ticket-rules font-mono">
          <p>* Caduca en 30 días.</p>
          <p>* Revise su ticket. No se</p>
          <p>  aceptan reclamos posteriores.</p>
          <p>* ¡Gracias por su jugada!</p>
          <p>================================</p>
        </div>

        <div className="corte-de-cortesia">. . . . . . . . . . . . . . . .</div>
      </div>

      <style>{`
        .ticket-hipismo-shell {
          max-width: 640px;
          margin: 0 auto;
          padding: 16px;
          background: #1f2937;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
          color: #f8fafc;
          margin-top: 16px;
        }

        .ticket-hipismo-title {
          text-align: center;
          font-size: 1rem;
          font-weight: 700;
          color: #34d399;
          margin-bottom: 16px;
          letter-spacing: 0.03em;
          border-bottom: 1px solid rgba(148, 163, 184, 0.24);
          padding-bottom: 12px;
        }

        .ticket-hipismo-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
          font-size: 0.8rem;
        }

        .ticket-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ticket-field label {
          color: #94a3b8;
        }

        .ticket-field input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #f8fafc;
        }

        .ticket-print-button {
          width: 100%;
          margin-top: 8px;
          padding: 14px 16px;
          border-radius: 18px;
          background: #2563eb;
          color: white;
          font-weight: 700;
          border: none;
          transition: filter 180ms ease;
        }

        .ticket-print-button:hover {
          filter: brightness(1.05);
        }

        .print-ticket-area {
          display: none;
        }

        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body * {
            display: none !important;
            visibility: hidden !important;
          }

          #ticket-hipico-termico,
          #ticket-hipico-termico * {
            display: block !important;
            visibility: visible !important;
          }

          #ticket-hipico-termico {
            position: absolute;
            left: 0;
            top: 0;
            width: 54mm;
            padding: 2mm 3mm;
            box-sizing: border-box;
            font-family: 'Courier New', Courier, monospace;
            font-size: 9pt;
            line-height: 1.15;
            color: #000;
            background: #fff;
          }

          .text-center {
            text-align: center;
          }

          .logo-container {
            display: flex !important;
            justify-content: center;
            align-items: center;
            margin-bottom: 5px;
            width: 100%;
          }

          .company-logo {
            display: block !important;
            width: 35mm;
            height: auto;
            filter: grayscale(100%) contrast(200%);
            margin: 0 auto;
          }

          .font-mono {
            font-family: 'Courier New', Courier, monospace;
          }

          .font-bold {
            font-weight: 700;
          }

          .flex-row {
            display: flex !important;
            justify-content: space-between;
            width: 100%;
          }

          .pull-right {
            float: right;
          }

          .qr-container {
            display: flex !important;
            justify-content: center;
            align-items: center;
            margin: 6px 0;
            width: 100%;
          }

          .qr-container svg {
            display: block !important;
            margin: 0 auto;
          }

          .ticket-rules {
            font-size: 8.5pt;
          }

          .corte-de-cortesia {
            text-align: center;
            margin-top: 10px;
            padding-bottom: 30px;
            color: #000;
          }
        }

        @media (max-width: 640px) {
          .ticket-hipismo-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TicketHipismo;
