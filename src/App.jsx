import { useState } from 'react';
import { Download, Database, User, AlertCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SearchForm from './components/SearchForm';
import AuthorSearch from './components/AuthorSearch';
import ResearcherList from './components/ResearcherList';


// Provider calls that need credentials go through our own /api routes,
// which hold the keys server-side and only forward to approved hosts.
const viaProxy = (provider, url) => `/api/${provider}?url=${encodeURIComponent(url)}`;

function App() {
  const [researchers, setResearchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('filters');
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  const retryFetch = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching ${url} (Attempt ${i + 1})`); // Debug log
        const response = await fetch(url, options);
        if (!response.ok && response.status === 429) {
          console.warn(`Rate limit hit, waiting ${delay * Math.pow(2, i)}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
          continue;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status} for ${url}`);
        }
        return response;
      } catch (err) {
        console.error(`Fetch error for ${url}:`, err);
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  };

  const searchWithOpenAlex = async (searchFilters, page = 1) => {
    const institutionFilters = searchFilters.institutions.map((inst) => {
      const instMap = {
        'ETH Zurich': 'I18014466',
        'Stanford University': 'I97018004',
        'EPFL': 'I109410719',
        'Karolinska Institute': 'I137902535',
        'Harvard University': 'I136199984',
        'MIT': 'I63966007',
        'University of Cambridge': 'I15126616',
        'Oxford University': 'I161017804',
      };
      return instMap[inst] || inst;
    });

    const institutionQuery = institutionFilters.join('|');
    const keywordQuery = searchFilters.keywords.map((k) => k.replace(/\s+/g, '+')).join('|');
    const apiUrl = `https://api.openalex.org/authors?filter=last_known_institutions.id:${institutionQuery},works_count:>5&search=${keywordQuery}&sort=cited_by_count:desc&per_page=${resultsPerPage}&page=${page}`;

    try {
      const response = await retryFetch(apiUrl, { method: 'GET' });
      const data = await response.json();
      return data.results?.map((author) => ({
        display_name: author.display_name,
        institutions: author.last_known_institutions,
        works_count: author.works_count,
        cited_by_count: author.cited_by_count,
        orcid: author.orcid,
        source: 'OpenAlex',
        external_id: author.id,
      })) || [];
    } catch (err) {
      console.error('OpenAlex search error:', err);
      setError('Failed to fetch data from OpenAlex. Please try again later.');
      return [];
    }
  };

  const fetchScopusAbstractEmails = async (scopusId) => {
    try {
      const worksUrl = `https://api.elsevier.com/content/search/scopus?query=AU-ID(${encodeURIComponent(scopusId)})&sort=citedby-count&count=5`;
      const worksResponse = await retryFetch(viaProxy('scopus', worksUrl), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const worksData = await worksResponse.json();
      const entries = worksData['search-results']?.entry || [];

      let email = null;
      for (const entry of entries) {
        const eid = entry['eid'] || '';
        if (!eid) continue;
        const abstractUrl = `https://api.elsevier.com/content/abstract/eid/${encodeURIComponent(eid)}`;
        const abstractResponse = await retryFetch(viaProxy('scopus', abstractUrl), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
        const abstractData = await abstractResponse.json();
        const corrAuthor = abstractData['abstracts-retrieval-response']?.coredata?.['dc:creator']?.author;
        if (Array.isArray(corrAuthor)) {
          for (const author of corrAuthor) {
            const emailMatch = author['ce:e-address']?.['$'] || author['ce:e-address'];
            if (emailMatch && typeof emailMatch === 'string' && emailMatch.includes('@')) {
              email = emailMatch;
              break;
            }
          }
        } else if (corrAuthor && corrAuthor['ce:e-address']) {
          const emailMatch = corrAuthor['ce:e-address']['$'] || corrAuthor['ce:e-address'];
          if (emailMatch && typeof emailMatch === 'string' && emailMatch.includes('@')) {
            email = emailMatch;
          }
        }
        if (email) break;
      }
      return email;
    } catch (err) {
      console.error(`Scopus email fetch error for ID ${scopusId}:`, err);
      return null;
    }
  };

  const searchWithScopus = async (searchFilters, page = 1) => {

    const keywords = searchFilters.keywords.join(' OR ');
    const institutions = searchFilters.institutions.join(' OR ');
    const apiUrl = `https://api.elsevier.com/content/search/author?query=SUBJAREA(BIOC OR CHEM OR MATE) AND (${keywords}) AND AFFIL(${institutions})&count=${resultsPerPage}&start=${(page - 1) * resultsPerPage}`;

    try {
      const response = await retryFetch(viaProxy('scopus', apiUrl), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const data = await response.json();
      if (data['service-error']) {
        throw new Error(data['service-error']['status']['statusText'] || 'Scopus API error');
      }
      const authors = data['search-results']?.entry || [];
      const results = [];
      for (const author of authors) {
        const scopusId = author['dc:identifier']?.replace('AUTHOR_ID:', '');
        const email = scopusId ? await fetchScopusAbstractEmails(scopusId) : null;
        results.push({
          display_name: `${author['preferred-name']?.['given-name'] || ''} ${author['preferred-name']?.['surname'] || ''}`,
          institutions: [{ display_name: author['affiliation-current']?.['affiliation-name'] || 'Unknown' }],
          works_count: parseInt(author['document-count']) || 0,
          cited_by_count: parseInt(author['cited-by-count']) || 0,
          orcid: author.orcid,
          source: 'Scopus',
          external_id: author['dc:identifier'],
          scopus_id: author['dc:identifier'],
          email,
        });
      }
      return results;
    } catch (err) {
      console.error('Scopus search error:', err);
      if (err.message.includes('401')) {
        setError('Invalid Scopus API key. Please check your API key in the .env file or Vercel environment variables.');
      } else {
        setError('Failed to fetch data from Scopus. Please try again later.');
      }
      return [];
    }
  };

  const searchWithNIH = async (searchFilters, page = 1) => {
    const keywords = searchFilters.keywords.join(' OR ');
    const apiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(keywords)}&retmax=${resultsPerPage}&retstart=${(page - 1) * resultsPerPage}&retmode=json`;

    try {
      const response = await retryFetch(viaProxy('nih', apiUrl), { method: 'GET' });
      const data = await response.json();
      const pmids = data.esearchresult?.idlist || [];
      if (pmids.length === 0) return [];

      const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
      const detailsResponse = await retryFetch(viaProxy('nih', detailsUrl), { method: 'GET' });
      const xmlText = await detailsResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const articles = xmlDoc.getElementsByTagName('PubmedArticle');
      const authorsMap = new Map();

      Array.from(articles).forEach((article) => {
        const authors = article.getElementsByTagName('Author');
        Array.from(authors).forEach((author) => {
          const lastName = author.getElementsByTagName('LastName')[0]?.textContent;
          const foreName = author.getElementsByTagName('ForeName')[0]?.textContent;
          const affiliationElem = author.getElementsByTagName('Affiliation')[0];
          const affiliation = affiliationElem?.textContent;
          const emailMatch = affiliation ? affiliation.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/) : null;

          if (lastName && foreName) {
            const fullName = `${foreName} ${lastName}`;
            if (!authorsMap.has(fullName)) {
              authorsMap.set(fullName, {
                display_name: fullName,
                institutions: affiliation ? [{ display_name: affiliation.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+).*$/, '').trim() }] : [],
                works_count: 1,
                cited_by_count: 0,
                source: 'NIH/PubMed',
                pmid: pmids[0],
                email: emailMatch ? emailMatch[0] : null,
              });
            } else {
              const existing = authorsMap.get(fullName);
              existing.works_count++;
              if (emailMatch && !existing.email) {
                existing.email = emailMatch[0];
                if (affiliation) {
                  existing.institutions[0].display_name = affiliation.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+).*$/, '').trim();
                }
              }
            }
          }
        });
      });

      return Array.from(authorsMap.values());
    } catch (err) {
      console.error('NIH search error:', err);
      setError('Failed to fetch data from NIH/PubMed. Please try again later.');
      return [];
    }
  };

  const searchAuthorOpenAlex = async (authorName, page = 1) => {
    const apiUrl = `https://api.openalex.org/authors?search=${encodeURIComponent(authorName)}&per_page=${resultsPerPage}&page=${page}`;
    try {
      const response = await retryFetch(apiUrl, { method: 'GET' });
      const data = await response.json();
      return data.results?.map((author) => ({
        display_name: author.display_name,
        institutions: author.last_known_institutions,
        works_count: author.works_count,
        cited_by_count: author.cited_by_count,
        orcid: author.orcid,
        source: 'OpenAlex',
        external_id: author.id,
      })) || [];
    } catch (err) {
      console.error('OpenAlex author search error:', err);
      setError('Failed to fetch author data from OpenAlex. Please try again later.');
      return [];
    }
  };

  const searchAuthorScopus = async (authorName, page = 1) => {

    const apiUrl = `https://api.elsevier.com/content/search/author?query=AUTHLASTNAME(${encodeURIComponent(authorName)})&count=${resultsPerPage}&start=${(page - 1) * resultsPerPage}`;

    try {
      const response = await retryFetch(viaProxy('scopus', apiUrl), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const data = await response.json();
      if (data['service-error']) {
        throw new Error(data['service-error']['status']['statusText'] || 'Scopus API error');
      }
      const authors = data['search-results']?.entry || [];
      const results = [];
      for (const author of authors) {
        const scopusId = author['dc:identifier']?.replace('AUTHOR_ID:', '');
        const email = scopusId ? await fetchScopusAbstractEmails(scopusId) : null;
        results.push({
          display_name: `${author['preferred-name']?.['given-name'] || ''} ${author['preferred-name']?.['surname'] || ''}`,
          institutions: [{ display_name: author['affiliation-current']?.['affiliation-name'] || 'Unknown' }],
          works_count: parseInt(author['document-count']) || 0,
          cited_by_count: parseInt(author['cited-by-count']) || 0,
          orcid: author.orcid,
          source: 'Scopus',
          external_id: author['dc:identifier'],
          scopus_id: author['dc:identifier'],
          email,
        });
      }
      return results;
    } catch (err) {
      console.error('Scopus author search error:', err);
      if (err.message.includes('401')) {
        setError('Invalid Scopus API key. Please check your API key in the .env file or Vercel environment variables.');
      } else {
        setError('Failed to fetch author data from Scopus. Please try again later.');
      }
      return [];
    }
  };

  const deduplicateResearchers = (results) => {
    const seen = new Map();
    results.forEach((researcher) => {
      const key = researcher.orcid || researcher.external_id || researcher.scopus_id || researcher.pmid || researcher.display_name;
      if (!seen.has(key)) {
        seen.set(key, researcher);
      } else {
        const existing = seen.get(key);
        existing.works_count = Math.max(existing.works_count || 0, researcher.works_count || 0);
        existing.cited_by_count = Math.max(existing.cited_by_count || 0, researcher.cited_by_count || 0);
        existing.institutions = [...new Set([...(existing.institutions || []), ...(researcher.institutions || [])])];
        if (researcher.email && !existing.email) {
          existing.email = researcher.email;
        }
      }
    });
    return Array.from(seen.values()).sort((a, b) => (b.cited_by_count || 0) - (a.cited_by_count || 0));
  };

  const searchResearchers = async (searchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const [openAlexResults, scopusResults, nihResults] = await Promise.allSettled([
        searchWithOpenAlex(searchFilters, currentPage),
        searchWithScopus(searchFilters, currentPage),
        searchWithNIH(searchFilters, currentPage),
      ]);

      const allResults = [
        ...(openAlexResults.status === 'fulfilled' ? openAlexResults.value : []),
        ...(scopusResults.status === 'fulfilled' ? scopusResults.value : []),
        ...(nihResults.status === 'fulfilled' ? nihResults.value : []),
      ];

      const uniqueResults = deduplicateResearchers(allResults);
      setResearchers(uniqueResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('An unexpected error occurred during the search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchAuthor = async (authorQuery) => {
    setLoading(true);
    setError(null);
    try {
      const names = authorQuery.split(',').map((n) => n.trim()).filter((n) => n);
      let allResults = [];

      for (const name of names) {
        const [openAlexResults, scopusResults] = await Promise.allSettled([
          searchAuthorOpenAlex(name, currentPage),
          searchAuthorScopus(name, currentPage),
        ]);

        allResults = [
          ...allResults,
          ...(openAlexResults.status === 'fulfilled' ? openAlexResults.value : []),
          ...(scopusResults.status === 'fulfilled' ? scopusResults.value : []),
        ];
      }

      const uniqueResults = deduplicateResearchers(allResults);
      setResearchers(uniqueResults);
    } catch (err) {
      console.error('Author search error:', err);
      setError('An unexpected error occurred during the author search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csv = [
      ['Name', 'Institution', 'Works Count', 'Citations', 'ORCID', 'Email', 'Source', 'External ID'],
      ...researchers.map((r) => [
        r.display_name || 'N/A',
        r.institutions?.[0]?.display_name || 'N/A',
        r.works_count || 0,
        r.cited_by_count || 0,
        r.orcid || 'N/A',
        r.email || 'N/A',
        r.source || 'N/A',
        r.external_id || r.scopus_id || r.pmid || 'N/A',
      ]),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'researchers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Research Database</h1>
            </div>
            {researchers.length > 0 && (
              <button
                onClick={exportData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('filters')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'filters'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Database className="h-4 w-4 inline mr-2" />
                    Filters
                  </button>
                  <button
                    onClick={() => setActiveTab('author')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'author'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <User className="h-4 w-4 inline mr-2" />
                    Author
                  </button>
                </nav>
              </div>
              {activeTab === 'filters' ? (
                <SearchForm onSearch={searchResearchers} loading={loading} />
              ) : (
                <AuthorSearch onSearch={searchAuthor} loading={loading} />
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-8">
            <Dashboard researchers={researchers} />
            <ResearcherList
              researchers={researchers.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage)}
              loading={loading}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalResults={researchers.length}
              resultsPerPage={resultsPerPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
