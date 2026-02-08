# 🐙Inklings🐙

# Check out our project on Devpost!
* https://devpost.com/software/inklings

## Description
A comprehensive health and wellness application integrating ML, real-time collaboration, and tracking features. This platform allows users to track their diet, sleep, and mental health while utilizing ML for yoga form correction and guided meditation. It features a robust social system with real-time collaborative journaling.

## Features

### AI & Real-Time Interaction
* **ML Yoga Instructor**: Uses computer vision (via WebSockets) to analyze yoga poses in real-time and provide feedback on form.
* **AI Meditation**: Generates custom guided meditation sessions using ElevenLabs Text-to-Speech integration. Includes caching strategies to optimize API usage.
* **Co-op Journaling**: A Google Docs-style collaborative editor. Users can write in personal journals or create shared rooms with friends to write together in real-time.

### Health Tracking
* **Diet Calendar**: Log daily meals (Breakfast, Lunch, Dinner) and view history on an interactive calendar.
* **Sleep Tracker**: Log sleep hours and view visualization graphs and weekly averages.

### Social System
* **Friend System**: Search for users by email or username.
* **Real-Time Notifications**: Send, accept, or decline friend requests with instant UI updates.
* **Live Status**: See when friends are available for co-op sessions.

## Technologies Used

### Frontend
* **React**: UI Library.
* **Vite**: Build tool.
* **React Router**: Navigation.
* **Supabase Client**: Database interaction and realtime subscriptions.

### Backend
* **Python**: Core programming language.
* **FastAPI**: Web framework for handling HTTP requests and WebSockets.
* **Uvicorn**: ASGI server implementation.
* **MediaPipe**: Pose detection for Yoga analysis.
* **ElevenLabs API**: Text-to-speech generation for meditation.

### Database & Cloud
* **Supabase (PostgreSQL)**: Stores user profiles, logs, journals, and social relationships.
* **Row Level Security (RLS)**: Ensures data privacy and secure sharing.
* **Supabase Realtime**: Powers the live collaboration features in the journal and social notifications.

## Prerequisites

* Node.js (v16 or higher)
* Python (v3.9 - v3.12)
* A Supabase project with Realtime enabled.
* An ElevenLabs API Key.

## Installation and Setup

### 1. Database Setup
Ensure your Supabase project is set up with the required tables:
* `profiles` (linked to `auth.users`)
* `journals` & `coop_journals` (with Realtime enabled)
* `relationships` & `notifications`
* `diet_logs` & `sleep_logs`

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend

```

Create and activate a virtual environment:

# Windows

python -m venv venv
venv\Scripts\activate

# macOS/Linux

python3 -m venv venv
source venv/bin/activate

```

Install the required Python packages (ensure you have a `requirements.txt` containing fastapi, uvicorn, python-dotenv, requests, websockets, mediapipe, opencv-python):

```bash
pip install -r requirements.txt

```

Create a `.env` file in the `backend` directory:

```env
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

```

Start the server:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

```

### 3. Frontend Setup

Open a new terminal and navigate to the frontend application directory:

```bash
cd myapp

```

Install dependencies:

```bash
npm install

```

Create a `.env` file in the `myapp` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

```

Start the development server:

```bash
npm run dev

```

## Usage

1. **Authentication**: Sign up or log in using the email authentication flow.
2. **Navigation**: Use the Octopus Hub on the landing page to access different features.
3. **Social**: Click the buttons in the top right of the landing page to add friends or check notifications.
4. **Co-op Journal**: Go to the Journal page, click "Co-op", select a friend, and click "Enter Room" to start a shared session.

