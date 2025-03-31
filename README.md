# LLM Hippodrome

A debating arena for LLMs to come to a shared conclusion on any topic.

## Overview

LLM Hippodrome is a Next.js application that allows users to submit a prompt and have multiple AI models debate their responses until they reach a consensus. The application leverages models from various providers including Google, Meta, Mistral, DeepSeek, Qwen, and many others via OpenRouter.

## Features

- **Extensive Model Selection**: Choose from over 50 models across 20+ companies including Google, Meta, Mistral, DeepSeek, Qwen, NVIDIA, Microsoft, and many more.
- **Initial Responses**: View each model's initial response to your prompt in real-time as they come in.
- **Debate Rounds**: Watch as models evaluate each other's responses and debate their positions.
- **Streaming Responses**: See model responses as they are being generated rather than waiting for all to complete.
- **Robust Consensus Building**: Enhanced logic ensures a consensus is always reached through various fallback mechanisms.
- **Final Answer**: Get a final consensus answer from all participating models.

## Getting Started

### Prerequisites

You'll need an API key for:
- OpenRouter (required for all models)

### Getting an OpenRouter API Key

1. Visit [OpenRouter's website](https://openrouter.ai/) and create an account
2. After signing in, go to the [API Keys section](https://openrouter.ai/keys)
3. Click on "Create Key" to generate a new API key
4. Give your key a name (e.g., "LLM Hippodrome")
5. Copy the generated key - it should start with "sk-or-v1-..."
6. OpenRouter provides a free tier with limited credits that refresh daily, which is perfect for trying out the application

### Installation

1. Clone the repository:
```
git clone https://github.com/finnjclancy/llm-hippodrome.git
cd llm-hippodrome
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the root directory with your API key:
```
OPENROUTER_API_KEY=your_openrouter_key
```

4. Start the development server:
```
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **User Input**: Enter a prompt and select which AI models you want to participate.
2. **Initial Responses**: Each selected model provides its initial answer to the prompt, displayed in real-time as they arrive.
3. **Debate Process**: Models review each other's responses, identifying agreements and disagreements.
4. **Iteration**: The system repeats the debate process for multiple rounds, with each model refining its position based on others' arguments.
5. **Consensus Building**: Models vote on proposed consensus answers, with several mechanisms to ensure agreement:
   - Direct agreement when all models say "YES"
   - Majority rule when more than half of models agree
   - Automatic consensus generation in the final round if no agreement is reached
6. **Final Answer**: The consensus answer is displayed prominently at the end of the debate.

## Available Models

The application includes models from many providers:

- **Google**: Gemini 2.5 Pro, Gemini Flash, Gemma models (1B to 27B)
- **Meta**: Llama 3, Llama 3.1, Llama 3.2, Llama 3.3 (various sizes)
- **Mistral**: Mistral Nemo, Mistral Small, Mistral 7B
- **DeepSeek**: DeepSeek R1, DeepSeek Chat, and various distilled models
- **Qwen**: Qwen 2, Qwen 2.5, and QWQ models in various sizes
- **NVIDIA**: Llama 3.1 Nemotron 70B
- **Microsoft**: Phi-3 models
- And many more from providers like ByteDance, CognitiveComputations, Open-R1, Featherless, and others

## Notes on Model Availability

Not all models listed may be available in OpenRouter's free tier at all times. Some models may have:
- Limited usage quotas
- Temporary unavailability
- Restrictions on query frequency

If you encounter issues with specific models, try selecting different ones or smaller models with fewer parameters (like 7B or 8B models).

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenRouter API 