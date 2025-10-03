'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DataAccess from './data-access/page'

import CsvConverter from './components/CsvConverter'
import Navbar from './components/Navbar'
import PathProfile from './components/PathProfile'


const GetStartedContent = () => {
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'data-access'

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {tab === 'data-access' && <DataAccess />}
      {tab === 'csv-converter' && <CsvConverter />}
      {tab === 'profile' && <PathProfile />}
    </div>
  )
}

const GetStartedPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>}>
        <GetStartedContent />
      </Suspense>
    </div>
  )
}

export default GetStartedPage