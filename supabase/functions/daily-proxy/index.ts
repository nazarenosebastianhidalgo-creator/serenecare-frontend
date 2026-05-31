import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('FRONTEND_URL') ?? 'https://serenecare-app.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ENDPOINTS = ['rooms', 'meetings', 'recordings'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Verificar JWT del usuario
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  try {
    const { endpoint, method = 'POST', payload } = await req.json();

    // Whitelist de endpoints permitidos
    const baseEndpoint = String(endpoint || '').split('/')[0];
    if (!ALLOWED_ENDPOINTS.includes(baseEndpoint)) {
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), { status: 403, headers: CORS });
    }

    const dailyKey = Deno.env.get('DAILY_KEY');
    if (!dailyKey) {
      return new Response(JSON.stringify({ error: 'Daily.co key not configured' }), { status: 500, headers: CORS });
    }

    const url = `https://api.daily.co/v1/${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${dailyKey}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
