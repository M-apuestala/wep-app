import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TicketHipismo from './TicketHipismo.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TicketHipismo />
  </StrictMode>,
);
