const DEFAULT_ORIGIN = 'https://cinevault-delta-lake.vercel.app';
const PREVIEW_ORIGINS = [
  'https://cinevault-mdu67avr6-raphaelbimantara-5365.vercel.app',
];

function jsonResponse(value, status, headers) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      DEFAULT_ORIGIN,
      ...PREVIEW_ORIGINS,
      'http://localhost:5173',
      'https://localhost',
      'capacitor://localhost',
      ...(process.env.CINEVAULT_ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ];
    const headers = new Headers({ 'Cache-Control': 'no-store' });

    if (origin && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'Origin is not allowed.' }, 403, headers);
    }
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Vary', 'Origin');
    }
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS');
      return jsonResponse({ error: 'Method not allowed.' }, 405, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, headers);
    }

    const sharedSecret = process.env.CINEVAULT_SHARED_SECRET;
    const appsScriptUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL;
    if (!sharedSecret || !appsScriptUrl) {
      console.error('Google Sheets integration environment variables are missing.');
      return jsonResponse({ error: 'Shared catalog is not configured on the server.' }, 503, headers);
    }
    if (typeof body.token !== 'string' || body.token !== sharedSecret) {
      return jsonResponse({ error: 'Access key is incorrect.' }, 401, headers);
    }
    const supportedActions = ['load', 'save', 'loadActors', 'saveActor', 'deleteActors', 'saveActors'];
    if (!supportedActions.includes(body.action)) {
      return jsonResponse({ error: 'Unsupported catalog action.' }, 400, headers);
    }
    if (body.action === 'save' && !Array.isArray(body.movies)) {
      return jsonResponse({ error: 'Movies must be an array.' }, 400, headers);
    }
    if (body.action === 'saveActor' && (!body.actor || typeof body.actor !== 'object')) {
      return jsonResponse({ error: 'Actor profile is required.' }, 400, headers);
    }
    if (body.action === 'saveActors' && !Array.isArray(body.actors)) {
      return jsonResponse({ error: 'Actors must be an array.' }, 400, headers);
    }
    if (body.action === 'deleteActors' && !Array.isArray(body.names)) {
      return jsonResponse({ error: 'Actor names must be an array.' }, 400, headers);
    }

    try {
      const upstream = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: body.action,
          token: sharedSecret,
          movies: body.action === 'save' ? body.movies : undefined,
          actor: body.action === 'saveActor' ? body.actor : undefined,
          oldName: body.action === 'saveActor' ? body.oldName : undefined,
          actors: body.action === 'saveActors' ? body.actors : undefined,
          names: body.action === 'deleteActors' ? body.names : undefined,
        }),
        redirect: 'follow',
      });
      const result = await upstream.json();

      if (!upstream.ok || result.error) {
        console.error('Google Sheets request failed:', result.error || upstream.statusText);
        return jsonResponse(
          { error: result.error || 'Google Sheets request failed.' },
          502,
          headers
        );
      }

      return jsonResponse(result, 200, headers);
    } catch (error) {
      console.error('Google Sheets request failed:', error);
      return jsonResponse({ error: 'Unable to reach Google Sheets.' }, 502, headers);
    }
  },
};
