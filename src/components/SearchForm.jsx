import { useState } from 'react';

function SearchForm({ onSearch, loading }) {
  const [keywords, setKeywords] = useState('');
  const [institutions, setInstitutions] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({
      keywords: keywords.split(',').map((k) => k.trim()).filter((k) => k),
      institutions: institutions.split(',').map((i) => i.trim()).filter((i) => i),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
          Keywords (comma-separated)
        </label>
        <input
          type="text"
          id="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., machine learning, biology"
        />
      </div>
      <div>
        <label htmlFor="institutions" className="block text-sm font-medium text-gray-700 mb-1">
          Institutions (comma-separated)
        </label>
        <input
          type="text"
          id="institutions"
          value={institutions}
          onChange={(e) => setInstitutions(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Stanford University, MIT"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}

export default SearchForm;
