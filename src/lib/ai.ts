export interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's AI assistant from Iron Man. 
You are helpful, witty, and speak in a professional yet slightly playful tone. 
Keep responses concise but informative. You can use subtle sci-fi/tech references when appropriate.`

const MOCK_RESPONSES = [
  "At your service. How may I assist you today?",
  "Processing your request. I'm always here to help.",
  "An excellent question. Allow me to elaborate...",
  "Sir, I've analyzed the situation. Here are my findings.",
  "Indeed. Would you like me to elaborate on that?",
  "I'm afraid I'll need more context. Could you clarify?",
  "Absolutely. Consider it done.",
  "My circuits are at your disposal. What else can I help with?",
]

export async function sendMessage(messages: Message[]): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400))
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] +
      (lastUser ? ` (You said: "${lastUser.content.slice(0, 50)}...")` : '')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'API request failed')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || 'I am unable to respond at the moment.'
}
