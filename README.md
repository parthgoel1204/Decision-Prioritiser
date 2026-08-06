# 🎯 Decision Prioritiser

A modern, highly polished, full-stack decision-making and task prioritization application. It helps you prioritize tasks using a multi-dimensional recommendation engine based on customizable weight dimensions (Impact, Urgency, Learning, Risk, and Energy) rather than a simple, static checklist.

🚀 **Live Frontend Demo**: [https://decision-prioritiser-frontend.vercel.app/](https://decision-prioritiser-frontend.vercel.app/)

---

## ✨ Features

- **🧠 Recommendation Engine**: Dynamically calculates scores for active tasks based on your personalized weights and shows you *exactly* what task you should focus on next.
- **🤖 AI Score Suggestions (Groq)**: When adding a task, hit *"Suggest with AI"* to have an LLM (Llama 3 via Groq) automatically score all five dimensions and explain its reasoning — you can accept the suggestions or tweak them manually.
- **🎨 Premium UI/UX (Shadcn UI)**: Beautiful responsive design built with Radix primitives, consistent Lucide icons, smooth tab transitions, and global toast notifications.
- **⏱️ Focus Timer**: A built-in 25-minute Pomodoro timer connected to your recommended tasks to help you jump straight into deep work.
- **🎛️ Settings & Weight Customisation**: Tailor the recommendation algorithm by dragging sliders to adjust how much each dimension influences the final priority score.
- **📊 Weekly Review Modal**: A centered dialog showcasing weekly analytics, task completion rates compared to the previous week, average dimension scores, and smart productivity insights.
- **🏷️ Tag Management**: Categorize, filter, rename, or delete tags globally.
- **🌗 Dark Mode Switch**: Instant theme toggle with seamless local storage persistence.
- **💾 JSON & CSV Data Export**: Full ownership of your data—export your tasks, weights, and history at any time.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** & **Vite**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn UI** (Radix Primitives)
- **Lucide React Icons**
- **Axios** (API requests)
- **Sonner** (Toast notifications)

### Backend
- **Express.js** (Node.js framework)
- **TypeScript**
- **JWT (JsonWebToken)** for secure user authentication
- **Zod** (Request payload validation)
- **Groq SDK** — calls the Llama 3 model to auto-suggest dimension scores for new tasks

### Database
- **Turso (LibSQL)**: Edge SQLite database client for Vercel Serverless compatibility.
- **Local Fallback**: Automatically falls back to a local SQLite file (`local.db`) in development mode if Turso credentials aren't set.

---

## 🚀 Local Development Setup

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed.

### 2. Installation
Clone the repository, go to the root folder, and install all workspace dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` directory (you can copy `server/.env.example` as a template):
```env
PORT=4000
JWT_SECRET=your_secret_jwt_key
CLIENT_URL=http://localhost:5173

# Optional: Set these to connect to Turso cloud DB.
# If left blank, it will automatically create a local 'local.db' SQLite file.
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your_turso_token

# Required for AI Score Suggestions feature.
# Get a free key at https://console.groq.com
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant (for more info on the models you may refer to docs)
```

### 4. Running the App
Start both the Express backend and the Vite frontend concurrently:
```bash
npm run dev
```
- Frontend will run on: `http://localhost:5173`
- Backend will run on: `http://localhost:4000`

---

## 📦 Deployment Configs

This monorepo is fully optimized to run on Vercel:
- **Backend (`/server`)**: Packaged as a Serverless function (`@vercel/node`) configured in `server/vercel.json`.
- **Frontend (`/client`)**: Deployed as a standard SPA using Vite presets. Set `VITE_API_URL` in the Vercel frontend project's environment variables to point to your deployed backend URL.
