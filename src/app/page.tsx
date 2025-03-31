'use client'

import { useState, useRef, useEffect } from 'react'
import { ModelSelector } from '@/components/ModelSelector'
import { DebateArea } from '@/components/DebateArea'
import { PromptInput } from '@/components/PromptInput'
import { Model, MODEL_GROUPS } from '@/types/models'
import WelcomePopup from '@/components/WelcomePopup'
import ApiKeyInput from '@/components/ApiKeyInput'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [initialResponses, setInitialResponses] = useState<Record<string, string> | null>(null)
  const [debates, setDebates] = useState<Array<Record<string, string>>>([])
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)
  const [openRouterKey, setOpenRouterKey] = useState('')
  
  // Track response progress
  const [responseProgress, setResponseProgress] = useState({
    responded: 0,
    total: 0
  })
  
  // Track the total number of selected models for the current debate
  const [totalSelectedModels, setTotalSelectedModels] = useState(0)
  
  // Abort controller reference to stop the debate
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Initialize models from MODEL_GROUPS
  const [models, setModels] = useState<Model[]>(() => {
    return MODEL_GROUPS.flatMap(group => group.models)
  })

  // Add streamingResponses state
  const [streamingResponses, setStreamingResponses] = useState<Record<string, string> | null>(null)

  // Check if the welcome popup should be shown
  useEffect(() => {
    // Always show the popup on every page load
    setShowWelcomePopup(true)
  }, [])
  
  const closeWelcomePopup = () => {
    setShowWelcomePopup(false)
  }

  // Update the response progress whenever initialResponses changes
  useEffect(() => {
    if (initialResponses) {
      const totalSelected = models.filter(model => model.selected).length
      const responded = Object.keys(initialResponses).length
      setResponseProgress({
        responded,
        total: totalSelected
      })
    }
  }, [initialResponses, models])

  // Update the useEffect for finalAnswer changes to fix the scroll issue
  useEffect(() => {
    if (finalAnswer) {
      console.log("finalAnswer state updated:", finalAnswer);
      
      // Log to console but don't force any scrolling
      console.warn("CONSENSUS FOUND:", finalAnswer);
      
      // Just ensure the finalAnswer state is properly set, without forcing scrolling
      setTimeout(() => {
        // Ensure state is updated but don't modify the string (which causes re-renders)
        setFinalAnswer(prev => {
          console.log("Ensuring finalAnswer is set");
          return prev; // Return the same value to avoid unnecessary re-renders
        });
      }, 200);
      
      // Set loading to false when consensus is reached
      setIsLoading(false);
    }
  }, [finalAnswer]);

  // Handle API key save
  const handleApiKeySave = (key: string) => {
    setOpenRouterKey(key)
  }

  const toggleModel = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId ? { ...model, selected: !model.selected } : model
      )
    )
  }

  const stopDebate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }

  const startDebate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }
    
    if (!openRouterKey.trim()) {
      setError('Please enter your OpenRouter API key')
      return
    }
    
    const selectedModels = models.filter(model => model.selected)
    console.log('Selected models:', selectedModels.map(m => ({ id: m.id, provider: m.provider })))
    
    if (selectedModels.length < 2) {
      setError('Please select at least 2 models')
      return
    }

    // Store the total number of selected models for this debate
    setTotalSelectedModels(selectedModels.length)
    console.log('Starting debate with prompt:', prompt)
    console.log('Total selected models:', selectedModels.length)

    setError(null)
    setIsLoading(true)
    setInitialResponses(null)
    setStreamingResponses(null) // Reset streaming responses
    setDebates([])
    setFinalAnswer(null)
    setResponseProgress({
      responded: 0,
      total: selectedModels.length
    })

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      console.log('Making API request to /api/debate')
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenRouter-Key': openRouterKey // Pass the API key in header
        },
        body: JSON.stringify({
          prompt,
          models: selectedModels.map(model => ({ id: model.id, provider: model.provider })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText)
        throw new Error('Failed to start debate')
      }

      console.log('API response received, starting to read stream')
      const reader = response.body?.getReader()
      if (!reader) {
        console.error('No response body available')
        throw new Error('No response body')
      }

      console.log('Starting to read stream')
      const decoder = new TextDecoder()
      let completeData = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Stream reading complete')
          break
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true })
        console.log('Received chunk:', chunk.substring(0, 100) + '...')
        completeData = chunk // We replace instead of append because each chunk contains the full state

        try {
          // Parse the data
          const data = JSON.parse(completeData)
          console.log('Parsed data:', {
            hasInitialResponses: Boolean(data.initialResponses),
            hasStreamingResponses: Boolean(data.streamingResponses),
            hasDebates: Boolean(data.debates),
            hasFinalAnswer: Boolean(data.finalAnswer),
            isFinalUpdate: Boolean(data.isFinalUpdate)
          })
          
          // Update state with the latest data
          if (data.initialResponses) {
            console.log('Updating initial responses:', Object.keys(data.initialResponses))
            setInitialResponses(data.initialResponses)
            // Update response progress
            setResponseProgress(prev => ({
              ...prev,
              responded: Object.keys(data.initialResponses).length
            }))
          }
          
          // Update streaming responses state
          if (data.streamingResponses) {
            console.log('Updating streaming responses:', Object.keys(data.streamingResponses))
            setStreamingResponses(data.streamingResponses)
          }
          
          if (data.debates) {
            console.log('Updating debates:', {
              currentDebatesLength: debates.length,
              newDebatesLength: data.debates.length,
              newDebates: data.debates.map((round: Record<string, string>) => ({
                roundNumber: round,
                responses: Object.keys(round)
              }))
            })
            // Ensure we're properly handling the debates array
            const newDebates = data.debates.map((round: Record<string, string>) => {
              // Ensure each round is a new object to trigger re-render
              return { ...round }
            })
            setDebates(newDebates)
          }
          
          // Special handling for final answer - log more details and ensure it's captured
          if (data.finalAnswer) {
            console.log("Final answer received:", data.finalAnswer)
            
            // If this is the final update with consensus, make it more prominent
            if (data.isFinalUpdate) {
              console.warn("FINAL CONSENSUS UPDATE RECEIVED:", data.finalAnswer)
              
              // Force update with slight delay for UI to process
              setTimeout(() => {
                setFinalAnswer(data.finalAnswer)
                
                // Set loading to false since we have the final answer
                setIsLoading(false)
              }, 200)
            } else {
              // Regular update with a finalAnswer
              setFinalAnswer(data.finalAnswer)
            }
          }

          // Log full state for debugging
          console.log("Current state:", {
            initialResponsesCount: data.initialResponses ? Object.keys(data.initialResponses).length : 0,
            debatesCount: data.debates ? data.debates.length : 0,
            consensusReached: data.consensusReached,
            hasFinalAnswer: Boolean(data.finalAnswer),
            isFinalUpdate: Boolean(data.isFinalUpdate),
            finalAnswerValue: data.finalAnswer?.substring(0, 50) + "..."
          })
        } catch (e) {
          // If we can't parse the JSON, just continue
          console.error('Error parsing stream chunk:', e)
        }
      }
    } catch (err) {
      console.error('Error in debate:', err)
      // Don't set error if it was aborted
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // Helper function to format final answer display
  const formatFinalAnswer = (answer: string | null) => {
    if (!answer) return null;
    
    // Strip any leading/trailing quotes or newlines
    let formatted = answer.trim();
    if (formatted.startsWith('"') && formatted.endsWith('"')) {
      formatted = formatted.slice(1, -1);
    }
    
    return formatted;
  };

  // Create this as a separate component for better visibility
  const ConsensusDisplay = ({ finalAnswer }: { finalAnswer: string | null }) => {
    if (!finalAnswer) return null;
    
    // Strip any leading/trailing quotes or newlines
    let formatted = finalAnswer.trim();
    if (formatted.startsWith('"') && formatted.endsWith('"')) {
      formatted = formatted.slice(1, -1);
    }
    
    return (
      <div 
        id="consensus-answer" 
        className="bg-white p-6 rounded-lg shadow-lg border-4 border-green-500 mt-4 mb-8"
      >
        <h2 className="text-xl font-semibold mb-3 text-green-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-2">
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          Consensus Reached
        </h2>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-gray-800 whitespace-pre-wrap">{formatted}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 py-6">
      {showWelcomePopup && <WelcomePopup onClose={closeWelcomePopup} />}
      
      <h1 className="text-5xl font-bold text-center mb-3">LLM Hippodrome</h1>
      <p className="text-center text-gray-600 mb-6">
        Watch AI models debate and come to a shared conclusion
      </p>
      
      {/* API Key Input */}
      <ApiKeyInput onSave={handleApiKeySave} />
      
      <ModelSelector models={models} toggleModel={toggleModel} />
      
      <div className="flex flex-col gap-4">
        <PromptInput 
          prompt={prompt} 
          setPrompt={setPrompt} 
          onSubmit={startDebate} 
          isLoading={isLoading} 
        />
        
        {/* Display consensus answer as a separate component */}
        {finalAnswer && <ConsensusDisplay finalAnswer={finalAnswer} />}
        
        {/* Status info - only show when a debate has been started but no consensus yet */}
        {!finalAnswer && (initialResponses || isLoading) && (
          <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
            <p>
              <strong>Status:</strong> {isLoading ? 'Debate in progress' : 'Ready'} | 
              <strong> Consensus:</strong> {finalAnswer ? '✅ Found' : '⏳ Not yet found'}
            </p>
          </div>
        )}
        
        {isLoading && (
          <div className="flex flex-col gap-4">
            <button
              onClick={stopDebate}
              className="py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop Debate
            </button>
            
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-700">Models are still debating...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <DebateArea 
        isLoading={isLoading}
        initialResponses={initialResponses}
        streamingResponses={streamingResponses || {}}
        debates={debates}
        finalAnswer={finalAnswer}
        onConsensus={() => {}}
        totalSelectedModels={totalSelectedModels}
      />
    </div>
  )
} 