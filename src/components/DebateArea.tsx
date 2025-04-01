import React, { useState } from 'react'

interface DebateAreaProps {
  isLoading: boolean
  initialResponses: Record<string, string> | null
  streamingResponses?: Record<string, string>
  debates: Array<Record<string, string>>
  finalAnswer: string | null
  onConsensus: () => void
  totalSelectedModels?: number
}

export const DebateArea: React.FC<DebateAreaProps> = ({
  isLoading,
  initialResponses,
  streamingResponses = {},
  debates,
  finalAnswer,
  onConsensus,
  totalSelectedModels = 0,
}) => {
  // State for collapsing the entire initial responses section
  const [showInitialResponses, setShowInitialResponses] = useState(true)
  
  // Track which debate rounds are expanded
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({})
  // Track which model responses are expanded
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({})

  // Toggle a debate round's expanded state
  const toggleRound = (roundIndex: number) => {
    setExpandedRounds(prev => ({
      ...prev,
      [roundIndex]: !prev[roundIndex]
    }))
  }

  // Toggle a model response's expanded state
  const toggleResponse = (roundIndex: number, model: string) => {
    const key = `${roundIndex}-${model}`
    setExpandedResponses(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Track which initial responses are expanded
  const [expandedInitialResponses, setExpandedInitialResponses] = useState<Record<string, boolean>>({})

  // Toggle an initial response's expanded state
  const toggleInitialResponse = (model: string) => {
    setExpandedInitialResponses(prev => ({
      ...prev,
      [model]: !prev[model]
    }))
  }

  // Get total expected responses for a round based on initial responses
  const getTotalExpectedResponses = () => {
    return initialResponses ? Object.keys(initialResponses).length : 0
  }

  // Get current responses for a round
  const getCurrentResponses = (round: Record<string, string>) => {
    return Object.keys(round).length
  }

  // Get total expected models count
  const getTotalModels = () => {
    // First preference: use the total selected models passed from parent
    if (totalSelectedModels > 0) {
      return totalSelectedModels;
    }
    
    // Second preference: count models that have responded plus those still thinking
    const initialCount = initialResponses ? Object.keys(initialResponses).length : 0;
    const streamingCount = streamingResponses ? Object.keys(streamingResponses).length : 0;
    
    // Only count unique models (a model might be in both initialResponses and streamingResponses)
    const uniqueModelNames = new Set([
      ...Object.keys(initialResponses || {}),
      ...Object.keys(streamingResponses || {})
    ]);
    
    return uniqueModelNames.size > 0 ? uniqueModelNames.size : Math.max(initialCount + streamingCount, 2);
  }

  if (isLoading && !initialResponses && Object.keys(streamingResponses).length === 0) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="text-center text-gray-500">
            <div className="flex justify-center">
              <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg">The debate is in progress...</p>
            <p className="mt-2 text-sm sm:text-base">AI models are thinking and responding to each other.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show streaming responses if no complete responses are available yet
  if (isLoading && !initialResponses && Object.keys(streamingResponses).length > 0) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Initial Responses (Streaming)</h2>
          <div className="space-y-4">
            {Object.entries(streamingResponses).map(([model, response]) => (
              <div key={model} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 mb-2">{model}</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
                    {/* Show typing indicator */}
                    <span className="inline-block mt-2 text-gray-500">
                      <span className="animate-pulse">•</span>
                      <span className="animate-pulse delay-100">•</span>
                      <span className="animate-pulse delay-200">•</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!initialResponses && Object.keys(streamingResponses).length === 0) {
    return null
  }

  const denominator = totalSelectedModels > 0 ? totalSelectedModels : getCurrentResponses(initialResponses || {})
  
  // Combine initialResponses with streamingResponses for display
  const displayResponses = {
    ...(initialResponses || {}),
    ...streamingResponses
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Consensus section moved to page.tsx */}

      {/* Initial Responses with collapsible section */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <button 
          onClick={() => setShowInitialResponses(!showInitialResponses)}
          className="w-full flex justify-between items-center mb-3 sm:mb-4 text-left focus:outline-none touch-manipulation"
        >
          <h2 className="text-lg sm:text-xl font-semibold">Initial Responses</h2>
          <div className="flex items-center">
            <div className="mr-2 sm:mr-3 font-medium text-blue-600 text-sm sm:text-base">
              {getCurrentResponses(initialResponses || {})}/{getTotalModels()} responded
            </div>
            <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2 sm:h-2.5 mr-2">
              <div 
                className="bg-blue-600 h-2 sm:h-2.5 rounded-full" 
                style={{ width: `${(getCurrentResponses(initialResponses || {}) / Math.max(1, getTotalModels())) * 100}%` }}
              ></div>
            </div>
            <span className="text-gray-500">
              {showInitialResponses ? '▼' : '▶'}
            </span>
          </div>
        </button>
        
        {showInitialResponses && (
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(displayResponses).map(([model, response]) => (
              <div key={model} className="border border-gray-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => toggleInitialResponse(model)}
                  className="w-full flex justify-between items-center p-3 sm:p-4 text-left hover:bg-gray-50 focus:outline-none touch-manipulation"
                >
                  <h3 className="font-medium text-gray-800 text-sm sm:text-base">{model}</h3>
                  <div className="flex items-center">
                    {/* Show typing indicator if this is a streaming response */}
                    {streamingResponses[model] && initialResponses && !initialResponses[model] && (
                      <span className="mr-2 text-gray-500">
                        <span className="animate-pulse">•</span>
                        <span className="animate-pulse delay-100">•</span>
                        <span className="animate-pulse delay-200">•</span>
                      </span>
                    )}
                    <span className="text-gray-500">
                      {expandedInitialResponses[model] ? '▼' : '▶'}
                    </span>
                  </div>
                </button>
                
                {expandedInitialResponses[model] && (
                  <div className="p-3 sm:p-4 pt-0 border-t border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debate Rounds */}
      {debates.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Debate Rounds</h2>
          <div className="space-y-3 sm:space-y-4">
            {debates.map((round, roundIndex) => (
              <div key={roundIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                <button 
                  onClick={() => toggleRound(roundIndex)}
                  className="w-full flex justify-between items-center p-3 sm:p-4 text-left hover:bg-gray-50 focus:outline-none touch-manipulation"
                >
                  <h3 className="font-medium text-gray-800 text-sm sm:text-base">Round {roundIndex + 1}</h3>
                  <div className="flex items-center">
                    <div className="mr-2 sm:mr-3 font-medium text-blue-600 text-sm sm:text-base">
                      {getCurrentResponses(round)}/{getTotalModels()} responded
                    </div>
                    <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2 sm:h-2.5 mr-2">
                      <div 
                        className="bg-blue-600 h-2 sm:h-2.5 rounded-full" 
                        style={{ width: `${(getCurrentResponses(round) / Math.max(1, getTotalModels())) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-500">
                      {expandedRounds[roundIndex] ? '▼' : '▶'}
                    </span>
                  </div>
                </button>
                
                {expandedRounds[roundIndex] && (
                  <div className="p-3 sm:p-4 pt-0 border-t border-gray-200">
                    {Object.entries(round).map(([model, response]) => (
                      <div key={model} className="mb-3 sm:mb-4 last:mb-0">
                        <button
                          onClick={() => toggleResponse(roundIndex, model)}
                          className="w-full flex justify-between items-center text-left hover:bg-gray-50 focus:outline-none touch-manipulation"
                        >
                          <h4 className="font-medium text-gray-800 text-sm sm:text-base">{model}</h4>
                          <span className="text-gray-500">
                            {expandedResponses[`${roundIndex}-${model}`] ? '▼' : '▶'}
                          </span>
                        </button>
                        
                        {expandedResponses[`${roundIndex}-${model}`] && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}