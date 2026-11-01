# Researcher Discovery

[![CI](https://github.com/YJush/researcher-discovery/actions/workflows/ci.yml/badge.svg)](https://github.com/YJush/researcher-discovery/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-B8390D.svg)](LICENSE)

Find researchers by topic, institution or name across OpenAlex, Scopus and PubMed (NIH). Review affiliations, publication counts, citations and ORCID identifiers in one interface, then export the shortlist to CSV.

Built by [Industry Contents](https://industrycontents.com) for research sourcing and editorial expert discovery.

## Features

- Search by keyword and institution, or look up an author by name.
- Unified result cards: name, institution, works count, citations, ORCID and source ID.
- Dashboard summary and paginated results.
- CSV export.

## Architecture

The React client never holds provider credentials. Requests that need a key go through serverless routes in `api/`, which attach the key server-side and forward only to approved hosts:

| Route | Upstream host |
| --- | --- |
| `/api/scopus` | `api.elsevier.com` |
| `/api/nih` | `eutils.ncbi.nlm.nih.gov` |
| `/api/openalex` | `api.openalex.org` |

## Stack

React 18, Vite, Tailwind CSS, Vercel serverless functions.

## Getting started

```sh
git clone https://github.com/YJush/researcher-discovery.git
cd researcher-discovery
npm ci
npm run dev
```

For the Scopus and NIH routes, set `SCOPUS_API_KEY` and `NIH_API_KEY` in your hosting environment (see `.env.example`). OpenAlex works without a key. Run with `vercel dev` to exercise the `api/` routes locally.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

## Responsible use

Results come from third-party indexes and show who published, not who should be contacted. Check source terms and applicable data-protection rules (including GDPR) before any outreach.

## Security

See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Yajush Gupta
