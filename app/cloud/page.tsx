'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

export default function CloudUpload() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin')
    }
  }, [router])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.h5')) {
      setSelectedFile(file)
    } else {
      alert('Please select a valid H5 file')
      event.target.value = ''
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const xhr = new XMLHttpRequest()
      
      // Handle upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      // Create promise to handle the upload
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.response))
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
      })

      // Start upload
      xhr.open('POST', '/api/upload')
      xhr.send(formData)

      // Wait for upload to complete
      const response = await uploadPromise

      alert('File uploaded successfully!')
      setSelectedFile(null)
      setUploadProgress(0)
      
      // You can do something with the response here, like saving the URL
      console.log('Upload complete:', response)

    } catch (error) {
      alert('Error uploading file')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-3xl mx-auto p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Upload H5 Files</h2>
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 hover:border-indigo-500 transition-colors duration-200">
            <input
              type="file"
              accept=".h5"
              onChange={handleFileSelect}
              className="w-full text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="mt-3 text-sm text-gray-500">
                Selected file: {selectedFile.name}
              </p>
            )}
          </div>

          {isUploading && (
            <div className="w-full">
              <div className="bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Upload progress: {uploadProgress}%
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200
              ${!selectedFile || isUploading 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
              }`}
          >
            {isUploading ? 'Uploading...' : 'Upload to Cloud'}
          </button>
        </div>

        <div className="mt-10 bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Upload Guidelines</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Only H5 file format is supported
            </li>
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Ensure the file contains valid INSAT data
            </li>
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Files will be automatically processed after upload
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
