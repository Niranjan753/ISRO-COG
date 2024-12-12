'use client';

import { useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'ndvi';

interface FileInfo {
  name: string;
  file: File;
}

const API_URL = 'http://127.0.0.1:5000';

const ArithmeticsPage = () => {
  const [file1, setFile1] = useState<FileInfo | null>(null);
  const [file2, setFile2] = useState<FileInfo | null>(null);
  const [operation, setOperation] = useState<Operation>('add');
  const [resultImage, setResultImage] = useState<string>('');
  const [resultTiff, setResultTiff] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith('.tif') && !file.name.toLowerCase().endsWith('.tiff')) {
      setError('Please upload only TIFF files');
      return;
    }

    if (fileNumber === 1) {
      setFile1({ name: file.name, file });
    } else {
      setFile2({ name: file.name, file });
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file1 || !file2) {
      setError('Please upload both TIFF files');
      return;
    }

    setLoading(true);
    setError('');
    setResultImage('');
    setResultTiff('');

    const formData = new FormData();
    formData.append('file1', file1.file);
    formData.append('file2', file2.file);
    formData.append('operation', operation);

    try {
      const response = await axios.post(`${API_URL}/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.result_image) {
        setResultImage(`${API_URL}/uploads/${response.data.result_image}`);
        setResultTiff(response.data.result_tiff);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error processing files. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = useCallback(() => {
    if (resultTiff) {
      window.open(`${API_URL}/download/${resultTiff}`, '_blank');
    }
  }, [resultTiff]);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      
      <main className="flex-1 flex mt-16">
        <div className="w-64 bg-gray-100 p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload TIFF Files</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First TIFF File
                  </label>
                  <input
                    type="file"
                    accept=".tif,.tiff"
                    onChange={(e) => handleFileUpload(e, 1)}
                    className="w-full text-gray-900"
                    disabled={loading}
                  />
                  {file1 && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {file1.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Second TIFF File
                  </label>
                  <input
                    type="file"
                    accept=".tif,.tiff"
                    onChange={(e) => handleFileUpload(e, 2)}
                    className="w-full"
                    disabled={loading}
                  />
                  {file2 && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {file2.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Operation</h2>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as Operation)}
                className="w-full p-2 rounded border text-gray-700"
                disabled={loading}
              >
                <option value="add">Add</option>
                <option value="subtract">Subtract</option>
                <option value="multiply">Multiply</option>
                <option value="divide">Divide</option>
                <option value="ndvi">NDVI</option>
              </select>
            </div>

            {error && (
              <div className="mb-4 text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !file1 || !file2}
              className={`w-full p-2 rounded ${
                loading || !file1 || !file2
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {loading ? 'Processing...' : 'Calculate'}
            </button>

            {resultTiff && (
              <button
                type="button"
                onClick={downloadResult}
                className="w-full p-2 rounded bg-green-500 text-white hover:bg-green-600 mt-4"
              >
                Download Result
              </button>
            )}
          </form>
        </div>

        <div className="flex-1 bg-white p-4">
          <div className="h-full rounded-lg border-2 border-gray-200 flex items-center justify-center">
            {loading ? (
              <div className="text-gray-500">Processing...</div>
            ) : resultImage ? (
              <img
                src={resultImage}
                alt="Result"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-gray-500">
                Upload two TIFF files and perform an operation to see the result
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArithmeticsPage;