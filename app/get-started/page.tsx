'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DataAccess from './data-access/page'

const GetStartedPage = () => {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('data-access')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <img 
                src="/emblem-dark.png" 
                alt="Government of India Emblem" 
                className="h-16"
              />
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Meteorological & Oceanographic Satellite Data Archival Centre
                </h1>
                <p className="text-gray-600">
                  Space Applications Centre, ISRO
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local Navigation Bar */}
      <div className="bg-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Home
            </Link>
            <Link href="/missions" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Missions
            </Link>
            <Link href="/catalog" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Catalog
            </Link>
            <Link href="/galleries" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Galleries
            </Link>
            <button 
              onClick={() => router.push('/get-started/data-access')}
              className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800"
            >
              Data Access
            </button>
            <Link href="/reports" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Reports
            </Link>
            <Link href="/atlases" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Atlases
            </Link>
            <Link href="/tools" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Tools
            </Link>
            <Link href="/sitemap" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Sitemap
            </Link>
            <Link href="/help" className="text-white px-3 py-4 text-sm font-medium hover:bg-blue-800">
              Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GetStartedPage