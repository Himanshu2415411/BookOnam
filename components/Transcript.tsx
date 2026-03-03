'use client'

import React, { useEffect, useRef } from 'react'
import { Mic } from 'lucide-react'
import { Messages } from '@/types'

interface TranscriptProps {
  messages: Messages[]
  currentMessage: string
  currentUserMessage: string
}

const Transcript: React.FC<TranscriptProps> = ({
  messages,
  currentMessage,
  currentUserMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or when streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, currentMessage, currentUserMessage])

  const isEmpty = messages.length === 0 && !currentMessage && !currentUserMessage

  if (isEmpty) {
    return (
      <div className="transcript-container">
        <div className="transcript-empty">
          <Mic className="w-12 h-12 text-[#212a3b] mb-4" />
          <p className="transcript-empty-text">No conversation yet</p>
          <p className="transcript-empty-hint">Click the mic button above to start talking</p>
        </div>
      </div>
    )
  }

  return (
    <div className="transcript-container">
      <div className="transcript-messages">
        {/* Render completed messages */}
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          
          return (
            <div
              key={index}
              className={`transcript-message ${
                isUser ? 'transcript-message-user' : 'transcript-message-assistant'
              }`}
            >
              <div
                className={`transcript-bubble ${
                  isUser ? 'transcript-bubble-user' : 'transcript-bubble-assistant'
                }`}
              >
                {message.content}
              </div>
            </div>
          )
        })}

        {/* Render streaming user message */}
        {currentUserMessage && (
          <div className="transcript-message transcript-message-user">
            <div className="transcript-bubble transcript-bubble-user">
              {currentUserMessage}
              <span className="transcript-cursor" />
            </div>
          </div>
        )}

        {/* Render streaming AI message */}
        {currentMessage && (
          <div className="transcript-message transcript-message-assistant">
            <div className="transcript-bubble transcript-bubble-assistant">
              {currentMessage}
              <span className="transcript-cursor" />
            </div>
          </div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default Transcript
