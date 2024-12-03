'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-white drop-shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-gray-800">
              GEO-NIMBUS
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <Link 
                href="/get-started?tab=data-access"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Data Access
              </Link>
              <Link
                href="/get-started?tab=csv-converter"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                CSV Converter
              </Link>
              <Link
                href="/get-started?tab=profile"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Path Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
