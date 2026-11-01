import { useState, useEffect } from 'react';

function AuthorSearch({ onSearch, loading }) {
  const [authorName, setAuthorName] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (authorName.length > 2 && !authorName.includes(',')) {
        fetchSuggestions(authorName);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [authorName]);

  const fetchSuggestions = async (query) => {
    try {
      const apiUrl = `https://api.openalex.org/autocomplete/authors?q=${encodeURIComponent(query)}`;
      const response = await fetch(`https://hooks.jdoodle.net/proxy?url=${encodeURIComponent(apiUrl)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      setSuggestions(data.results || []);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (authorName) {
      onSearch(authorName);
    }
  };

  const handleSelectSuggestion = (name) => {
    setAuthorName((prev) => (prev.includes(',') ? `${prev}, ${name}` : name));
    setSuggestions([]);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">
          Author Name(s)
        </label>
        <input
          type="text"
          id="authorName"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter author name(s), comma separated"
        />
        {suggestions.length > 0 && (
          <ul className="mt-1 border border-gray-300 rounded-md bg-white max-h-40 overflow-y-auto">
            {suggestions.map((sug, index) => (
              <li
                key={index}
                onClick={() => handleSelectSuggestion(sug.display_name)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                {sug.display_name} {sug.hint ? `(${sug.hint})` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Searching...' : 'Search Author(s)'}
      </button>
    </form>
  );
}

export default AuthorSearch;
