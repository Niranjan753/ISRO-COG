'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm" style={{ boxShadow: '0 4px 6px -1px rgba(255, 111, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 255, 0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-[#FF6F00]">
              GEO-NIMBUS
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <Link 
                href="/admin"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Admin
              </Link>
              <Link
                href="/partial-download"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Partial
                Download
              </Link>
              <Link
                href="/visualizer"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Visualizer
              </Link>
              <Link
                href="/data-view"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Data View
              </Link>
              <Link
                href="/cog-tools"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                cog tools
              </Link>
              <Link
                href="/arithmetics"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Band Arithmetics
              </Link>
              <Link
                href="/about"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                About
              </Link>
              <Link
                href="/RGB"
                className="text-gray-600 hover:text-[#FF6F00] px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                RGB
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-gradient-to-r from-[#FF6F00] to-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center"
              >
                Features
                <svg
                  className={`ml-2 h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-[#FF6F00] ring-opacity-5">
                  <div className="py-1">
                    <Link
                      href="/get-started?tab=csv-converter"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-[#FF6F00] hover:to-blue-500 hover:text-white"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      CSV Converter
                    </Link>
                    <Link
                      href="/get-started?tab=profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-[#FF6F00] hover:to-blue-500 hover:text-white"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Path Profile
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
