'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

const levelDescriptions = [
  {
    id: 1,
    level: 'L1B',
    description: 'Level-1B data contains calibrated and quality-controlled data in sensor coordinates. Available bands: MIR, TIR1, TIR2, WV',
    times: ['1015', '1315']
  },
  {
    id: 2,
    level: 'L1C',
    description: 'Level-1C data provides orthorectified data in cartographic coordinates. Includes atmospheric corrections.',
    times: ['1015', '1315']
  },
  {
    id: 3,
    level: 'L2B',
    description: 'Level-2B data offers derived meteorological parameters. Includes atmospheric motion vectors.',
    times: ['1015', '1315']
  },
  {
    id: 4,
    level: 'L2C',
    description: 'Level-2C data provides advanced meteorological products including precipitation estimates.',
    times: ['1015', '1315']
  }
];

export default function DataView() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProceed = async (level: string, time: string) => {
    if (!level || !time) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/s3-files?level=${level}&time=${time}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        const fileInfo = data.files.map((file: any) => ({
          url: file.url,
          band: file.band,
          filename: file.filename
        }));
        
        router.push(`/visualizer?files=${encodeURIComponent(JSON.stringify(fileInfo))}`);
      } else {
        alert('No files found for selected criteria');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to fetch files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6 text-black">INSAT Data Levels</h1>
        
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Times
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {levelDescriptions.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.level}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      onChange={(e) => {
                        setSelectedLevel(item.level);
                        setSelectedTime(e.target.value);
                      }}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select Time</option>
                      {item.times.map((time) => (
                        <option key={time} value={time}>
                          {time.slice(0, 2) + ":" + time.slice(2)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleProceed(item.level, selectedTime)}
                      disabled={loading || selectedLevel !== item.level || !selectedTime}
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        ${loading || selectedLevel !== item.level || !selectedTime
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {loading ? 'Loading...' : 'Proceed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}