'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

const levelDescriptions = [
  {
    id: 1,
    level: 'L1B',
    description: 'Level-1B data contains calibrated and quality-controlled data in sensor coordinates. Available bands: MIR, TIR1, TIR2, WV',
    times: []
  },
  {
    id: 2,
    level: 'L1C',
    description: 'Level-1C data provides orthorectified data in cartographic coordinates. Includes atmospheric corrections.',
    times: []
  },
  {
    id: 3,
    level: 'L2B',
    description: 'Level-2B data offers derived meteorological parameters. Includes atmospheric motion vectors.',
    times: []
  },
  {
    id: 4,
    level: 'L2C',
    description: 'Level-2C data provides advanced meteorological products including precipitation estimates.',
    times: []
  }
];

export default function DataView() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<{ [key: string]: Set<string> }>({});

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      try {
        const response = await fetch('/s3_files.json');
        const data = await response.json();
        const timesMap: { [key: string]: Set<string> } = {};
        data.files.forEach((file: any) => {
          if (!timesMap[file.level]) {
            timesMap[file.level] = new Set();
          }
          timesMap[file.level].add(file.time.replace(':', ''));
        });
        setAvailableTimes(timesMap);
      } catch (error) {
        console.error('Error loading available times:', error);
      }
    };
    fetchAvailableTimes();
  }, []);

  const handleProceed = async (level: string, time: string) => {
    if (!level || !time) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/s3-files?level=${level}&time=${time}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
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
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px] rounded-lg">
          <div className="bg-white overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['S.No', 'Level', 'Description', 'Available Times', 'Action'].map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {levelDescriptions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.level}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        onChange={(e) => {
                          setSelectedLevel(item.level);
                          setSelectedTime(e.target.value);
                        }}
                        className="mt-1 block w-full pl-3 pr-10 py-2 mr-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black bg-white"
                      >
                        <option value="">Select Time </option>
                        {availableTimes[item.level] && Array.from(availableTimes[item.level]).sort().map((time) => (
                          <option key={time} value={time}>{time.slice(0, 2) + ":" + time.slice(2)}</option>
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
      <footer className="bg-gray-900 text-white mt-20 w-full">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">GEO-NIMBUS</h3>
              <p className="text-gray-400">Transforming INSAT data into cloud-native formats for advanced geospatial analysis</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {['Home', 'About', 'Visualizer', 'Data View'].map((link) => (
                  <li key={link}><a href={`/${link.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Technology</h4>
              <ul className="space-y-2">
                {['AWS S3', 'Cloud-Optimized GeoTIFF', 'WebAssembly', 'GDAL'].map((tech) => (
                  <li key={tech} className="text-gray-400">{tech}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                For inquiries, please contact:<br />
                <a href="mailto:info@geo-nimbus.com" className="text-indigo-400 hover:text-indigo-300">info@geo-nimbus.com</a>
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} GEO-NIMBUS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}