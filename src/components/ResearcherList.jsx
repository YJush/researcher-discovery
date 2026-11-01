function ResearcherList({ researchers, loading, currentPage, setCurrentPage, totalResults, resultsPerPage }) {
  return (
    <div>
      {loading ? (
        <div className="flex justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Works</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Citations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ORCID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {researchers.map((r, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{r.display_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.institutions?.[0]?.display_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.works_count || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.cited_by_count || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.orcid || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.source || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {Math.ceil(totalResults / resultsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage * resultsPerPage >= totalResults}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export default ResearcherList;
