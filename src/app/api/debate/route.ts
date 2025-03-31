import { NextResponse } from 'next/server'
import axios from 'axios'

// Maximum debate rounds
const MAX_ROUNDS = 3

// Model formatting
const formatModelName = (id: string) => {
  // Remove any :free suffix for display
  let displayId = id.replace(/:free$/, '');
  
  // If it has a vendor prefix (contains /), extract just the model name
  if (displayId.includes('/')) {
    // Extract the part after the last slash
    displayId = displayId.split('/').pop() || displayId;
  }
  
  // Convert kebab-case to more readable format with spaces and capitalize each word
  return displayId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function POST(req: Request) {
  try {
    const { prompt, models } = await req.json()
    
    // Get the API key from request headers or fallback to env variable
    const apiKey = req.headers.get('x-openrouter-key') || process.env.OPENROUTER_API_KEY
    
    console.log('Received debate request:', { prompt, models })
    console.log('Using API key:', apiKey ? 'API key present' : 'No API key provided')
    
    if (!prompt || !models || !Array.isArray(models) || models.length < 2) {
      console.error('Invalid request:', { prompt, models })
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (!apiKey) {
      console.error('No API key provided')
      return new Response(JSON.stringify({ error: 'OpenRouter API key is required' }), {
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
You are ${formatModelName(model.id)} participating in a friendly conversation about:

"${prompt}"

Please share your initial thoughts on this topic. Be thoughtful but conversational - we're looking for your perspective, but the goal is to find common ground with other AI models.

This is a friendly conversation, not a formal debate. Share your valuable insights while being open to reaching consensus with others.
`;
              
              const displayName = formatModelName(model.id)
              console.log(`Adding placeholder for ${displayName}`)
              
              // Add placeholder to show a model is responding
              streamingResponses[displayName] = "Thinking..."
              await sendUpdate({ 
                initialResponses, 
                streamingResponses,
                totalSelectedModels: models.length  // Add this to ensure UI knows total count
              })
              
              console.log(`Getting response from ${model.id}`)
              const response = await getModelResponse(initialPrompt, model.id, apiKey)
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
              const displayName = formatModelName(model.id)
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
You are ${formatModelName(model.id)} participating in a friendly conversation about:

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
You are ${formatModelName(model.id)} in round ${round + 1} of our conversation about:

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
                
                const response = await getModelResponse(debatePrompt, model.id, apiKey)
                const displayName = formatModelName(model.id)
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
                const displayName = formatModelName(model.id)
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
              
              const consensusCheck = await checkForConsensus(prompt, allResponses, models, debates, apiKey)
              
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
                
                // Exit the debate loop
                break
              }
            } catch (error) {
              console.error(`Error checking consensus after round ${round}:`, error)
            }
            
            // Get consensus after max rounds or if we already have a final answer
            if (round === MAX_ROUNDS - 1 || finalAnswer) {
              // We've reached the max rounds, so force consensus and break the loop
              consensusReached = true
              
              // Send a status update
              await sendUpdate({ 
                initialResponses,
                streamingResponses,
                debates,
                totalSelectedModels: models.length
              })
            }
          }
          
          // Force consensus if not reached naturally
          if (!consensusReached) {
            console.log("Forcing consensus after maximum rounds")
            const forcedConsensus = await forceConsensus(prompt, initialResponses, debates, models, apiKey)
            await sendUpdate({ 
              initialResponses,
              streamingResponses,
              debates,
              finalAnswer: forcedConsensus,
              consensusReached: true,
              forced: true,
              totalSelectedModels: models.length
            })
          }
          
        } catch (error) {
          console.error('Error in debate process:', error)
          await sendUpdate({ 
            error: 'An error occurred during the debate process',
            totalSelectedModels: models.length
          })
        } finally {
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (error) {
    console.error('Error in debate endpoint:', error)
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function getModelResponse(prompt: string, modelId: string, apiKey: string): Promise<string> {
  try {
    // Add ":free" suffix to model ID if it doesn't already have it
    const formattedModelId = modelId.endsWith(':free') ? modelId : `${modelId}:free`;
    
    console.log(`Calling OpenRouter with model: ${formattedModelId}`);
    
    // Use non-streaming request only
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: formattedModelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false, // Explicitly disable streaming
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
          'X-Title': 'LLM Hippodrome',
        },
      }
    );
    
    console.log(`Response received for ${modelId}`);
    return response.data.choices[0]?.message?.content || 'No response content';
    
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error(`OpenRouter API error for ${modelId}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: JSON.stringify(error.response?.data || {}),
        message: error.message
      });
      
      // If we get a 404 or 400, the model might not be available
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log(`Model ${modelId} might not be available or formatted correctly.`);
        
        // Try an alternative format if the model has a slash
        if (modelId.includes('/') && !modelId.endsWith('__retry')) {
          try {
            // Try just the model name part (after the slash)
            const altModelId = `${modelId.split('/').pop()}:free`;
            console.log(`Retrying with alternative model ID: ${altModelId}`);
            
            // Try the request again with the alternative ID
            return await getModelResponse(prompt, altModelId + '__retry', apiKey);
          } catch (retryError) {
            console.error(`Retry with alternative model ID also failed for ${modelId}`);
            return `Error: Model ${modelId} is not available on OpenRouter's free tier`;
          }
        }
      }
    } else {
      console.error(`Error getting model response for ${modelId}:`, error);
    }
    return `Error: Could not get response from model ${modelId}`;
  }
}

async function forceConsensus(
  originalPrompt: string,
  initialResponses: Record<string, string>,
  debates: Array<Record<string, string>>,
  models: { id: string }[],
  apiKey: string
): Promise<string> {
  try {
    // Build a consensus prompt from all previous interactions
    const initialResponsesText = Object.entries(initialResponses)
      .map(([model, response]) => `${model} initial thoughts: ${response}`)
      .join('\n\n')
    
    const debatesText = debates.map((round, index) => {
      return `Round ${index + 1}:\n` + 
        Object.entries(round)
          .map(([model, response]) => `${model}: ${response}`)
          .join('\n\n')
    }).join('\n\n')
    
    // Choose a consensus model (use the first model or a default OpenRouter model)
    const consensusModel = models[0]
    
    // Build prompt for consensus
    const consensusPrompt = `
As a neutral facilitator, you need to create a consensus summary of the following debate about:

"${originalPrompt}"

Initial perspectives:
${initialResponsesText}

Debate rounds:
${debatesText}

Your task:
1. Identify the KEY POINTS OF AGREEMENT across all participants
2. Create a FINAL CONSENSUS statement that represents what the group would agree on
3. Emphasize areas of common ground and synthesize the best ideas
4. Use neutral language that all participants would accept

Format your response as a single consensus statement without mentioning who said what.
`;

    console.log(`Using model ${consensusModel.id} to force consensus`);
    
    // Using OpenRouter for consensus
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
        stream: false, // Explicitly disable streaming
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
          'X-Title': 'LLM Hippodrome',
        },
      }
    )
    return openRouterResponse.data.choices[0]?.message?.content || 'No consensus reached'
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error(`OpenRouter API error for consensus forcing:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: JSON.stringify(error.response?.data || {}),
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
  models: { id: string }[],
  debates: Array<Record<string, string>>,
  apiKey: string
): Promise<{ consensusReached: boolean; finalAnswer: string | null }> {
  try {
    // If we have 3 or more models, we need to choose a model to check consensus
    // Use the first model by default
    const consensusModel = models[0]
    
    // Format debate responses
    const formattedDebateResponses = debateResponses
      .map((response, index) => `Participant ${index + 1}: ${response}`)
      .join('\n\n')
    
    // Create a prompt to check for consensus
    const consensusPrompt = `
You are evaluating a conversation about: 
"${originalPrompt}"

Below are the most recent responses from participants in the conversation:

${formattedDebateResponses}

Your task is to determine if the participants have reached a substantial consensus or agreement. 
Look for:
1. Common themes and points of agreement
2. Similar conclusions or recommendations
3. Compatible perspectives that align with each other

First, analyze the level of agreement between participants (express as a percentage from 0-100%).
Then, determine if there is enough consensus to create a final statement that all participants would agree with.
Finally, provide a YES or NO verdict on whether consensus has been reached.

Format your response as follows:
Agreement level: [percentage]
Consensus reached: [YES/NO]
Reasoning: [your brief analysis]
Final consensus: [only if consensus is reached, summarize the agreed points]
`;

    const formattedModelId = consensusModel.id.endsWith(':free') ? 
      consensusModel.id : `${consensusModel.id}:free`;
      
    console.log(`Calling OpenRouter for consensus check with model: ${formattedModelId}`);
    
    const openRouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: formattedModelId,
        messages: [{ role: 'user', content: consensusPrompt }],
        temperature: 0.5,
        max_tokens: 800,
        stream: false, // Explicitly disable streaming
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
          'X-Title': 'LLM Hippodrome',
        },
      }
    );
    
    const response = openRouterResponse.data;
    const responseContent = response?.choices[0]?.message?.content || '';
    
    // Parse the response to detect consensus
    const consensusReached = responseContent.toLowerCase().includes('consensus reached: yes');
    let finalAnswer = null;
    
    if (consensusReached) {
      // Try to extract the final consensus from the response
      const finalConsensusMatch = responseContent.match(/Final consensus:([\s\S]*?)$/);
      finalAnswer = finalConsensusMatch ? finalConsensusMatch[1].trim() : null;
    }
    
    // If consensus reached but no final answer extracted, extract it with another prompt
    if (consensusReached && !finalAnswer) {
      console.log("Consensus reached but no final answer extracted, creating one...");
      
      // Format all debate responses, including previous rounds
      let allDebateResponses = '';
      
      if (debates.length > 0) {
        const lastRound = debates[debates.length - 1];
        allDebateResponses = Object.entries(lastRound)
          .map(([model, response]) => `${model}: ${response}`)
          .join('\n\n');
      } else {
        allDebateResponses = formattedDebateResponses;
      }
      
      const summarizationPrompt = `
Based on the conversation about "${originalPrompt}", please provide a final consensus statement that captures the points of agreement from all participants. This should be a summary that all participants would agree represents their collective view.

Conversation:
${allDebateResponses}

Create a concise, clear consensus statement that represents what all participants would agree on.
`;

      const summaryResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: formattedModelId,
          messages: [{ role: 'user', content: summarizationPrompt }],
          temperature: 0.5,
          max_tokens: 800,
          stream: false, // Explicitly disable streaming
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://llm-hippodrome.vercel.app',
            'X-Title': 'LLM Hippodrome',
          },
        }
      );
      
      finalAnswer = summaryResponse.data.choices[0]?.message?.content || 
        `After thorough discussion, the participants agree that ${originalPrompt} involves considering multiple perspectives and finding a balanced approach.`;
      
      console.log("Forced consensus final answer:", finalAnswer?.substring(0, 100) + "...");
      
      return {
        consensusReached: true,
        finalAnswer,
      };
    }
    
    return {
      consensusReached,
      finalAnswer,
    };
  } catch (error) {
    console.error('Error checking for consensus:', error);
    return {
      consensusReached: false,
      finalAnswer: null,
    };
  }
}