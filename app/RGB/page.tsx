'use client';

import { useState, useCallback, useEffect } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

type DisplayMode = 'single' | 'combine';
type RGBMode = 'natural' | 'false' | 'custom';

interface FileInfo {
  name: string;
  file: File;
  preview?: string;
}

interface BandSelection {
  R: number;
  G: number;
  B: number;
}

const API_URL = 'http://127.0.0.1:5000';

const RGBPage = () => {
  // File states
  const [file1, setFile1] = useState<FileInfo | null>(null);
  const [file2, setFile2] = useState<FileInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('single');
  const [rgbMode, setRGBMode] = useState<RGBMode>('natural');
  
  // Band selection states
  const [bandSelection, setBandSelection] = useState<BandSelection>({
    R: 4, // Default NIR band
    G: 3, // Default Red band
    B: 2  // Default Green band
  });
  
  // Display states
  const [resultImage, setResultImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Image adjustment states
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith('.tif') && !file.name.toLowerCase().endsWith('.tiff')) {
      setError('Please upload only TIFF files');
      return;
    }

    const fileInfo: FileInfo = {
      name: file.name,
      file: file
    };

    if (fileNumber === 1) {
      setFile1(fileInfo);
      if (displayMode === 'single') {
        await processRGBDisplay(fileInfo);
      }
    } else {
      setFile2(fileInfo);
    }
    setError('');
  };

  const processRGBDisplay = async (fileInfo: FileInfo) => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', fileInfo.file);
      formData.append('mode', rgbMode);
      
      // Only append band selection if in custom mode
      if (rgbMode === 'custom') {
        formData.append('r_band', bandSelection.R.toString());
        formData.append('g_band', bandSelection.G.toString());
        formData.append('b_band', bandSelection.B.toString());
      }
      
      formData.append('brightness', brightness.toString());
      formData.append('contrast', contrast.toString());
      formData.append('saturation', saturation.toString());

      console.log('Sending request with:', {
        mode: rgbMode,
        bandSelection: rgbMode === 'custom' ? bandSelection : 'using default bands',
        adjustments: { brightness, contrast, saturation }
      });

      const response = await axios.post(`${API_URL}/rgb_display`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        }
      });

      if (response.status !== 200) {
        throw new Error(response.data.error || 'Failed to process image');
      }
      
      if (response.data.result_image) {
        setResultImage(`${API_URL}/uploads/${response.data.result_image}`);
        console.log('Band info:', response.data.bands_info);
      }
    } catch (err: any) {
      console.error('Error processing RGB display:', err);
      setError(err.response?.data?.error || err.message || 'Error processing file');
    } finally {
      setLoading(false);
    }
  };

  const handleCombineFiles = async () => {
    if (!file1 || !file2) {
      setError('Please upload both files');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file1', file1.file);
    formData.append('file2', file2.file);
    formData.append('mode', rgbMode);
    formData.append('r_band', bandSelection.R.toString());
    formData.append('g_band', bandSelection.G.toString());
    formData.append('b_band', bandSelection.B.toString());
    formData.append('brightness', brightness.toString());
    formData.append('contrast', contrast.toString());
    formData.append('saturation', saturation.toString());

    try {
      const response = await axios.post(`${API_URL}/rgb_combine`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.result_image) {
        setResultImage(`${API_URL}/uploads/${response.data.result_image}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error combining files. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update display when mode or adjustments change
  useEffect(() => {
    if (file1 && displayMode === 'single') {
      processRGBDisplay(file1);
    } else if (file1 && file2 && displayMode === 'combine') {
      handleCombineFiles();
    }
  }, [rgbMode, bandSelection, brightness, contrast, saturation]);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      
      <main className="flex-1 flex mt-16">
        <div className="w-64 bg-gray-100 p-4">
          <div className="space-y-4">
            {/* Display Mode Selection */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Display Mode</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDisplayMode('single')}
                  className={`flex-1 p-2 rounded ${
                    displayMode === 'single'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Single File
                </button>
                <button
                  onClick={() => setDisplayMode('combine')}
                  className={`flex-1 p-2 rounded ${
                    displayMode === 'combine'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Combine Files
                </button>
              </div>
            </div>

            {/* File Upload Section */}
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

                {displayMode === 'combine' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Second TIFF File
                    </label>
                    <input
                      type="file"
                      accept=".tif,.tiff"
                      onChange={(e) => handleFileUpload(e, 2)}
                      className="w-full text-gray-900"
                      disabled={loading}
                    />
                    {file2 && (
                      <p className="mt-1 text-sm text-gray-500">
                        Selected: {file2.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RGB Mode Selection */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">RGB Mode</h2>
              <select
                value={rgbMode}
                onChange={(e) => setRGBMode(e.target.value as RGBMode)}
                className="w-full p-2 rounded border text-gray-700"
                disabled={loading}
              >
                <option value="natural">Natural Color</option>
                <option value="false">False Color</option>
                <option value="custom">Custom Bands</option>
              </select>
            </div>

            {/* Custom Band Selection */}
            {rgbMode === 'custom' && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Band Selection</h2>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Red Band</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={bandSelection.R}
                      onChange={(e) => setBandSelection(prev => ({ ...prev, R: parseInt(e.target.value) }))}
                      className="w-full p-2 rounded border text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Green Band</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={bandSelection.G}
                      onChange={(e) => setBandSelection(prev => ({ ...prev, G: parseInt(e.target.value) }))}
                      className="w-full p-2 rounded border text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Blue Band</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={bandSelection.B}
                      onChange={(e) => setBandSelection(prev => ({ ...prev, B: parseInt(e.target.value) }))}
                      className="w-full p-2 rounded border text-gray-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Image Adjustments */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Image Adjustments</h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Brightness ({brightness})
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contrast ({contrast})
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Saturation ({saturation})
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white p-4">
          <div className="h-full rounded-lg border-2 border-gray-200 flex items-center justify-center">
            {loading ? (
              <div className="text-gray-500">Processing...</div>
            ) : resultImage ? (
              <img
                src={resultImage}
                alt="RGB Result"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-gray-500">
                {displayMode === 'single' 
                  ? 'Upload a TIFF file to see RGB display'
                  : 'Upload two TIFF files to see combined RGB display'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RGBPage;