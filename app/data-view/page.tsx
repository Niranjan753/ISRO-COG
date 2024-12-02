'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

interface S3File {
  filename: string;
  folder: string;
  uploadDate: string;
  size: number;
  url: string;
}

export default function DataView() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['L1B', 'L1C', 'L2B', 'L2C']);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const timeRanges = [
    { label: 'All Day', start: '00:00', end: '23:59' },
    { label: '(6 AM - 12 PM)', start: '06:00', end: '12:00' },
    { label: '(12 PM - 5 PM)', start: '12:00', end: '17:00' },
    { label: '(5 PM - 8 PM)', start: '17:00', end: '20:00' },
    { label: '(8 PM - 6 AM)', start: '20:00', end: '06:00' }
  ];

  const levelOptions = [
    { label: 'All Levels', levels: ['L1B', 'L1C', 'L2B', 'L2C'] },
    { label: 'Level 1', levels: ['L1B', 'L1C'] },
    { label: 'Level 2', levels: ['L2B', 'L2C'] },
    { label: 'B Levels', levels: ['L1B', 'L2B'] },
    { label: 'C Levels', levels: ['L1C', 'L2C'] }
  ];

  useEffect(() => {
    // Fetch the JSON file directly from public folder
    fetch('/s3_files.json')
      .then(response => response.json())
      .then(data => {
        setFiles(data.files || []);
        setFilteredFiles(data.files || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading files:', error);
        setLoading(false);
      });
  }, []);

  const handleSearch = () => {
    let filtered = [...files];

    // Filter by time range if times are selected
    if (startTime && endTime) {
      filtered = filtered.filter(file => {
        // Extract time from filename (format: 3RIMG_04SEP2024_1015_L1B_STD_V01R00.h5)
        const timeMatch = file.filename.match(/_(\d{4})_/);
        if (!timeMatch) return false;
        
        const fileTime = timeMatch[1];
        const fileHour = parseInt(fileTime.substring(0, 2));
        const fileMinute = parseInt(fileTime.substring(2));
        
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        const endHour = parseInt(endTime.split(':')[0]);
        const endMinute = parseInt(endTime.split(':')[1]);
        
        const fileTimeInMinutes = fileHour * 60 + fileMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        // Handle overnight ranges (e.g. 20:00 - 06:00)
        if (endTimeInMinutes < startTimeInMinutes) {
          return fileTimeInMinutes >= startTimeInMinutes || fileTimeInMinutes <= endTimeInMinutes;
        }
        
        return fileTimeInMinutes >= startTimeInMinutes && fileTimeInMinutes <= endTimeInMinutes;
      });
    }

    // Filter by selected levels
    filtered = filtered.filter(file => selectedLevels.includes(file.folder));

    setFilteredFiles(filtered);
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = levelOptions.find(option => option.label === e.target.value);
    if (selectedOption) {
      setSelectedLevels(selectedOption.levels);
    }
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [start, end] = e.target.value.split(',');
    setStartTime(start);
    setEndTime(end);
  };

  const handleCheckboxChange = (filename: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(filename)) {
        return prev.filter(f => f !== filename);
      } else {
        return [...prev, filename];
      }
    });
  };

  const handleProceed = () => {
    const selectedFileNames = filteredFiles
      .filter(file => selectedFiles.includes(file.filename))
      .map(file => file.filename);
      
    // Navigate to visualizer with selected files
    window.location.href = `/visualizer?files=${encodeURIComponent(selectedFileNames.join(','))}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6 text-black">S3 Bucket Files</h1>

        {/* Search Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                onChange={handleTimeRangeChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                value={`${startTime},${endTime}`}
              >
                {timeRanges.map((range, index) => (
                  <option key={index} value={`${range.start},${range.end}`} className="text-black">
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Levels</label>
              <select
                onChange={handleLevelChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
                value={levelOptions.find(option => 
                  JSON.stringify(option.levels) === JSON.stringify(selectedLevels)
                )?.label || levelOptions[0].label}
              >
                {levelOptions.map((option, index) => (
                  <option key={index} value={option.label} className="text-black">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSearch}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Search
            </button>
          </div>
        </div>
        
        {filteredFiles.length > 0 ? (
          <>
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file, index) => {
                    const timeMatch = file.filename.match(/_(\d{4})_/);
                    const timeStr = timeMatch ? 
                      `${timeMatch[1].substring(0,2)}:${timeMatch[1].substring(2)}` : 
                      'Unknown';
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.filename)}
                            onChange={() => handleCheckboxChange(file.filename)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {file.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${file.folder === 'L1B' ? 'bg-blue-100 text-blue-800' :
                              file.folder === 'L1C' ? 'bg-green-100 text-green-800' :
                              file.folder === 'L2B' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-purple-100 text-purple-800'}`}>
                            {file.folder}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {timeStr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleProceed}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600"
                disabled={selectedFiles.length === 0}
              >
                Proceed
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            No files found matching the selected criteria.
          </div>
        )}
      </div>
    </div>
  );
}