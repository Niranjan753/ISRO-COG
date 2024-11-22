import Navbar from './components/Navbar'
import Admin from './admin/page'

export default function Home() {
  return (
    <main className="font-inter bg-white">
      <Navbar />
      <div className="mx-8 md:mx-16 lg:mx-32">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto pt-24 pb-20">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 tracking-tight mb-8 leading-tight">
              Making INSAT Data
              <br />
              <span className="text-indigo-600">
                Cloud-Native & Accessible
              </span>
            </h1>
            <p className="text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed">
              Transform satellite imagery into Cloud-Optimized GeoTIFFs for seamless processing and analysis
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-start space-y-4 bg-gray-50 p-8 rounded-xl">
              <div className="bg-indigo-100 p-4 rounded-xl">
                <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Optimized Processing</h3>
              <p className="text-gray-700 leading-relaxed">
                Advanced pipeline that converts INSAT Level 1 data into cloud-optimized formats with minimal latency
              </p>
            </div>
            <div className="flex flex-col items-start space-y-4 bg-gray-50 p-8 rounded-xl">
              <div className="bg-indigo-100 p-4 rounded-xl">
                <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Efficient Streaming</h3>
              <p className="text-gray-700 leading-relaxed">
                Access specific bands and regions on-demand, optimizing bandwidth and processing resources
              </p>
            </div>
            <div className="flex flex-col items-start space-y-4 bg-gray-50 p-8 rounded-xl">
              <div className="bg-indigo-100 p-4 rounded-xl">
                <svg className="w-8 h-8 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Real-time Analysis</h3>
              <p className="text-gray-700 leading-relaxed">
                Perform instant calculations and create custom visualizations in your browser
              </p>
            </div>
          </div>
        </div>

        {/* Technology Section */}
        <div className="bg-gray-50 py-24 rounded-2xl my-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="px-8">
                <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  Built with Modern Cloud Technologies
                </h2>
                <p className="text-xl text-gray-800 leading-relaxed mb-8">
                  Our platform leverages cutting-edge cloud infrastructure to deliver fast, reliable, and scalable satellite data processing
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    <span className="text-gray-800 text-lg">AWS S3</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    <span className="text-gray-800 text-lg">Cloud-Optimized GeoTIFF</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    <span className="text-gray-800 text-lg">WebAssembly</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    <span className="text-gray-800 text-lg">GDAL</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg mx-8">
                <img 
                  src="/isro-logo.png" 
                  alt="Technology Architecture" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="py-24">
          <div className="max-w-6xl mx-auto">
            <p className="text-center font-medium mb-12 bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent text-lg">
              Trusted by Leading Organizations
            </p>
            <div className="flex justify-center">
              <img src="/isro-logo.png" alt="ISRO" className="h-16 w-auto" />
            </div>
            </div>
        </div>
      </div>
          {/* Footer */}
          <footer className="bg-gray-900 text-white mt-20 w-full">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4">GEO-NIMBUS</h3>
                  <p className="text-gray-400">
                    Empowering geospatial analysis with cloud-native solutions
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                  <ul className="space-y-2">
                    <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                    <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                    <li><a href="/admin" className="text-gray-400 hover:text-white transition-colors">Admin</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Technology</h4>
                  <ul className="space-y-2">
                    <li className="text-gray-400">AWS S3</li>
                    <li className="text-gray-400">Cloud-Optimized GeoTIFF</li>
                    <li className="text-gray-400">WebAssembly</li>
                    <li className="text-gray-400">GDAL</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Contact</h4>
                  <p className="text-gray-400">
                    Have questions? Reach out to us at<br />
                    <a href="mailto:niranjanr753@gmail.com" className="text-indigo-400 hover:text-indigo-300">
                      niranjanr753@gmail.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; {new Date().getFullYear()} GEO-NIMBUS. All rights reserved.</p>
              </div>
            </div>
          </footer>
   
    </main>
  )
}
