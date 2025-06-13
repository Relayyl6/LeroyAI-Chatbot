# LeroyAI Integration Project

This project integrates CrewAI with a Flask backend and React frontend to process goals and descriptions through AI agents.

## Project Structure

```bash
project/
├── backend/          # Python Flask server
│   ├── .env          # Environment variables
│   ├── app.py        # Flask application
|   └── requirement.txt
├── frontend/         # React application
└── README.md         # This file
```

## Backend (Python/Flask)

The Flask backend provides an API endpoint that processes goals and descriptions using CrewAI.

### Setup

1. Create a `.env` file in the `./backend` directory with:

```env
GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
FLASK_APP=app.py
FLASK_ENV=development
```

2. Replace `YOUR_GOOGLE_API_KEY` with your actual key from Google AI Studio.

3. Set up and activate a virtual environment:

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

4. Install dependencies:

```bash
pip install crewai google-generativeai python-dotenv flask flask-cors pyttsx3 SpeechRecognition opencv-python deepface 
```

*Note: pip currently supports Python 3.12 or lower.* total dependency download should be 1gb, tensorflow alone from deepface is like 400mb  

### Running the Backend

(you should already be in the backend directory with your environment activated)

```bash
python app.py
```

The API will be available at `http://localhost:5001`.

(the backend server should be set up and running before running the front end)

## Frontend (React)

The React frontend provides a form to submit goals and descriptions to the backend.

### Features:
- Form for "Goal" and "Description" inputs
- API call to Flask backend on submit
- Loading state during processing
- Result display from backend

### Setup

1. Navigate to the frontend directory
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The app will be available at `http://localhost:3000`.

## API Endpoint

`POST /process`
- Accepts JSON payload:
  ```json
  {
    "goal": "Your goal",
    "description": "Your description"
  }
  ```
- Returns JSON response with the processed result

## Development Notes

1. Ensure CORS is properly configured if frontend and backend run on different ports
2. The backend uses python-dotenv for secure management of the GOOGLE_API_KEY
3. Error handling should be implemented for both frontend and backend
