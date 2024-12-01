'use client'
import { useState } from 'react'

export default function DataAccessPage() {
  const [datasource, setDatasource] = useState('INSAT-3DR')
  const [category, setCategory] = useState('IMAGER')
  const [entriesPerPage, setEntriesPerPage] = useState('10')
  const [searchTerm, setSearchTerm] = useState('')

  const productData = [
    {
      srNo: 1,
      productName: '3RIMG_L1B_STD',
      description: 'Level1 data for Imager 6 channels at half hour interval',
      processingLevel: 'L1B',
      startDate: '2016-10-11',
      endDate: '2024-12-01',
      temporalResolution: 'HALF HOURLY'
    },
    {
      srNo: 2,
      productName: '3RIMG_L1C_ASIA_MER',
      description: 'IMAGER- 6 channel Level1 data in Mercator projection for Asian Sector',
      processingLevel: 'L1C',
      startDate: '2016-10-03',
      endDate: '2024-12-01',
      temporalResolution: 'HALF HOURLY'
    },
    {
      srNo: 3,
      productName: '3RIMG_L2B_HEM',
      description: 'This product is derived on the basis of Hydro-Estimator method. It measures precipitation over Indian Region encompassing area between longitudes 30°E -to130°E and latitudes 50°N- 50°S.',
      processingLevel: 'L2B',
      startDate: '2016-10-11',
      endDate: '2024-12-01',
      temporalResolution: 'HALF HOURLY'
    },
    {
      srNo: 4,
      productName: '3RIMG_L2C_INS',
      description: 'INSAT-3DR derived INSOLATION',
      processingLevel: 'L2C',
      startDate: '2016-11-09',
      endDate: '2024-12-01',
      temporalResolution: 'HALF HOURLY'
    }
  ]

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Filter Section */}
      <div className="bg-[#e6eef9] p-4 mb-4">
        <div className="flex flex-wrap gap-8">
          <div>
            <label className="text-blue-700 font-medium block mb-2">Datasource:</label>
            <select 
              value={datasource}
              onChange={(e) => setDatasource(e.target.value)}
              className="border rounded px-3 py-1 min-w-[200px]"
            >
              <option value="INSAT-3DR">INSAT-3DR</option>
            </select>
          </div>
          <div>
            <label className="text-blue-700 font-medium block mb-2">Category:</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded px-3 py-1 min-w-[200px]"
            >
              <option value="IMAGER">IMAGER</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select 
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-1"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="border px-4 py-2">Sr.No</th>
              <th className="border px-4 py-2">Product Name</th>
              <th className="border px-4 py-2">Product Description</th>
              <th className="border px-4 py-2">Processing Level</th>
              <th className="border px-4 py-2">Start Date</th>
              <th className="border px-4 py-2">End Date</th>
              <th className="border px-4 py-2">Temporal Resolution</th>
              <th className="border px-4 py-2">Order Data</th>
            </tr>
          </thead>
          <tbody>
            {productData.map((product) => (
              <tr key={product.srNo} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{product.srNo}</td>
                <td className="border px-4 py-2">{product.productName}</td>
                <td className="border px-4 py-2">{product.description}</td>
                <td className="border px-4 py-2">{product.processingLevel}</td>
                <td className="border px-4 py-2">{product.startDate}</td>
                <td className="border px-4 py-2">{product.endDate}</td>
                <td className="border px-4 py-2">{product.temporalResolution}</td>
                <td className="border px-4 py-2">
                  <button className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 