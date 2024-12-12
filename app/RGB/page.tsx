'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';

type FileInfo = {
  name: string;
  file: File;
  preview?: string;
};

interface BandThresholds {
  min: number;
  max: number;
}

interface ThresholdState {
  R: BandThresholds;
  G: BandThresholds;
  B: BandThresholds;
}

const API_URL = 'http://127.0.0.1:5001';  // Note: Using port 5001 for RGB processor

const RGBPage = () => {
  // File state
  const [file, setFile] = useState<FileInfo | null>(null);
  
  // Threshold states
  const [thresholds, setThresholds] = useState<ThresholdState>({
    R: { min: 0, max: 255 },
    G: { min: 0, max: 255 },
    B: { min: 0, max: 255 }
  });
  
  // Image adjustment states
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  
  // Display states
  const [resultImage, setResultImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [bandStats, setBandStats] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith('.tif') && !file.name.toLowerCase().endsWith('.tiff')) {
      setError('Please upload only TIFF files');
      return;
    }

    setFile({
      name: file.name,
      file: file
    });
    
    // Process the file immediately
    await processRGBImage(file);
  };

  const processRGBImage = async (imageFile: File) => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      
      // Add thresholds
      formData.append('r_min', thresholds.R.min.toString());
      formData.append('r_max', thresholds.R.max.toString());
      formData.append('g_min', thresholds.G.min.toString());
      formData.append('g_max', thresholds.G.max.toString());
      formData.append('b_min', thresholds.B.min.toString());
      formData.append('b_max', thresholds.B.max.toString());
      
      // Add adjustments
      formData.append('brightness', brightness.toString());
      formData.append('contrast', contrast.toString());
      formData.append('saturation', saturation.toString());

      const response = await axios.post(`${API_URL}/rgb_process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.result_image) {
        setResultImage(`${API_URL}/uploads/${response.data.result_image}`);
        if (response.data.bands_info?.band_statistics) {
          setBandStats(response.data.bands_info.band_statistics);
        }
      }
    } catch (err: any) {
      console.error('Error processing RGB image:', err);
      setError(err.response?.data?.error || err.message || 'Error processing file');
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (
    band: keyof ThresholdState,
    type: 'min' | 'max',
    value: number
  ) => {
    setThresholds(prev => ({
      ...prev,
      [band]: {
        ...prev[band],
        [type]: value
      }
    }));
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      
      <main className="flex-1 flex mt-16">
        <div className="w-64 bg-gray-100 p-4">
          <div className="space-y-4">
            {/* File Upload Section */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload TIFF File</h2>
              <input
                type="file"
                accept=".tif,.tiff"
                onChange={handleFileUpload}
                className="w-full text-gray-900"
                disabled={loading}
              />
              {file && (
                <p className="mt-1 text-sm text-gray-500">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {/* Band Thresholds */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Band Thresholds</h2>
              {(['R', 'G', 'B'] as const).map(band => (
                <div key={band} className="mb-3">
                  <h3 className="font-medium text-gray-700">{band} Band</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-gray-600">Min Value</label>
                      <input
                        type="number"
                        value={thresholds[band].min}
                        onChange={(e) => handleThresholdChange(band, 'min', Number(e.target.value))}
                        className="w-full p-1 border rounded"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Max Value</label>
                      <input
                        type="number"
                        value={thresholds[band].max}
                        onChange={(e) => handleThresholdChange(band, 'max', Number(e.target.value))}
                        className="w-full p-1 border rounded"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Band Statistics */}
            {bandStats && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Band Statistics</h2>
                {Object.entries(bandStats).map(([band, stats]: [string, any]) => (
                  <div key={band} className="mb-2">
                    <h3 className="font-medium text-gray-700 capitalize">{band}</h3>
                    <div className="text-sm text-gray-600">
                      <p>Min: {stats.min.toFixed(2)}</p>
                      <p>Max: {stats.max.toFixed(2)}</p>
                      <p>Mean: {stats.mean.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                Upload a TIFF file to see RGB visualization
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RGBPage;