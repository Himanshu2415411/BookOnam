import React from 'react'
import Link from 'next/link'

const HeroSection = () => {
  return (
    <div className="pt-28 mb-1 md:mb-15 pb-0">
      {/* Hero Section - Warm Beige Card */}
      <div className="library-hero-card">
        <div className="library-hero-content pt-8">
          
          {/* Left Section - Text Content */}
          <div className="library-hero-text">
            <h1 className="library-hero-title">
              Your Library
            </h1>
            <p className="library-hero-description">
              Transform your books into interactive AI conversations. Upload PDFs and chat with your books using voice.
            </p>
            <Link href="/books/new" className="library-cta-primary">
              Add New Book
            </Link>
          </div>

          {/* Center Section - Illustration */}
          <div className="library-hero-illustration-desktop">
            <img 
              src="/assets/hero-illustration.png" 
              alt="Vintage books with globe" 
              className="w-full max-w-87.5 h-auto"
            />
          </div>
          <div className="library-hero-illustration">
            <img 
              src="/assets/hero-illustration.png" 
              alt="Vintage books with globe" 
              className="w-full max-w-70 h-auto"
            />
          </div>

          {/* Right Section - Steps Card */}
          <div className="library-steps-card">
            <div className="flex flex-col gap-4">
              {/* Step 1 */}
              <div className="library-step-item">
                <div className="library-step-number">1</div>
                <div>
                  <p className="library-step-title">Upload a Book</p>
                  <p className="library-step-description">Add your PDF to the library</p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="library-step-item">
                <div className="library-step-number">2</div>
                <div>
                  <p className="library-step-title">Start Chatting</p>
                  <p className="library-step-description">Ask questions about your book</p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="library-step-item">
                <div className="library-step-number">3</div>
                <div>
                  <p className="library-step-title">Learn & Explore</p>
                  <p className="library-step-description">Get answers from your books</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default HeroSection