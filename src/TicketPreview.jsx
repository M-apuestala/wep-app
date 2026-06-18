import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TicketPreview = ({ apuesta, onClose, onPrint }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: '420px', maxWidth: '95%', background: '#0f172a', color: '#f8fafc', padding: 20, borderRadius: 12 }}>
        <h3 style={{ marginTop: 0, color: '#34d399' }}>Vista previa de Ticket Hípico</h3>
        <div style={{ background: '#fff', color: '#000', padding: 12, borderRadius: 8 }} id="ticket-preview-printable">
          <div style={{ textAlign: 'center', fontWeight: 700 }}>BANCA LA REFORMA</div>
          <div style={{ textAlign: 'center' }}>- Apuestas Hípicas -</div>
          <hr />
          <div style={{ fontFamily: 'Courier, monospace', fontSize: 12 }}>
            <div>Ticket: {apuesta.ticketId}</div>
            <div>Fecha: {apuesta.fecha} Hora: {apuesta.hora}</div>
            <div>Taquilla: {apuesta.taquilla}</div>
            <div>--------------------------------</div>
            <div style={{ fontWeight: 700 }}>HIPÓDROMO: {apuesta.hipodromo}</div>
            <div>Carrera: {apuesta.carrera} | Tipo: {apuesta.tipo}</div>
            <div>Ejemplar: {apuesta.ejemplar}</div>
            <div>--------------------------------</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Monto:</span><span>${apuesta.monto}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <QRCodeSVG value={apuesta.codigoControl} size={80} level="M" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.12)' }}>Cerrar</button>
          <button onClick={onPrint} style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}>Imprimir</button>
        </div>
      </div>
    </div>
  );
};

export default TicketPreview;
