import { forward } from './_proxy.js';

export default function handler(req, res) {
  const key = process.env.NIH_API_KEY;
  return forward(req, res, {
    allowedHost: 'eutils.ncbi.nlm.nih.gov',
    mutateUrl: (url) => {
      url.searchParams.delete('api_key');
      if (key) url.searchParams.set('api_key', key);
    },
  });
}
