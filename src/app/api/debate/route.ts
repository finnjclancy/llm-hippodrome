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

export async function POST(request: Request) {
  try {
    const { prompt, models } = await request.json()
    
    if (!prompt || !models || !Array.isArray(models) || models.length < 2) {
      return NextResponse.json(
        { error: 'Invalid request. Please provide a prompt and at least 2 models.' },
        { status: 400 }
      )
    }
    
    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Initial state
        const initialResponses: Record<string, string> = {}
        const streamingResponses: Record<string, string> = {} // Track responses being streamed
        const activeResponseIds: Record<string, string> = {} // Map model identifiers to response IDs
        const debates: Array<Record<string, string>> = []
        let consensusReached = false
        let finalAnswer: string | null = null
        
        // Enhanced sendUpdate function for more reliable data transmission
        const sendUpdate = () => {
          try {
            // Debug log for client updates
            console.log("Sending update to client:", {
              initialResponsesCount: Object.keys(initialResponses).length,
              streamingCount: Object.keys(streamingResponses).length,
              debatesCount: debates.length,
              consensusReached,
              hasFinalAnswer: !!finalAnswer
            });
            
            const data = JSON.stringify({
              initialResponses,
              streamingResponses, // Include streaming responses
              debates,
              finalAnswer,
              consensusReached,
            })
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            console.error("Error in sendUpdate:", error);
          }
        }
        
        // Function to ensure final consensus data is sent reliably
        const sendFinalConsensus = async () => {
          if (!finalAnswer) {
            console.warn("Attempted to send final consensus but finalAnswer is null");
            return;
          }
          
          // Send final update with specific flag
          try {
            console.log("Sending FINAL CONSENSUS update:", finalAnswer.substring(0, 50) + "...");
            
            const finalData = JSON.stringify({
              initialResponses,
              streamingResponses,
              debates,
              finalAnswer,
              consensusReached: true,
              isFinalUpdate: true, // Extra flag to signal this is the final update
            });
            
            controller.enqueue(encoder.encode(finalData));
            
            // Short delay to ensure client receives it
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error("Error sending final consensus:", error);
          }
        }
        
        // Inner implementation of streaming updates function
        // This is called from the getModelResponse function
        const handleStreamingUpdate = (responseId: string, modelId: string, provider: string, currentText: string) => {
          try {
            const displayName = formatModelName(modelId, provider);
            
            // Determine which phase we're in (initial responses or debate round)
            if (!initialResponses[displayName] && debates.length === 0) {
              // If in initial response phase
              streamingResponses[displayName] = currentText;
              activeResponseIds[displayName] = responseId;
            } else if (debates.length > 0) {
              // If in debate phase, update the current round
              const currentRound = debates[debates.length - 1];
              if (activeResponseIds[displayName] === responseId) {
                currentRound[displayName] = currentText;
              }
            }
            
            // Send the update to the client
            sendUpdate();
          } catch (error) {
            console.error("Error in streaming update:", error);
          }
        };
        
        // Override the global streaming update function to use our local implementation
        globalThis.streamingUpdateHandler = handleStreamingUpdate;
        
        // Function to finalize a streaming response (called when a stream is complete)
        const finalizeResponse = (displayName: string, finalText: string) => {
          // If this was an initial response
          if (streamingResponses[displayName] && !initialResponses[displayName]) {
            initialResponses[displayName] = finalText;
            delete streamingResponses[displayName];
          }
          
          // Clear the active response ID
          delete activeResponseIds[displayName];
          
          // Send update after finalizing
          sendUpdate();
        };
        
        // Get initial responses from all models with a friendlier prompt
        const initialPromises = models.map(async (model: { id: string; provider: string }) => {
          try {
            const initialPrompt = `
You are participating in a collaborative discussion on the following topic:

"${prompt}"

Please share your initial thoughts on this topic. Be thoughtful but conversational - we're looking for your perspective, but the goal is to find common ground with other AI models.

This is a friendly conversation, not a formal debate. Share your valuable insights while being open to reaching consensus with others.
`;
            
            const displayName = formatModelName(model.id, model.provider);
            
            // Add placeholder to show a model is responding
            streamingResponses[displayName] = "Thinking...";
            sendUpdate();
            
            const response = await getModelResponse(initialPrompt, model.id, model.provider)
            
            // Finalize the response
            finalizeResponse(displayName, response);
          } catch (error) {
            console.error(`Error getting initial response from ${model.id}:`, error)
            const displayName = formatModelName(model.id, model.provider)
            initialResponses[displayName] = `Error: Could not get response from ${model.id}`
            delete streamingResponses[displayName]; // Clean up any partial streaming
            sendUpdate()
          }
        })
        
        // Wait for all initial responses
        await Promise.all(initialPromises)
        
        // Debate rounds with more collaborative prompts
        for (let round = 0; round < MAX_ROUNDS && !consensusReached; round++) {
          const roundResponses: Record<string, string> = {}
          debates.push(roundResponses) // Add the round immediately so it appears in the UI
          sendUpdate()
          
          const combinedResponses = Object.entries(initialResponses)
            .map(([model, response]) => `${model}: ${response}`)
            .join('\n\n')
          
          // Previous round responses (for rounds after the first)
          const previousRoundResponses = round > 0 
            ? Object.entries(debates[round - 1])
                .map(([model, response]) => `${model}: ${response}`)
                .join('\n\n')
            : '';
          
          // Process each model response sequentially to make the UI more interactive
          for (const model of models) {
            try {
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
              sendUpdate()
            } catch (error) {
              console.error(`Error in debate round ${round} from ${model.id}:`, error)
              const displayName = formatModelName(model.id, model.provider)
              roundResponses[displayName] = `Error: Could not get response from ${model.id}`
              sendUpdate()
            }
          }
          
          // Check if consensus was reached with improved prompt
          try {
            const allResponses = Object.values(roundResponses)
            
            // For debugging
            console.log(`Checking consensus after round ${round}, responses:`, 
              allResponses.map(r => r.substring(0, 30) + "..."));
            
            const consensusCheck = await checkForConsensus(prompt, allResponses, models, debates)
            
            // Log the consensus check results
            console.log("Consensus check result:", {
              roundNumber: round,
              consensusReached: consensusCheck.consensusReached,
              finalAnswerLength: consensusCheck.finalAnswer ? consensusCheck.finalAnswer.length : 0,
              finalAnswerPreview: consensusCheck.finalAnswer ? 
                consensusCheck.finalAnswer.substring(0, 50) + "..." : "No answer"
            });
            
            if (consensusCheck.consensusReached) {
              consensusReached = true
              finalAnswer = consensusCheck.finalAnswer
              console.log("CONSENSUS REACHED! Final answer:", finalAnswer);
              sendUpdate()
              break
            }
          } catch (error) {
            console.error(`Error checking consensus in round ${round}:`, error)
          }
        }
        
        // Replace the consensus section with a simpler, more direct approach
        if (!consensusReached) {
          console.log("Starting simple consensus loop process")
          
          // Get one model to propose a consensus answer
          const proposerModel = models[0]
          const displayName = formatModelName(proposerModel.id, proposerModel.provider)
          
          // Build context from all previous discussion
          const allDiscussionContext = [
            ...Object.entries(initialResponses).map(([model, resp]) => `${model}'s initial thoughts: ${resp}`),
            ...debates.flatMap((round, i) => 
              Object.entries(round).map(([model, resp]) => `${model} in round ${i+1}: ${resp}`)
            )
          ].join('\n\n');
          
          try {
            // Create a new round for consensus proposal
            const consensusProposalRound: Record<string, string> = {}
            debates.push(consensusProposalRound)
            
            // Prompt for initial consensus proposal
            const proposePrompt = `
You are summarizing a discussion about: "${prompt}"

Here's the full conversation so far:
${allDiscussionContext}

YOUR TASK:
Based on this discussion, write a balanced consensus answer that all participants would likely agree on.
This will be shown to the other participants for their approval.

Your consensus answer should:
1. Directly address the original topic/question
2. Focus ONLY on the main points where everyone seems to agree
3. Be fair to all perspectives shared
4. Be conversational, helpful and clear
5. Avoid controversial or divisive statements
6. Use moderate, balanced language that everyone can accept

Remember that the goal is to create a consensus that ALL participants will agree with.
Make your answer general enough that it avoids specific points of disagreement.

Provide ONLY the consensus answer - no explanations or additional text. This will be shown directly to other models for approval.
`

            const proposedConsensus = await getModelResponse(proposePrompt, proposerModel.id, proposerModel.provider)
            consensusProposalRound[displayName] = `PROPOSED CONSENSUS: ${proposedConsensus}`
            
            console.log("Initial consensus proposed:", proposedConsensus.substring(0, 100) + "...")
            sendUpdate()
            
            // Start with the proposed consensus
            let currentConsensus = proposedConsensus
            let allAgreed = false
            let consensusRound = 0
            const maxConsensusRounds = 5 // Prevent infinite loops
            
            // Loop until all models agree or max rounds reached
            while (!allAgreed && consensusRound < maxConsensusRounds) {
              consensusRound++
              console.log(`Starting consensus round ${consensusRound}`)
              
              // Create a new round for this consensus iteration
              const consensusVotingRound: Record<string, string> = {}
              debates.push(consensusVotingRound)
              
              let yesVotes = 0
              let updatedConsensus = null
              
              // Ask each model for approval or updates
              for (let i = 0; i < models.length; i++) {
                const model = models[i]
                const modelDisplayName = formatModelName(model.id, model.provider)
                
                // Skip the proposer in the first round
                if (consensusRound === 1 && i === 0) {
                  consensusVotingRound[modelDisplayName] = "I proposed the consensus above."
                  yesVotes++
                  continue
                }
                
                try {
                  const approvalPrompt = `
A consensus answer has been proposed for the topic: "${prompt}"

PROPOSED CONSENSUS:
"${currentConsensus}"

IMPORTANT: The goal is to reach consensus, so please try to agree unless there's a serious issue.
Small differences in wording or emphasis are not sufficient reasons to disagree.

Do you agree with this as the final consensus answer?

IF YOU AGREE: Reply with EXACTLY "YES" (all caps, just the word YES).
IF YOU STRONGLY DISAGREE: Provide a VERY specific and BRIEF suggested revision to the consensus answer.

Your response will be shown directly to other models. If you say YES, we'll move forward with this answer.
If you suggest a revision, your revision may become the new proposed consensus.

Remember: Unless there are major problems, it's better to agree and move forward with consensus.
`

                  const response = await getModelResponse(approvalPrompt, model.id, model.provider)
                  consensusVotingRound[modelDisplayName] = response
                  
                  // Check if this is a YES response - more permissive matching to catch variations
                  if (response.trim().toUpperCase().includes("YES") || 
                      response.trim().toUpperCase().startsWith("I AGREE") ||
                      response.trim().toUpperCase().startsWith("AGREE")) {
                    yesVotes++
                    // Override the displayed response to show clear agreement
                    consensusVotingRound[modelDisplayName] = "YES"
                  } else if (!updatedConsensus && response.trim().length > 5) {
                    // Use the first non-agreeing response as an updated proposal
                    updatedConsensus = response
                  }
                  
                  sendUpdate()
                } catch (error) {
                  console.error(`Error getting consensus approval from ${model.id}:`, error)
                  consensusVotingRound[modelDisplayName] = `Error: Could not get response from ${model.id}`
                  sendUpdate()
                }
              }
              
              // Check if all models have agreed
              if (yesVotes === models.length) {
                allAgreed = true
                consensusReached = true
                finalAnswer = currentConsensus
                console.log("ALL MODELS AGREED ON CONSENSUS!")
                sendUpdate()
                break
              } 
              // If not all agreed but we have an updated proposal, use it for the next round
              else if (updatedConsensus) {
                console.log(`Not all agreed (${yesVotes}/${models.length}). Updating consensus proposal.`)
                
                // Create a new round to show the updated consensus
                const updatedProposalRound: Record<string, string> = {}
                debates.push(updatedProposalRound)
                
                // Extract a clear answer from the update if needed
                const cleanedUpdate = updatedConsensus
                  .replace(/^.*?consensus:?\s*/i, '')
                  .replace(/^["']|["']$/g, '')
                  .trim();
                  
                currentConsensus = cleanedUpdate
                updatedProposalRound[formatModelName(models[0].id, models[0].provider)] = `UPDATED CONSENSUS: ${currentConsensus}`
                
                sendUpdate()
              }
              // If more than half agreed, we can consider it a consensus
              else if (yesVotes >= Math.ceil(models.length / 2)) {
                console.log(`Majority consensus reached (${yesVotes}/${models.length}).`)
                allAgreed = true
                consensusReached = true
                finalAnswer = currentConsensus
                sendUpdate()
                break
              }
              // If this is the last round and we still don't have consensus
              else if (consensusRound === maxConsensusRounds - 1) {
                console.log(`Last consensus round (${consensusRound}) with ${yesVotes}/${models.length} agreements. Forcing consensus.`)
                // Force consensus on the last round
                consensusReached = true
                finalAnswer = currentConsensus
                sendUpdate()
                break
              }
            }
            
            // If we exit the loop without consensus, use the last proposal anyway
            if (!consensusReached) {
              console.log("Max consensus rounds reached, using last proposal")
              consensusReached = true
              finalAnswer = currentConsensus
              sendUpdate()
            }
          } catch (error) {
            console.error("Error in simplified consensus process:", error)
            
            // Fallback if the consensus process fails
            try {
              console.log("Using fallback consensus method")
              const fallbackPrompt = `
Create a simple consensus answer for the topic: "${prompt}" based on the debate.
Provide only the direct answer, no explanations or meta-commentary.
`
              const fallbackConsensus = await getModelResponse(fallbackPrompt, models[0].id, models[0].provider)
              finalAnswer = fallbackConsensus
              consensusReached = true
              sendUpdate()
            } catch (e) {
              console.error("Even fallback consensus failed:", e)
              finalAnswer = `The key takeaway about "${prompt}" is that it has multiple valid perspectives worth considering.`
              consensusReached = true
              sendUpdate()
            }
          }
        }
        
        // If consensus was reached, ensure the final answer is sent
        if (consensusReached && finalAnswer) {
          await sendFinalConsensus();
        } 
        // If we still don't have a final answer for any reason, generate one anyway
        else if (!finalAnswer) {
          try {
            console.log("No final answer found, creating one as fallback");
            // Use all available data for a last-resort consensus
            const allResponses = [
              ...Object.entries(initialResponses).map(([model, resp]) => `${model}'s initial thoughts: ${resp}`),
              ...debates.flatMap((round, i) => 
                Object.entries(round).map(([model, resp]) => `${model} in round ${i+1}: ${resp}`)
              )
            ];
            
            // Simple prompt for generating a final answer
            const fallbackPrompt = `
I need you to create a consensus answer for this discussion topic: "${prompt}"

Here's what the participants have said:
${allResponses.join('\n\n')}

YOUR TASK:
Write a direct, friendly answer that:
1. Represents what most participants would agree with
2. Directly answers the original question/topic
3. Is conversational and helpful
4. Doesn't mention that it's a consensus or synthesis

Just give me the consensus answer text - nothing else. This will be displayed directly to the user as the answer to their question.
`
            // Use the first model to generate the answer
            let fallbackAnswer
            try {
              fallbackAnswer = await getModelResponse(fallbackPrompt, models[0].id, models[0].provider)
            } catch (e) {
              // If the first model fails, try with a different model
              console.log("First model failed for fallback, trying another model")
              if (models.length > 1) {
                fallbackAnswer = await getModelResponse(fallbackPrompt, models[1].id, models[1].provider)
              } else {
                // Last resort fallback
                fallbackAnswer = `Based on the discussion, the participants generally agree that ${prompt} involves multiple perspectives. While there are different viewpoints, the key insight is that this topic requires thoughtful consideration of various factors.`
              }
            }
            
            finalAnswer = fallbackAnswer
            consensusReached = true
            
            console.log("Generated fallback consensus:", finalAnswer)
            
            await sendFinalConsensus();
          } catch (error) {
            console.error('Error creating fallback consensus:', error)
            
            // Ultimate emergency fallback
            finalAnswer = `After discussing "${prompt}", the key takeaway is that this topic has multiple perspectives worth considering.`;
            consensusReached = true;
            
            await sendFinalConsensus();
          }
        }
        
        // One last regular update before closing the stream
        sendUpdate();
        
        // Close the stream immediately without delay
        controller.close();
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Error in debate API:', error)
    return NextResponse.json(
      { error: 'Failed to process debate' },
      { status: 500 }
    )
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