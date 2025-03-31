export interface Model {
  id: string
  name: string
  provider: string
  company: string
  selected: boolean
}

export interface CompanyGroup {
  company: string
  models: Model[]
}

export const COMPANIES = [
  'Google',
  'Meta',
  'Mistral',
  'DeepSeek',
  'Qwen',
  'ByteDance',
  'NVIDIA',
  'Microsoft',
  'AllenAI',
  'HuggingFace',
  'OpenChat',
  'Sophosympatheia',
  'CognitiveComputations',
  'Gryphe',
  'Open-R1',
  'NousResearch',
  'RekaAI',
  'Featherless',
  'MoonshotAI',
  'Undi95'
] as const

export const MODEL_GROUPS: CompanyGroup[] = [
  {
    company: 'Google',
    models: [
      { id: 'google/gemini-flash-1.5-8b-exp', name: 'Gemini Flash 1.5 8B', provider: 'openrouter', company: 'Google', selected: true },
      { id: 'google/gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemini-2.0-flash-thinking-exp-1219', name: 'Gemini 2.0 Flash Thinking 1219', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemma-3-12b-it', name: 'Gemma 3 12B', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemma-3-4b-it', name: 'Gemma 3 4B', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/learnlm-1.5-pro-experimental', name: 'LearnLM 1.5 Pro', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemma-3-1b-it', name: 'Gemma 3 1B', provider: 'openrouter', company: 'Google', selected: false },
      { id: 'google/gemini-2.0-flash-thinking-exp', name: 'Gemini 2.0 Flash Thinking', provider: 'openrouter', company: 'Google', selected: false },
    ]
  },
  {
    company: 'Meta',
    models: [
      { id: 'meta-llama/llama-3.2-1b-instruct', name: 'Llama 3.2 1B', provider: 'openrouter', company: 'Meta', selected: true },
      { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', provider: 'openrouter', company: 'Meta', selected: true },
      { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B', provider: 'openrouter', company: 'Meta', selected: false },
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'openrouter', company: 'Meta', selected: false },
      { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', provider: 'openrouter', company: 'Meta', selected: false },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', company: 'Meta', selected: false },
    ]
  },
  {
    company: 'Mistral',
    models: [
      { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', provider: 'openrouter', company: 'Mistral', selected: true },
      { id: 'mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small 3.1 24B', provider: 'openrouter', company: 'Mistral', selected: false },
      { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B', provider: 'openrouter', company: 'Mistral', selected: false },
      { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo', provider: 'openrouter', company: 'Mistral', selected: false },
    ]
  },
  {
    company: 'DeepSeek',
    models: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat v3', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-r1-zero', name: 'DeepSeek R1 Zero', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-v3-base', name: 'DeepSeek V3 Base', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', provider: 'openrouter', company: 'DeepSeek', selected: false },
      { id: 'deepseek/deepseek-r1-distill-qwen-14b', name: 'DeepSeek R1 Distill Qwen 14B', provider: 'openrouter', company: 'DeepSeek', selected: false },
    ]
  },
  {
    company: 'Qwen',
    models: [
      { id: 'qwen/qwen-2-7b-instruct', name: 'Qwen 2 7B', provider: 'openrouter', company: 'Qwen', selected: true },
      { id: 'qwen/qwen2.5-vl-3b-instruct', name: 'Qwen 2.5 VL 3B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwen-2.5-vl-7b-instruct', name: 'Qwen 2.5 VL 7B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwq-32b', name: 'QWQ 32B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwen2.5-vl-72b-instruct', name: 'Qwen 2.5 VL 72B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwen2.5-vl-32b-instruct', name: 'Qwen 2.5 VL 32B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'openrouter', company: 'Qwen', selected: false },
      { id: 'qwen/qwq-32b-preview', name: 'QWQ 32B Preview', provider: 'openrouter', company: 'Qwen', selected: false },
    ]
  },
  {
    company: 'NVIDIA',
    models: [
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Llama 3.1 Nemotron 70B', provider: 'openrouter', company: 'NVIDIA', selected: false },
    ]
  },
  {
    company: 'Microsoft',
    models: [
      { id: 'microsoft/phi-3-mini-128k-instruct', name: 'Phi-3 Mini 128K', provider: 'openrouter', company: 'Microsoft', selected: true },
      { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi-3 Medium 128K', provider: 'openrouter', company: 'Microsoft', selected: false },
    ]
  },
  {
    company: 'Sophosympatheia',
    models: [
      { id: 'sophosympatheia/rogue-rose-103b-v0.2', name: 'Rogue Rose 103B', provider: 'openrouter', company: 'Sophosympatheia', selected: false },
    ]
  },
  {
    company: 'CognitiveComputations',
    models: [
      { id: 'cognitivecomputations/dolphin3.0-mistral-24b', name: 'Dolphin 3.0 Mistral 24B', provider: 'openrouter', company: 'CognitiveComputations', selected: false },
      { id: 'cognitivecomputations/dolphin3.0-r1-mistral-24b', name: 'Dolphin 3.0 R1 Mistral 24B', provider: 'openrouter', company: 'CognitiveComputations', selected: false },
    ]
  },
  {
    company: 'Gryphe',
    models: [
      { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B', provider: 'openrouter', company: 'Gryphe', selected: false },
    ]
  },
  {
    company: 'Open-R1',
    models: [
      { id: 'open-r1/olympiccoder-7b', name: 'OlympicCoder 7B', provider: 'openrouter', company: 'Open-R1', selected: true },
      { id: 'open-r1/olympiccoder-32b', name: 'OlympicCoder 32B', provider: 'openrouter', company: 'Open-R1', selected: false },
    ]
  },
  {
    company: 'NousResearch',
    models: [
      { id: 'nousresearch/deephermes-3-llama-3-8b-preview', name: 'DeepHermes 3 Llama 3 8B', provider: 'openrouter', company: 'NousResearch', selected: false },
    ]
  },
  {
    company: 'RekaAI',
    models: [
      { id: 'rekaai/reka-flash-3', name: 'Reka Flash 3', provider: 'openrouter', company: 'RekaAI', selected: false },
    ]
  },
  {
    company: 'Featherless',
    models: [
      { id: 'featherless/qwerky-72b', name: 'Qwerky 72B', provider: 'openrouter', company: 'Featherless', selected: false },
    ]
  },
  {
    company: 'MoonshotAI',
    models: [
      { id: 'moonshotai/moonlight-16b-a3b-instruct', name: 'Moonlight 16B A3B', provider: 'openrouter', company: 'MoonshotAI', selected: false },
    ]
  },
  {
    company: 'ByteDance',
    models: [
      { id: 'bytedance-research/ui-tars-72b', name: 'UI-TARS 72B', provider: 'openrouter', company: 'ByteDance', selected: false },
    ]
  },
  {
    company: 'OpenChat',
    models: [
      { id: 'openchat/openchat-7b', name: 'OpenChat 7B', provider: 'openrouter', company: 'OpenChat', selected: true },
    ]
  },
  {
    company: 'Undi95',
    models: [
      { id: 'undi95/toppy-m-7b', name: 'Toppy M 7B', provider: 'openrouter', company: 'Undi95', selected: false },
    ]
  },
  {
    company: 'HuggingFace',
    models: [
      { id: 'huggingfaceh4/zephyr-7b-beta', name: 'Zephyr 7B Beta', provider: 'openrouter', company: 'HuggingFace', selected: true },
    ]
  },
  {
    company: 'AllenAI',
    models: [
      { id: 'allenai/molmo-7b-d', name: 'MOLMO 7B-D', provider: 'openrouter', company: 'AllenAI', selected: false },
    ]
  }
] 