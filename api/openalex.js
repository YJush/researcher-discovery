import { forward } from './_proxy.js';

export default function handler(req, res) {
  return forward(req, res, { allowedHost: 'api.openalex.org' });
}
