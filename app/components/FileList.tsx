import React from 'react'

interface FileListProps {
  selectedFiles: string[]
}

const FileList: React.FC<FileListProps> = ({ selectedFiles }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Selected Files</h2>
      {selectedFiles.length > 0 ? (
        <ul className="space-y-2">
          {selectedFiles.map((filename, index) => (
            <li 
              key={index}
              className="p-2 bg-gray-50 rounded text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {filename}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No files selected</p>
      )}
    </div>
  )
}

export default FileList