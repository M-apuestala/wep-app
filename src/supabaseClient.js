// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// runtime-configurable values (can be initialized from env or localStorage)
let currentUrl = ENV_SUPABASE_URL || null;
let currentKey = ENV_SUPABASE_ANON_KEY || null;
let supabase = null;

const _createClient = (url, key) => {
  try {
    supabase = createClient(url, key);
    return supabase;
  } catch (err) {
    console.warn('Error creando cliente Supabase:', err);
    supabase = null;
    return null;
  }
};

// Prefer persisted config in localStorage for dev convenience
try {
  const persisted = localStorage.getItem('supabaseConfig');
  if (persisted) {
    const parsed = JSON.parse(persisted);
    if (parsed?.url && parsed?.key) {
      currentUrl = parsed.url;
      currentKey = parsed.key;
    }
  }
} catch (e) {
  // ignore
}

if (currentUrl && currentKey) {
  _createClient(currentUrl, currentKey);
} else {
  console.warn('Supabase no está configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY o configura desde la UI.');
}

const isSupabaseConfigured = () => !!(currentUrl && currentKey && supabase);

const getSupabaseSummary = () => ({
  url: currentUrl || null,
  anonKeySet: !!currentKey,
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

// allow runtime initialization (useful for dev/testing without restarting the server)
const initSupabase = (url, key, persist = false) => {
  currentUrl = url || null;
  currentKey = key || null;
  if (currentUrl && currentKey) {
    _createClient(currentUrl, currentKey);
  } else {
    supabase = null;
  }
  try {
    if (persist) localStorage.setItem('supabaseConfig', JSON.stringify({ url: currentUrl, key: currentKey }));
  } catch (e) {
    // ignore
  }
  return isSupabaseConfigured();
};

const clearSupabaseConfig = () => {
  try { localStorage.removeItem('supabaseConfig'); } catch (e) {}
  currentUrl = null; currentKey = null; supabase = null;
};

const getCurrentConfig = () => ({ url: currentUrl, keySet: !!currentKey });

export { supabase, isSupabaseConfigured, getSupabaseSummary, testSupabaseConnection, saveTicket, initSupabase, clearSupabaseConfig, getCurrentConfig };