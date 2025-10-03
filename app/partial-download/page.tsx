'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';

interface FormData {
  north: string;
  south: string;
  east: string;
  west: string;
  files: File[];
}

interface ProcessingStatus {
  [key: string]: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
  };
}

function PartialDownloadContent() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormData>({
    north: searchParams.get('north') || '',
    south: searchParams.get('south') || '',
    east: searchParams.get('east') || '',
    west: searchParams.get('west') || '',
    files: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({});

  useEffect(() => {
    const filePath = searchParams.get('filePath');
    if (filePath) {
      fetch(filePath)
        .then(response => response.blob())
        .then(blob => {
          const fileName = searchParams.get('fileName') || 'downloaded_file.tif';
          const file = new File([blob], fileName);
          setFormData(prev => ({ ...prev, files: [file] }));
        })
        .catch(error => console.error('Error fetching file:', error));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (formData.files.length === 0) {
      setError('Please select at least one file');
      setLoading(false);
      return;
    }

    // Initialize processing status for all files
    const initialStatus: ProcessingStatus = {};
    formData.files.forEach(file => {
      initialStatus[file.name] = { status: 'pending' };
    });
    setProcessingStatus(initialStatus);

    try {
      // Process files in parallel with a limit
      const MAX_CONCURRENT = 3;
      const queue = [...formData.files];
      const active = new Set();

      const processQueue = async () => {
        while (queue.length > 0 || active.size > 0) {
          while (queue.length > 0 && active.size < MAX_CONCURRENT) {
            const file = queue.shift()!;
            active.add(file.name);
            processFile(file);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setSuccess('All files processed successfully!');
        setLoading(false);
      };

      const processFile = async (file: File) => {
        try {
          setProcessingStatus(prev => ({
            ...prev,
            [file.name]: { status: 'processing' }
          }));

          const formDataObj = new FormData();
          formDataObj.append('north', formData.north);
          formDataObj.append('south', formData.south);
          formDataObj.append('east', formData.east);
          formDataObj.append('west', formData.west);
          formDataObj.append('file', file);

          const response = await fetch('/api/partial-download', {
            method: 'POST',
            body: formDataObj
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process download request');
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `processed_${file.name}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          setProcessingStatus(prev => ({
            ...prev,
            [file.name]: { status: 'completed' }
          }));
        } catch (err: any) {
          setProcessingStatus(prev => ({
            ...prev,
            [file.name]: { 
              status: 'error',
              error: err.message || 'Processing failed'
            }
          }));
        } finally {
          active.delete(file.name);
        }
      };

      processQueue();
    } catch (error: any) {
      setError(error.message || 'An error occurred while processing the files');
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        files: fileList
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePresetIndia = () => {
    setFormData(prev => ({
      ...prev,
      north: '35.0',
      south: '8.0',
      east: '97.0',
      west: '68.0'
    }));
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 py-12 mt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Partial Download</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                Upload TIFF Files
              </label>
              <input
                type="file"
                name="file"
                id="file"
                multiple
                accept=".tif,.tiff"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                required
              />
              {formData.files.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                  <ul className="mt-1 text-sm text-gray-500">
                    {formData.files.map((file, index) => (
                      <li key={index} className="flex items-center justify-between py-1">
                        <span>{file.name}</span>
                        {processingStatus[file.name] && (
                          <span className={`text-sm ${
                            processingStatus[file.name].status === 'completed' ? 'text-green-500' :
                            processingStatus[file.name].status === 'error' ? 'text-red-500' :
                            processingStatus[file.name].status === 'processing' ? 'text-blue-500' :
                            'text-gray-500'
                          }`}>
                            {processingStatus[file.name].status}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePresetIndia}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Use India Coordinates
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="north" className="block text-sm font-medium text-gray-700">
                  North Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="north"
                  id="north"
                  value={formData.north}
                  onChange={handleChange}
                  placeholder="e.g., 35.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="south" className="block text-sm font-medium text-gray-700">
                  South Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="south"
                  id="south"
                  value={formData.south}
                  onChange={handleChange}
                  placeholder="e.g., 8.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="east" className="block text-sm font-medium text-gray-700">
                  East Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="east"
                  id="east"
                  value={formData.east}
                  onChange={handleChange}
                  placeholder="e.g., 97.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="west" className="block text-sm font-medium text-gray-700">
                  West Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="west"
                  id="west"
                  value={formData.west}
                  onChange={handleChange}
                  placeholder="e.g., 68.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {loading ? 'Processing...' : 'Process Regions'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PartialDownload() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-100 py-12 mt-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <p>Loading...</p>
          </div>
        </div>
      </>
    }>
      <PartialDownloadContent />
    </Suspense>
  );
}