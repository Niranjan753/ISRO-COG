import Image from 'next/image'
import Navbar from '../components/Navbar'

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Image
              src="/isro-logo.png"
              alt="ISRO Logo"
              width={200}
              height={200}
              className="mx-auto mb-8"
            />
            
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              About GEO-NIMBUS
            </h1>

            <p className="max-w-3xl mx-auto text-xl text-gray-600">
              A next-generation platform for satellite data analysis and visualization
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-lg text-gray-600 space-y-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p>
              GEO-NIMBUS represents a breakthrough in satellite data processing technology, developed through a collaborative effort with the Indian Space Research Organisation (ISRO). Our mission is to democratize access to complex satellite data, making it accessible and actionable for users across different domains.
            </p>
            <p>
              We specialize in processing INSAT TIFF data, transforming raw satellite imagery into meaningful insights that can drive decision-making and research. Our platform bridges the gap between complex satellite data and practical applications, enabling users to extract valuable information efficiently.
            </p>
          </div>
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Core Capabilities</h2>
            <ul className="list-disc pl-6 space-y-4 text-gray-600">
              <li>Advanced TIFF data processing with support for multiple satellite data formats</li>
              <li>Sophisticated elevation profile generation with precise measurements</li>
              <li>Comprehensive data visualization tools for in-depth analysis</li>
              <li>Automated CSV conversion for streamlined data management</li>
              <li>Real-time data processing and analysis capabilities</li>
              <li>Custom visualization options for different data types</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-indigo-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Technical Framework</h2>
            <div className="space-y-6 text-gray-600">
              <p>
                Our platform leverages cutting-edge technologies to deliver robust performance and reliability:
              </p>
              <ul className="list-disc pl-6 space-y-4">
                <li>Next.js and React for a responsive, modern frontend interface</li>
                <li>Python backend for powerful data processing capabilities</li>
                <li>Advanced algorithms for precise elevation calculations</li>
                <li>Optimized data storage and retrieval systems</li>
                <li>Real-time processing capabilities for immediate results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Future Vision */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-lg text-gray-600 space-y-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Future Vision</h2>
            <p>
              We are continuously evolving our platform to meet the growing demands of satellite data analysis. Our roadmap includes enhanced machine learning capabilities, advanced visualization tools, and expanded data processing features to support an even wider range of satellite data formats.
            </p>
            <p>
              Our commitment to innovation drives us to explore new technologies and methodologies that can further improve the accuracy and efficiency of satellite data analysis, making GEO-NIMBUS an increasingly valuable tool for researchers and professionals worldwide.
            </p>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-white mt-20 w-full">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">GEO-NIMBUS</h3>
              <p className="text-gray-400">
                Transforming INSAT data into cloud-native formats for advanced geospatial analysis
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="/visualizer" className="text-gray-400 hover:text-white transition-colors">Visualizer</a></li>
                <li><a href="/data-view" className="text-gray-400 hover:text-white transition-colors">Data View</a></li>
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
                For inquiries, please contact:<br />
                <a href="mailto:info@geo-nimbus.com" className="text-indigo-400 hover:text-indigo-300">
                  info@geo-nimbus.com
                </a>
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} GEO-NIMBUS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
