import React from 'react'

interface FileListProps {
  selectedFiles: string[]
  onRemoveFile?: (fileName: string) => void
}

export default function FileList({ selectedFiles, onRemoveFile }: FileListProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Selected Files</h2>
      {selectedFiles.length === 0 ? (
        <p className="text-gray-600">No Files Selected</p>
      ) : (
        <ul className="space-y-2">
          {selectedFiles.map((file, index) => (
            <li key={index} className="flex justify-between items-center">
              <span className="text-gray-700">{file}</span>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(file)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}