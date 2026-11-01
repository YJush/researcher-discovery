import { forward } from './_proxy.js';

export default function handler(req, res) {
  const key = process.env.SCOPUS_API_KEY;
  if (!key) return res.status(500).json({ error: 'SCOPUS_API_KEY is not configured' });
  return forward(req, res, {
    allowedHost: 'api.elsevier.com',
    headers: { 'X-ELS-APIKey': key, Accept: 'application/json' },
  });
}
