import React from 'react'
import { PricingTable } from '@clerk/nextjs'
import Link from 'next/link'

const SubscriptionsPage = () => {
  return (
    <main className='wrapper container'>
      <div className='pricing-page-container'>
        
        {/* Header Section */}
        <div className='pricing-header'>
          <Link href="/" className='pricing-back-link'>
            ← Back to Library
          </Link>
          
          <h1 className='pricing-title'>
            Choose Your Plan
          </h1>
          
          <p className='pricing-subtitle'>
            Unlock powerful features to supercharge your reading experience. Select the perfect plan for your needs.
          </p>
        </div>

        {/* Pricing Table Component */}
        <div className='pricing-table-wrapper'>
          <PricingTable />
        </div>

        {/* FAQ or Additional Info */}
        <div className='pricing-footer'>
          <div className='pricing-features-grid'>
            <div className='pricing-feature-card'>
              <h3>Free Plan</h3>
              <ul>
                <li>1 Book</li>
                <li>5 sessions/month</li>
                <li>5 min/session</li>
                <li>No session history</li>
              </ul>
            </div>

            <div className='pricing-feature-card'>
              <h3>Standard Plan</h3>
              <ul>
                <li>10 Books</li>
                <li>100 sessions/month</li>
                <li>15 min/session</li>
                <li>Session history</li>
              </ul>
            </div>

            <div className='pricing-feature-card'>
              <h3>Pro Plan</h3>
              <ul>
                <li>100 Books</li>
                <li>Unlimited sessions</li>
                <li>60 min/session</li>
                <li>Session history</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>

          <div className='pricing-help'>
            <h3>Have questions?</h3>
            <p>
              Contact our support team for more information about plans or custom pricing.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default SubscriptionsPage
