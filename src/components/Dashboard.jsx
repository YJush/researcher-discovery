import { useEffect, useState } from 'react';
import { Users, Book, Building, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [researchers, setResearchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchResearchers() {
      try {
        // Your backend endpoint that proxies the Scopus API
        const res = await fetch('/api/scopus?url=https://api.elsevier.com/content/search/scopus?query=AFFIL(org)');
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        const data = await res.json();

        // Adapt this depending on actual API response structure:
        // Here I'm assuming data.searchResults.entry is an array of researchers
        const researchersData = data.searchResults?.entry || [];
        setResearchers(researchersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResearchers();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">Failed to load researchers: {error}</p>;

  const totalWorks = researchers.reduce((sum, r) => sum + (r.works_count || 0), 0);
  const institutions = new Set(researchers.flatMap((r) => r.institutions?.map((i) => i.display_name) || []));
  const avgCitations = Math.round(researchers.reduce((sum, r) => sum + (r.cited_by_count || 0), 0) / (researchers.length || 1));

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* ... your same cards here ... */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Researchers</p>
            <p className="text-2xl font-bold text-gray-900">{researchers.length}</p>
          </div>
          <Users className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Repeat for other cards with totalWorks, institutions.size, avgCitations */}
      {/* ... */}
    </div>
  );
}
