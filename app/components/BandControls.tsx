import React from 'react';

interface BandControlsProps {
  onRemoveBand: () => void;
  onApplyBand: () => void;
  selectedBand: string | null;
}

export default function BandControls({ onRemoveBand, onApplyBand, selectedBand }: BandControlsProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow mt-4">
      <div className="flex space-x-4">
        <button
          onClick={onRemoveBand}
          disabled={!selectedBand}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
        >
          Remove Band
        </button>
        <button
          onClick={onApplyBand}
          disabled={!selectedBand}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          Apply Band
        </button>
      </div>
    </div>
  );
} 