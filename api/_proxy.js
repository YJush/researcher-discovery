// Shared helper for provider proxies: forwards GET requests to an approved host only.
export async function forward(req, res, { allowedHost, headers = {}, mutateUrl } = {}) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = req.query?.url;
  if (typeof raw !== 'string' || raw.length > 2000) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' });
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }

  if (target.protocol !== 'https:' || target.hostname !== allowedHost) {
    return res.status(403).json({ error: 'Host not allowed' });
  }

  if (mutateUrl) mutateUrl(target);

  try {
    const upstream = await fetch(target, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.status(upstream.status).send(body);
  } catch (error) {
    console.error(`Proxy error (${allowedHost}):`, error.name);
    return res.status(502).json({ error: 'Upstream request failed' });
  }
}
