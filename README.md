# Questree - Interactive Learning Map

An interactive learning tool that visualizes conversations with AI in a tree structure. Uses Google Gemini API to answer questions and visualizes conversation flow in a horizontal tree structure.

## Key Features

- 🤖 **AI Chat**: Natural language conversation through Google Gemini API
- 🌳 **Tree Visualization**: Displays conversation flow in horizontal tree structure
- 📝 **Text Selection Questions**: Select text from answers to ask additional questions
- 🎯 **Tab-based Navigation**: Manage each question and answer in separate tabs
- 📱 **Responsive Design**: Works on both mobile and desktop

## Tech Stack

- **Frontend**: SvelteKit + TypeScript
- **Backend**: Node.js + Express
- **AI API**: Google Gemini API
- **Styling**: CSS (Pure CSS without Tailwind CSS)

## Installation and Setup

### 1. Install Dependencies

```bash
# In root directory
npm install

# In client directory
cd client
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and add the following:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

You can get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

**Development Mode vs Production Mode:**
- **Development Mode** (`NODE_ENV !== 'production'`): Returns sample responses without calling Gemini API. Saves credits.
- **Production Mode** (`NODE_ENV=production`): Calls actual Gemini API to provide AI responses.

### 3. Run Development Server

```bash
# In root directory (runs both backend and frontend)
npm run dev

# Or run individually
npm run server  # Backend only
npm run client  # Frontend only
```

### 4. Check in Browser

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## How to Use

1. **Ask Questions**: Enter your question in the input field at the bottom and send it.
2. **View Answers**: AI's answer will be displayed on the main screen.
3. **Additional Questions**: Select any part of the answer you're curious about and an "Additional Question" button will appear.
4. **Tree Navigation**: Check the conversation flow in the tree view on the top right and navigate to other questions.

## Project Structure

```
questree/
├── server/                 # Express.js backend
│   └── index.js           # Main server file
├── client/                # SvelteKit frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # UI components
│   │   │   │   ├── ChatInput.svelte
│   │   │   │   ├── TabView.svelte
│   │   │   │   └── TreeView.svelte
│   │   │   └── stores.ts  # State management
│   │   └── routes/
│   │       └── +page.svelte # Main page
│   └── package.json
├── package.json           # Root package configuration
└── README.md
```

## API Endpoints

### POST /api/ask
Send a question to AI and receive an answer.

**Request:**
```json
{
  "prompt": "Your question here"
}
```

**Response:**
```json
{
  "answer": "AI's answer",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mode": "development" // or "production"
}
```

### GET /api/health
Check server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "Questree server is running normally."
}
```

## Render Deployment

### 1. Create Render Account and Connect
1. Create an account at [Render.com](https://render.com).
2. Connect your GitHub repository to Render.

### 2. Set Environment Variables
Set the following environment variables in the Render dashboard:
- `GEMINI_API_KEY`: Google Gemini API key
- `NODE_ENV`: `production`
- `PORT`: Set automatically by Render

### 3. Deployment Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

### 4. Deployment Complete
Once deployment is complete, you can access the application through the URL provided by Render.

## Development Information

- **Development Mode**: Run both backend and frontend with `npm run dev` (no Gemini API calls)
- **Production Build**: Build client with `npm run build`
- **Production Run**: Run server with `NODE_ENV=production npm start` (actual Gemini API calls)

## License

MIT License

## Contributing

1. Fork this repository.
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request.

## Troubleshooting

### API Key Error
- Check if the correct Gemini API key is set in the `.env` file.
- Verify that the API key is valid and active.

### CORS Error
- Make sure the backend server is running.
- Check if the frontend and backend ports are correct.

### Build Error
- Ensure Node.js version is 18 or higher.
- Try running `npm install` again.
