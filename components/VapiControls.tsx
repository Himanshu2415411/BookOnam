'use client'

import React from 'react'
import { Mic, MicOff, X } from 'lucide-react';
import { useVapi } from '@/hooks/useVapi';
import { IBook } from '@/types';
import Transcript from './Transcript';

// Helper function to format time in M:SS format
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MAX_SESSION_DURATION = 15 * 60; // 15 minutes in seconds

const VapiControls = ({book}:{book:IBook}) => {
    const { status, isActive, messages, currentMessage, currentUserMessage, duration, limitError,
        start, stop, clearError } = useVapi(book);
        
    const formattedDuration = formatTime(duration);
    const formattedMaxDuration = formatTime(MAX_SESSION_DURATION);
  return (

    <div className="max-w-4xl mx-auto space-y-6">
            {/* Error Display */}
            {limitError && (
                <div className="vapi-error-banner">
                    <span className="vapi-error-text">{limitError}</span>
                    <button 
                        onClick={clearError} 
                        className="vapi-error-dismiss" 
                        aria-label="Dismiss error"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            
            {/* Header Card */}
            <div className="vapi-header-card">
              <div className="flex items-start gap-6">
                {/* Book Cover */}
                <div className="vapi-cover-wrapper">
                  <img
                    src={book.coverURL || '/assets/book-cover.svg'}
                    alt={book.title}
                    className="vapi-cover-image"
                  ></img>
                  {/* Mic Button */}
                  <div className="vapi-mic-wrapper">
                    {/* White pulsating ring - shown when AI is speaking or thinking */}
                    {(status === 'speaking' || status === 'thinking') && (
                      <div className="vapi-pulse-ring" />
                    )}
                    <button onClick= {isActive ? stop : start} disabled={status === 'connecting'} className="vapi-mic-btn" aria-label={isActive ? "Stop voice conversation" : "Start voice conversation"}>
                      {isActive ? (
                        <Mic className="w-5 h-5 text-[#212a3b]" />
                      ) : (
                        <MicOff className="w-5 h-5 text-[#212a3b]" />
                      )}
                    </button>
                  </div>
                </div>
    
                {/* Book Info */}
                <div className="flex flex-col gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#212a3b] font-serif">
                    {book.title}
                  </h1>
                  <p className="text-lg text-[#3d485e]">by {book.author}</p>
                  
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Status Indicator */}
                    <div className="vapi-status-indicator">
                      <span className="vapi-status-dot vapi-status-dot-ready"></span>
                      <span className="vapi-status-text">Ready</span>
                    </div>
                    
                    {/* Voice Label */}
                    <div className="vapi-status-indicator">
                      <Mic className="w-3.5 h-3.5 text-[#212a3b]" />
                      <span className="vapi-status-text">Voice: {book.persona || 'Default'}</span>
                    </div>
                    
                    {/* Timer - Now Dynamic */}
                    <div className="vapi-status-indicator">
                      <span className="vapi-status-text">{formattedDuration}/{formattedMaxDuration}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

        {/* Transcript Area */}

            <div className="vapi-transcript-wrapper">
                <Transcript 
                    messages={messages}
                    currentMessage={currentMessage}
                    currentUserMessage={currentUserMessage}
                />
            </div>

        </div>

  )
}

export default VapiControls
