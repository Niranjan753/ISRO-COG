'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../components/Navbar'

interface FormData {
  north: string;
  south: string;
  east: string;
  west: string;
  file: File | null;
}

export default function PartialDownload() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<FormData>({
    north: searchParams.get('north') || '',
    south: searchParams.get('south') || '',
    east: searchParams.get('east') || '',
    west: searchParams.get('west') || '',
    file: null
  })

  useEffect(() => {
    const filePath = searchParams.get('filePath');
    if (filePath) {
      // Fetch the file using the file path
      fetch(filePath)
        .then(response => response.blob())
        .then(blob => {
          const fileName = searchParams.get('fileName') || 'downloaded_file.tif';
          const file = new File([blob], fileName);
          setFormData(prev => ({ ...prev, file }));
        })
        .catch(error => console.error('Error fetching file:', error));
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formDataObj = new FormData()
    formDataObj.append('north', formData.north)
    formDataObj.append('south', formData.south)
    formDataObj.append('east', formData.east)
    formDataObj.append('west', formData.west)
    if (formData.file) {
      formDataObj.append('file', formData.file)
    }

    try {
      const response = await fetch('/api/partial-download', {
        method: 'POST',
        body: formDataObj
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process download request')
      }

      // Get the processed file as blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `processed_${formData.file?.name || 'region.tif'}`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess('File processed and downloaded successfully!')
    } catch (error: any) {
      setError(error.message || 'An error occurred while processing the file')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target
    if (name === 'file' && files) {
      setFormData(prev => ({
        ...prev,
        file: files[0]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // Preset coordinates for India
  const handlePresetIndia = () => {
    setFormData(prev => ({
      ...prev,
      north: '35.0',
      south: '8.0',
      east: '97.0',
      west: '68.0'
    }))
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-12 mt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Partial Download</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                Upload TIFF File
              </label>
              <input
                type="file"
                name="file"
                id="file"
                accept=".tif,.tiff"
                onChange={handleChange}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePresetIndia}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Use India Coordinates
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="north" className="block text-sm font-medium text-gray-700">
                  North Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="north"
                  id="north"
                  value={formData.north}
                  onChange={handleChange}
                  placeholder="e.g., 35.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="south" className="block text-sm font-medium text-gray-700">
                  South Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="south"
                  id="south"
                  value={formData.south}
                  onChange={handleChange}
                  placeholder="e.g., 8.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="east" className="block text-sm font-medium text-gray-700">
                  East Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="east"
                  id="east"
                  value={formData.east}
                  onChange={handleChange}
                  placeholder="e.g., 97.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="west" className="block text-sm font-medium text-gray-700">
                  West Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="west"
                  id="west"
                  value={formData.west}
                  onChange={handleChange}
                  placeholder="e.g., 68.0"
                  className="mt-1 block w-full rounded-md text-gray-700 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {loading ? 'Processing...' : 'Process Region'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}