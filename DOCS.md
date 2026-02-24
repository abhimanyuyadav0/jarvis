# J.A.R.V.I.S. – Documentation

**Just A Rather Very Intelligent System**

A voice-enabled, chat-based AI assistant with a futuristic UI inspired by Tony Stark’s J.A.R.V.I.S.

---

## What's Possible

Yes, building a Jarvis-like assistant with a cool UI is possible. This project includes:

| Feature | Description | Status |
|--------|-------------|--------|
| **Futuristic UI** | Dark theme, cyan glow, animated orb, grid background | Done |
| **Text chat** | Type messages and receive AI responses | Done |
| **Voice input** | Speak to Jarvis using browser speech-to-text | Done |
| **AI responses** | OpenAI GPT integration (or mock mode) | Done |
| **Responsive layout** | Works on desktop and mobile | Done |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm

### Run Locally

```bash
cd jarvis
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Configuration

### OpenAI API (Optional)

For real AI responses:

1. Copy `.env.example` to `.env`
2. Add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart the dev server

Without an API key, the app uses mock responses so you can try the UI and voice features.

---

## Project Structure

```
jarvis/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── DOCS.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── App.css
    ├── index.css
    ├── vite-env.d.ts
    ├── components/
    │   ├── JarvisOrb.tsx      # Central animated orb
    │   ├── JarvisOrb.css
    │   ├── VoiceButton.tsx    # Voice input trigger
    │   ├── VoiceButton.css
    │   ├── ChatPanel.tsx      # Conversation UI
    │   └── ChatPanel.css
    └── lib/
        └── ai.ts              # OpenAI / mock AI logic
```

---

## Features

### 1. Jarvis Orb

- Central glowing orb with pulse
- Rings that respond to state
- Different states: idle, listening, thinking

### 2. Voice Input

- Uses **Web Speech API** (Speech-to-Text)
- Best support in Chrome and Edge
- Click "Voice" to start, again to stop
- Transcript is sent to the chat when you finish speaking

### 3. Chat Panel

- Type messages in the input field
- Conversation history in the panel
- User and assistant messages clearly separated

### 4. AI Integration

- **With API key**: Uses OpenAI GPT-3.5-turbo
- **Without API key**: Uses built-in mock responses

---

## Customization

### Changing the Theme

Edit `src/index.css`:

```css
:root {
  --jarvis-cyan: #00d4ff;        /* Main accent */
  --jarvis-bg: #0a0e17;          /* Background */
  --jarvis-glow: rgba(0, 212, 255, 0.4);
}
```

### Using a Different AI Provider

Update `src/lib/ai.ts` to call your own API or service. The interface is:

```ts
export async function sendMessage(messages: Message[]): Promise<string>
```

---

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| App (text chat) | Yes | Yes | Yes | Yes |
| Voice input | Yes | Yes | Limited | Limited |

Voice input works best in Chrome and Edge. Other browsers may not support `SpeechRecognition`.

---

## Roadmap

- [ ] Text-to-Speech for Jarvis responses
- [ ] System commands (time, date, weather)
- [ ] Custom commands / shortcuts
- [ ] Dark/light theme toggle
- [ ] Persistent chat history (localStorage)

---

## License

MIT – use and modify as you like.
