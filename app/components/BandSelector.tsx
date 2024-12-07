import React from 'react';

interface BandSelectorProps {
  bands: string[];
  selectedBand: string;
  onBandChange: (band: string) => void;
}

export default function BandSelector({ bands, selectedBand, onBandChange }: BandSelectorProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-semibold text-lg mb-4 text-gray-900">Select Band</h3>
      <select
        value={selectedBand}
        onChange={(e) => onBandChange(e.target.value)}
        className="w-full p-2 border border-gray-200 rounded"
      >
        <option value="">Select a band</option>
        {bands.map((band) => (
          <option key={band} value={band}>
            {band}
          </option>
        ))}
      </select>
    </div>
  );
}