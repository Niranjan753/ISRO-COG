'use client'

import { useState } from 'react'

export default function CsvConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().match(/\.(tiff|tif)$/)) {
        setError('Please select a TIFF file')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().match(/\.(tiff|tif)$/)) {
        setError('Please select a TIFF file')
        return
      }
      setFile(droppedFile)
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleConvert = async () => {
    if (!file) return
    setConverting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/convert-csv', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Conversion failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name.split('.')[0]}.csv`
      a.click()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert file')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-6">Convert TIFF to CSV</h2>
        
        <div className="space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              accept=".tiff,.tif"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="flex flex-col items-center">
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg text-gray-600 mb-2">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: TIFF, TIF
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-md">
              {error}
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={!file || converting}
            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
              ${!file || converting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {converting ? 'Converting...' : 'Convert to CSV'}
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <h3 className="font-medium text-gray-700 mb-2">Notes:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Only TIFF/TIF files are supported</li>
            <li>Maximum file size: 100MB</li>
            <li>The conversion process extracts latitude, longitude, and value data</li>
            <li>Make sure your TIFF file contains proper geospatial information</li>
          </ul>
        </div>
      </div>
    </div>
  )
}