"use client";
import { useState, useEffect } from 'react';
import Navbar from "../components/Navbar";

interface S3Object {
  key: string;
  lastModified: string;
  size: number;
}

export default function COGToolsPage() {
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<S3Object[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchObjects();
  }, []);

  useEffect(() => {
    const filtered = objects.filter(obj => 
      obj.key.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredObjects(filtered);
  }, [searchQuery, objects]);

  const fetchObjects = async () => {
    try {
      const response = await fetch('/api/assignurl');
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setObjects(data.objects);
        setFilteredObjects(data.objects);
      }
    } catch (err) {
      setError('Failed to fetch objects');
    } finally {
      setLoading(false);
    }
  };

  const generatePresignedUrl = async (objectKey: string) => {
    try {
      const response = await fetch('/api/assignurl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objectKey }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPresignedUrl(data.url);
      }
    } catch (err) {
      setError('Failed to generate pre-signed URL');
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">S3 Object Browser</h1>
          
          {loading && (
            <div className="text-center">
              <p className="text-gray-600">Loading objects...</p>
            </div>
          )}

          {error && (
            <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              
              <div className="overflow-y-auto max-h-[400px] border rounded border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">File</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredObjects.map((object) => (
                      <tr key={object.key} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{object.key}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{formatSize(object.size)}</td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => generatePresignedUrl(object.key)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            Generate URL
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {presignedUrl && (
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Pre-signed URL</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={presignedUrl}
                      readOnly
                      className="flex-1 p-1.5 text-sm border rounded bg-white border-gray-200"
                    />
                    <a
                      href={presignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded text-xs transition-colors"
                    >
                      Open
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
