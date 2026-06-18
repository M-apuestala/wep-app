// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('Supabase no está configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno de Vercel.');
}

const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY && supabase);

const getSupabaseSummary = () => ({
  url: SUPABASE_URL || null,
  anonKeySet: !!SUPABASE_ANON_KEY,
  configured: isSupabaseConfigured()
});

const testSupabaseConnection = async (opts = {}) => {
  if (!supabase) return { ok: false, error: 'Supabase no configurado' };
  try {
    const { data, error, status } = await supabase.from('tickets').select('id').limit(1);
    if (error) return { ok: false, error: error.message || `status:${status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
};

// saveTicket: try inserting into Supabase; on failure, fallback to localStorage mock
const saveTicket = async (ticketFields) => {
  if (supabase) {
    try {
      const { data, error, status } = await supabase.from('tickets').insert([ticketFields]);
      if (error) {
        console.warn('Supabase insert failed, falling back to local storage:', error.message || error);
        // fallthrough to local fallback
      } else {
        return { ok: true, source: 'supabase', data };
      }
    } catch (err) {
      console.warn('Supabase insert exception, falling back to local storage:', err);
    }
  }

  // Local fallback
  try {
    const listRaw = localStorage.getItem('mockTickets') || '[]';
    const list = JSON.parse(listRaw);
    const id = `local-${Date.now()}`;
    const saved = { id, ...ticketFields };
    list.push(saved);
    localStorage.setItem('mockTickets', JSON.stringify(list));
    return { ok: true, source: 'local', data: saved };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
};

export { supabase, isSupabaseConfigured, getSupabaseSummary, testSupabaseConnection, saveTicket };