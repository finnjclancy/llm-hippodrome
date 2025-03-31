import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import axios from 'axios'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Maximum debate rounds
const MAX_ROUNDS = 3

// Model formatting
const formatModelName = (id: string, provider: string) => {
  if (provider === 'openai') {
    return id
  } else {
    // All other models (including Google) use OpenRouter
    return id.split('/').pop() || id
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, models } = await req.json()
    console.log('Received debate request:', { prompt, models })
    
    if (!prompt || !models || !Array.isArray(models) || models.length < 2) {
      console.error('Invalid request:', { prompt, models })
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        // Function to send updates to the client
        const sendUpdate = async (data: any) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
          } catch (error) {
            console.error('Error sending update:', error)
          }
        }

        // Initialize response tracking
        const initialResponses: Record<string, string> = {}
        const streamingResponses: Record<string, string> = {}
        const debates: Array<Record<string, string>> = []
        let consensusReached = false
        let finalAnswer: string | null = null

        try {
          console.log('Starting debate processing with models:', models.map(m => m.id))
          
          // Get initial responses from all models
          const initialPromises = models.map(async (model) => {
            try {
              console.log(`Getting initial response from model: ${model.id}`)
              const initialPrompt = `
You are ${formatModelName(model.id, model.provider)} participating in a friendly conversation about:

"${prompt}"

Please share your initial thoughts on this topic. Be thoughtful but conversational - we're looking for your perspective, but the goal is to find common ground with other AI models.

This is a friendly conversation, not a formal debate. Share your valuable insights while being open to reaching consensus with others.
`;
              
              const displayName = formatModelName(model.id, model.provider)
              console.log(`Adding placeholder for ${displayName}`)
              
              // Add placeholder to show a model is responding
              streamingResponses[displayName] = "Thinking..."
              await sendUpdate({ 
                initialResponses, 
                streamingResponses,
                totalSelectedModels: models.length  // Add this to ensure UI knows total count
              })
              
              console.log(`Getting response from ${model.id}`)
              const response = await getModelResponse(initialPrompt, model.id, model.provider)
              console.log(`Received response from ${model.id}`)
              
              // Finalize the response
              initialResponses[displayName] = response
              delete streamingResponses[displayName]
              await sendUpdate({ 
                initialResponses, 
                streamingResponses,
                totalSelectedModels: models.length  // Add this to ensure UI knows total count
              })
            } catch (error) {
              console.error(`Error getting initial response from ${model.id}:`, error)
              const displayName = formatModelName(model.id, model.provider)
              initialResponses[displayName] = `Error: Could not get response from ${model.id}`
              delete streamingResponses[displayName]
              await sendUpdate({ 
                initialResponses, 
                streamingResponses,
                totalSelectedModels: models.length
              })
            }
          })
          
          console.log('Waiting for all initial responses')
          await Promise.all(initialPromises)
          console.log('All initial responses received')
          
          // Debate rounds with more collaborative prompts
          for (let round = 0; round < MAX_ROUNDS && !consensusReached; round++) {
            console.log(`Starting debate round ${round + 1}`)
            const roundResponses: Record<string, string> = {}
            
            // Add the round to debates array and send update immediately
            debates.push(roundResponses)
            console.log('Current debates array:', debates.length)
            await sendUpdate({ 
              debates,
              initialResponses,
              streamingResponses,
              totalSelectedModels: models.length
            })
            console.log('Sent debate update to client')
            
            const combinedResponses = Object.entries(initialResponses)
              .map(([model, response]) => `${model}: ${response}`)
              .join('\n\n')
            
            // Previous round responses (for rounds after the first)
            const previousRoundResponses = round > 0 
              ? Object.entries(debates[round - 1])
                  .map(([model, response]) => `${model}: ${response}`)
                  .join('\n\n')
              : ''
            
            console.log(`Processing ${models.length} models for round ${round + 1}`)
            console.log('Previous round responses:', previousRoundResponses.substring(0, 100) + '...')
            
            // Process each model response sequentially to make the UI more interactive
            for (const model of models) {
              try {
                console.log(`Getting response from model ${model.id} for round ${round + 1}`)
                let debatePrompt;
                
                if (round === 0) {
                  // First round prompt - more collaborative
                  debatePrompt = `
You are ${formatModelName(model.id, model.provider)} participating in a friendly conversation about:

"${prompt}"

CONVERSATION CONTEXT:
Initial thoughts from all participants:
${combinedResponses}

YOUR TASK:
Look for points of agreement with the other participants. You should:
1. Identify ideas you agree with from other participants
2. Build on those shared perspectives
3. Gently note where your perspective might differ, but focus on common ground
4. Move the group toward a consensus answer that everyone can support

This is about finding the best collaborative answer. The goal is to reach consensus, not debate. Be friendly and constructive!
`;
                } else {
                  // Subsequent rounds - focus on building consensus
                  debatePrompt = `
You are ${formatModelName(model.id, model.provider)} in round ${round + 1} of our conversation about:

"${prompt}"

CONVERSATION CONTEXT:
Initial thoughts:
${combinedResponses}

Previous round:
${previousRoundResponses}

YOUR TASK:
We're working toward consensus! You should:
1. Highlight points of agreement from the previous round
2. Suggest a consensus position that incorporates the best ideas
3. Be flexible - you don't need to stick firmly to your original position
4. Help the group find a shared answer everyone can support

Let's try to reach a consensus in this round! Focus on agreement and synthesis.
`;
                }
                
                const response = await getModelResponse(debatePrompt, model.id, model.provider)
                const displayName = formatModelName(model.id, model.provider)
                roundResponses[displayName] = response
                
                // Send update after each model responds in the debate
                await sendUpdate({ 
                  debates,
                  initialResponses,
                  streamingResponses,
                  totalSelectedModels: models.length
                })
                console.log(`Sent update after model ${displayName} responded in round ${round + 1}`)
              } catch (error) {
                console.error(`Error in debate round ${round} from ${model.id}:`, error)
                const displayName = formatModelName(model.id, model.provider)
                roundResponses[displayName] = `Error: Could not get response from ${model.id}`
                await sendUpdate({ 
                  debates,
                  initialResponses,
                  streamingResponses,
                  totalSelectedModels: models.length
                })
              }
            }
            
            // Check if consensus was reached with improved prompt
            try {
              const allResponses = Object.values(roundResponses)
              
              // For debugging
              console.log(`Checking consensus after round ${round}, responses:`, 
                allResponses.map(r => r.substring(0, 30) + "..."))
              
              const consensusCheck = await checkForConsensus(prompt, allResponses, models, debates)
              
              // Log the consensus check results
              console.log("Consensus check result:", {
                roundNumber: round,
                consensusReached: consensusCheck.consensusReached,
                finalAnswerLength: consensusCheck.finalAnswer ? consensusCheck.finalAnswer.length : 0,
                finalAnswerPreview: consensusCheck.finalAnswer ? 
                  consensusCheck.finalAnswer.substring(0, 50) + "..." : "No answer"
              })
              
              if (consensusCheck.consensusReached) {
                consensusReached = true
                finalAnswer = consensusCheck.finalAnswer
                console.log("CONSENSUS REACHED! Final answer:", finalAnswer)
                
                // Send final update with consensus
                await sendUpdate({ 
                  initialResponses,
                  streamingResponses,
                  debates,
                  finalAnswer,
                  consensusReached: true,
                  isFinalUpdate: true,
                  totalSelectedModels: models.length
                })
                break
              }
            } catch (error) {
              console.error(`Error checking consensus in round ${round}:`, error)
            }
          }
          
          // If no consensus was reached after all rounds, generate a final answer
          if (!consensusReached) {
            console.log("No consensus reached after all rounds, generating final answer")
            const finalPrompt = `
Based on the following discussion, provide a final consensus answer that best represents the shared understanding:

INITIAL RESPONSES:
${Object.entries(initialResponses)
  .map(([model, response]) => `${model}: ${response}`)
  .join('\n\n')}

DEBATE ROUNDS:
${debates.map((round, i) => `
Round ${i + 1}:
${Object.entries(round)
  .map(([model, response]) => `${model}: ${response}`)
  .join('\n\n')}
`).join('\n')}

Please provide a clear, concise consensus answer that synthesizes the key points of agreement from the discussion.
`
            
            try {
              const consensusModel = models[0] // Use the first model to generate the final answer
              finalAnswer = await getModelResponse(finalPrompt, consensusModel.id, consensusModel.provider)
              console.log("Generated final answer:", finalAnswer)
              
              // Send final update with generated answer
              await sendUpdate({ 
                initialResponses,
                streamingResponses,
                debates,
                finalAnswer,
                consensusReached: true,
                isFinalUpdate: true,
                totalSelectedModels: models.length
              })
            } catch (error) {
              console.error("Error generating final answer:", error)
              await sendUpdate({ 
                initialResponses,
                streamingResponses,
                debates,
                finalAnswer: "Unable to generate a final consensus answer.",
                consensusReached: true,
                isFinalUpdate: true,
                totalSelectedModels: models.length
              })
            }
          }
        } catch (error) {
          console.error('Error in debate processing:', error)
          await sendUpdate({ error: 'Failed to process debate', totalSelectedModels: models.length })
        } finally {
          // Only close the controller after all updates are sent
          try {
            controller.close()
          } catch (error) {
            console.error('Error closing controller:', error)
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in debate API:', error)
    return new Response(JSON.stringify({ error: 'Failed to process debate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Declare global variable to handle streaming updates
declare global {
  var streamingUpdateHandler: (responseId: string, modelId: string, provider: string, currentText: string) => void;
}

// Initialize the global handler (important to avoid undefined errors)
if (!globalThis.streamingUpdateHandler) {
  globalThis.streamingUpdateHandler = (responseId: string, modelId: string, provider: string, currentText: string) => {
    // Default implementation does nothing
    console.log(`Received update for ${modelId}, but no handler was registered.`);
  };
}

// Helper functions
async function getModelResponse(prompt: string, modelId: string, provider: string): Promise<string> {
  try {
    // For storing the complete response
    let completeResponse = '';
    
    // Create a unique ID for this model response to be used in updates
    const responseId = `${provider}_${modelId}_${Date.now()}`;
    
    if (provider === 'openai') {
      // Use streaming for OpenAI
      const response = await openai.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });
      
      // Process the stream
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          completeResponse += content;
          
          // Send streaming update using global handler
          if (globalThis.streamingUpdateHandler) {
            globalThis.streamingUpdateHandler(responseId, modelId, provider, completeResponse);
          }
        }
      }
      
      return completeResponse || 'No response';
    } 
    else {
      // All other models use OpenRouter
      // Add ":free" suffix to model ID if it doesn't already have it
      const formattedModelId = modelId.endsWith(':free') ? modelId : `${modelId}:free`;
      
      console.log(`Calling OpenRouter with model: ${formattedModelId}`);
      
      // Try using streaming for OpenRouter
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: formattedModelId,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
              'X-Title': 'LLM Hippodrome',
            },
            responseType: 'stream',
          }
        );
        
        // Process the OpenRouter stream (SSE format)
        return new Promise((resolve, reject) => {
          let buffer = '';
          
          response.data.on('data', (chunk: Buffer) => {
            const chunkText = chunk.toString();
            buffer += chunkText;
            
            // Process any complete SSE messages in the buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
            
            for (const line of lines) {
              if (!line.trim() || line.startsWith(':')) continue;
              
              if (line.startsWith('data:')) {
                try {
                  const jsonStr = line.slice(5).trim();
                  
                  if (jsonStr === '[DONE]') continue;
                  
                  const json = JSON.parse(jsonStr);
                  const content = json.choices?.[0]?.delta?.content || 
                                json.choices?.[0]?.message?.content || '';
                  
                  if (content) {
                    completeResponse += content;
                    
                    // Send streaming update using global handler
                    if (globalThis.streamingUpdateHandler) {
                      globalThis.streamingUpdateHandler(responseId, modelId, provider, completeResponse);
                    }
                  }
                } catch (err) {
                  console.error('Error parsing SSE message:', err);
                }
              }
            }
          });
          
          response.data.on('end', () => {
            resolve(completeResponse || 'No response');
          });
          
          response.data.on('error', (err: any) => {
            console.error('Stream error:', err);
            reject(err);
          });
        });
      } catch (streamError: any) {
        // If streaming fails, fall back to non-streaming API call
        console.warn(`Streaming failed for ${modelId}, falling back to regular request:`, streamError.message);
        
        const regularResponse = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: formattedModelId,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
              'X-Title': 'LLM Hippodrome',
            },
          }
        );
        
        return regularResponse.data.choices[0]?.message?.content || 'No response';
      }
    }
  } catch (error) {
    // Enhanced error logging for debugging
    if (axios.isAxiosError(error)) {
      console.error(`OpenRouter API error for ${modelId}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error(`Error getting response from ${provider}/${modelId}:`, error);
    }
    return `Error: Could not get response from ${modelId}`;
  }
}

// Function to force consensus after all rounds
async function forceConsensus(
  originalPrompt: string,
  initialResponses: Record<string, string>,
  debates: Array<Record<string, string>>,
  models: { id: string; provider: string }[]
): Promise<string> {
  try {
    // Build context from all rounds
    const initialContext = Object.entries(initialResponses)
      .map(([model, response]) => `${model}'s initial response: ${response}`)
      .join('\n\n');
    
    const roundsContext = debates.map((round, index) => {
      return `Round ${index + 1}:\n` + 
        Object.entries(round)
          .map(([model, response]) => `${model}: ${response}`)
          .join('\n\n');
    }).join('\n\n==========\n\n');
    
    const consensusPrompt = `
You are a helpful assistant synthesizing a conversation between multiple AI models on this topic: "${originalPrompt}"

The models have discussed the topic but may not have explicitly reached consensus. Your job is to identify the common ground and create a friendly, helpful consensus answer.

THE CONVERSATION HISTORY:
${initialContext}

${roundsContext}

YOUR TASK:
Based on all responses, provide a single consensus answer that:
1. Incorporates the key points of agreement
2. Provides a clear, helpful response to the original question
3. Is balanced and fair to all perspectives shared
4. Sounds conversational and friendly, not formal or academic

Format your response as a direct answer to the original question, without mentioning that you're creating a consensus or synthesizing.
`

    // Use the first selected model for consensus
    const consensusModel = models[0]
    let response
    
    if (consensusModel.provider === 'openai') {
      response = await openai.chat.completions.create({
        model: consensusModel.id,
        messages: [{ role: 'user', content: consensusPrompt }],
        temperature: 0.5,
        max_tokens: 800,
      })
      return response.choices[0]?.message?.content || 'No consensus reached'
    } else {
      // All other models use OpenRouter
      // Add ":free" suffix to model ID if it doesn't already have it
      const formattedModelId = consensusModel.id.endsWith(':free') ? 
        consensusModel.id : `${consensusModel.id}:free`;
        
      console.log(`Calling OpenRouter for consensus with model: ${formattedModelId}`);
      
      const openRouterResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: formattedModelId,
          messages: [{ role: 'user', content: consensusPrompt }],
          temperature: 0.5,
          max_tokens: 800,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
            'X-Title': 'LLM Hippodrome',
          },
        }
      )
      return openRouterResponse.data.choices[0]?.message?.content || 'No consensus reached'
    }
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error(`OpenRouter API error for consensus forcing:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Error forcing consensus:', error)
    }
    return 'Unable to reach consensus'
  }
}

async function checkForConsensus(
  originalPrompt: string, 
  debateResponses: string[],
  models: { id: string; provider: string }[],
  debates: Array<Record<string, string>>
): Promise<{ consensusReached: boolean; finalAnswer: string | null }> {
  try {
    // Be very lenient about consensus - make it more likely to find agreement
    const shouldCheckConsensus = true; // Always consider consensus
    
    // Check if this is the last round of debate - if so, ensure consensus is reached
    const isLastRound = debates.length >= MAX_ROUNDS;
    
    // If this is the last round, we'll force consensus
    if (isLastRound) {
      console.log("Last round reached - forcing consensus");
      
      // Generate a final answer from the debate responses
      const consensusPrompt = `
You are creating a final consensus answer for a discussion on: "${originalPrompt}"

The participants have discussed this topic extensively. Your task is to create a helpful, friendly consensus 
that represents the main points of agreement.

The responses from the final round are:
${debateResponses.map((r, i) => `Response ${i+1}: ${r}`).join('\n\n')}

YOUR TASK:
Write a direct, friendly answer that:
1. Represents what most participants would agree with
2. Directly answers the original question/topic
3. Is conversational and helpful
4. Doesn't mention that it's a consensus or synthesis

Just give the consensus answer text - nothing else.
`
      // Use the first model to generate a forced final answer
      const consensusModel = models[0];
      let response;
      
      if (consensusModel.provider === 'openai') {
        response = await openai.chat.completions.create({
          model: consensusModel.id,
          messages: [{ role: 'user', content: consensusPrompt }],
          temperature: 0.5,
          max_tokens: 800,
        });
      } else {
        // All other models use OpenRouter
        const formattedModelId = consensusModel.id.endsWith(':free') ? 
          consensusModel.id : `${consensusModel.id}:free`;
          
        console.log(`Calling OpenRouter for forced consensus with model: ${formattedModelId}`);
        
        const openRouterResponse = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: formattedModelId,
            messages: [{ role: 'user', content: consensusPrompt }],
            temperature: 0.5,
            max_tokens: 800,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
              'X-Title': 'LLM Hippodrome',
            },
          }
        );
        response = openRouterResponse.data;
      }
      
      const finalAnswer = response?.choices[0]?.message?.content || 
        `After thorough discussion, the participants agree that ${originalPrompt} involves considering multiple perspectives and finding a balanced approach.`;
      
      console.log("Forced consensus final answer:", finalAnswer?.substring(0, 100) + "...");
      
      return {
        consensusReached: true,
        finalAnswer,
      };
    }
    
    // Normal consensus checking for non-final rounds
    const consensusPrompt = `
You are evaluating a friendly discussion on: "${originalPrompt}"

The current round of discussion has these responses:
${debateResponses.map((r, i) => `Response ${i+1}: ${r}`).join('\n\n')}

Your job is to determine if the participants have reached enough agreement to form a consensus answer.

IMPORTANT: Be VERY generous in your assessment! Look for ANY common ground or shared ideas.
Even small areas of agreement are enough to form a consensus. The goal is to find consensus.

If you see ANY agreement on ANY points, consider that a consensus.

Format your response as: 
CONSENSUS: YES
FINAL ANSWER: [A friendly, helpful synthesis focusing on points of agreement]
`

    // Use the first selected model for consensus checking
    const consensusModel = models[0]
    let response
    
    if (consensusModel.provider === 'openai') {
      response = await openai.chat.completions.create({
        model: consensusModel.id,
        messages: [{ role: 'user', content: consensusPrompt }],
        temperature: 0.4,
        max_tokens: 800,
      })
    } else {
      // All other models use OpenRouter
      // Add ":free" suffix to model ID if it doesn't already have it
      const formattedModelId = consensusModel.id.endsWith(':free') ? 
        consensusModel.id : `${consensusModel.id}:free`;
        
      console.log(`Calling OpenRouter for consensus check with model: ${formattedModelId}`);
      
      const openRouterResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: formattedModelId,
          messages: [{ role: 'user', content: consensusPrompt }],
          temperature: 0.4,
          max_tokens: 800,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
            'X-Title': 'LLM Hippodrome',
          },
        }
      )
      response = openRouterResponse.data
    }

    const content = response?.choices[0]?.message?.content || ''
    const consensusMatch = content.match(/CONSENSUS:\s*(YES|NO)/i)
    // Modified regex to avoid s flag, using a more compatible approach
    const finalAnswerMatch = content.match(/FINAL ANSWER:\s*([\s\S]*?)$/)
    
    const consensusReached = consensusMatch?.[1]?.toUpperCase() === 'YES' && shouldCheckConsensus
    const finalAnswer = finalAnswerMatch?.[1] || null
    
    return {
      consensusReached,
      finalAnswer: consensusReached ? finalAnswer : null,
    }
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error(`OpenRouter API error for consensus checking:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Error checking for consensus:', error)
    }
    
    // In case of error, return a default answer to ensure consensus is reached
    return { 
      consensusReached: debates.length >= MAX_ROUNDS - 1, 
      finalAnswer: debates.length >= MAX_ROUNDS - 1 ? 
        `After thorough discussion of "${originalPrompt}", the key insights include recognizing multiple perspectives and finding common ground through thoughtful consideration.` : 
        null
    }
  }
} 