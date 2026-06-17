/** Pure constants — safe to import from client components. */

export const RECOMMENDED_MODELS = [
  { slug: '~anthropic/claude-opus-latest', label: 'Claude Opus (latest)', vendor: 'Anthropic' },
  { slug: '~anthropic/claude-sonnet-latest', label: 'Claude Sonnet (latest)', vendor: 'Anthropic' },
  { slug: '~openai/gpt-latest', label: 'GPT (latest)', vendor: 'OpenAI' },
  { slug: '~openai/gpt-4o', label: 'GPT-4o', vendor: 'OpenAI' },
  { slug: '~google/gemini-pro-latest', label: 'Gemini Pro (latest)', vendor: 'Google' },
  { slug: '~google/gemini-2.0-flash', label: 'Gemini 2.0 Flash', vendor: 'Google' },
  { slug: '~meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', vendor: 'Meta' },
  { slug: '~mistral/mistral-large', label: 'Mistral Large', vendor: 'Mistral' },
  { slug: '~deepseek/deepseek-chat', label: 'DeepSeek Chat', vendor: 'DeepSeek' },
  { slug: '~x-ai/grok-2', label: 'Grok 2', vendor: 'xAI' },
] as const;

export const FUSION_PRESETS = [
  { slug: 'general-high', label: 'General — High Quality', description: 'Strongest all-round panel (Claude Opus, GPT, Gemini Pro).' },
  { slug: 'general-budget', label: 'General — Budget', description: 'Fast, low-cost panel for everyday use.' },
] as const;
