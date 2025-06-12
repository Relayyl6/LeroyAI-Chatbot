import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
import pyttsx3
import speech_recognition as sr
import google.generativeai as genai

load_dotenv() # Load environment variables from .env

app = Flask(__name__)
CORS(app) # Enable CORS for local development (React app on different port)

# Initialize LLM (do this once)
# Ensure GOOGLE_API_KEY is loaded from environment
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env")

current_emotion = "neutral"
speech_queue = queue.Queue()
tts_queue = queue.Queue()
camera_active = False


llm = LLM(
    model="gemini/gemini-1.5-flash", # or your preferred model
    temperature=0.7,
    api_key=api_key
)

class ChatbotState:
    def __init__(self):
        self.current_emotion = "neutral"
        self.last_speech = ""
        self.conversation_history = []
        self.is_listening = False
        self.camera_active = False

# Global variables for shared state
current_emotion = "neutral"
speech_queue = queue.Queue()
tts_queue = queue.Queue()
camera_active = False

class ChatbotState:
    def __init__(self):
        self.current_emotion = "neutral"
        self.last_speech = ""
        self.conversation_history = []
        self.is_listening = False
        self.camera_active = False

# Global state instance
chatbot_state = ChatbotState()   # global state object #OOP integration

def recognize_speech_from_mic():
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    
    try:
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            print("Listening for speech...")
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
        
        transcription = recognizer.recognize_google(audio)
        return {
            "success": True,
            "transcription": transcription,
            "error": None
        }
    except sr.RequestError as e:
        return {
            "success": False,
            "transcription": None,
            "error": f"API unavailable: {e}"
        }
    except sr.UnknownValueError:
        return {
            "success": False,
            "transcription": None,
            "error": "Unable to recognize speech"
        }
    except sr.WaitTimeoutError:
        return {
            "success": False,
            "transcription": None,
            "error": "No speech detected"
        }

# Initialize text-to-speech engine
def speak_text(text):
    try:
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
        return True
    except Exception as e:
        print(f"TTS Error: {e}")
        return False

def chat_with_gemini(input_text, emotion_context=None):
    try:
        model = genai.GenerativeModel('gemini-pro')
        
        # Add emotion context to the prompt if available
        if emotion_context and emotion_context != "neutral":
            enhanced_prompt = f"The user seems to be feeling {emotion_context}. Please respond appropriately to: {input_text}"
        else:
            enhanced_prompt = input_text
            
        chat = model.start_chat(history=[])
        response = chat.send_message(enhanced_prompt)
        return {
            "success": True,
            "response": response.text,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "response": None,
            "error": str(e)
        }


@app.route('/api/generate', methods=['POST'])
def generate_response():
    try:
        data = request.get_json()
        if not data or 'goal' not in data or 'description' not in data:
            return jsonify({"error": "Missing 'goal' or 'description' in request"}), 400

        user_goal = data['goal']
        user_description = data['description']

        # Dynamically create agent and task based on input
        # You might want to make the agent's role more dynamic too, or have a fixed one
        custom_agent = Agent(
            role="Creative Content Generator", # Or make this configurable
            goal=user_goal,
            backstory="You are an expert in generating creative content based on user specifications, with a focus on clear and actionable outputs.",
            verbose=True,
            llm=llm
        )

        custom_task = Task(
            description=user_description,
            expected_output="A detailed and creative response fulfilling the user's request.", # Or customize this
            agent=custom_agent
        )

        crew = Crew(agents=[custom_agent], tasks=[custom_task], verbose=True)
        result = crew.kickoff()
        # print("Raw result from crew.kickoff():", result)

        result_str = str(result)

        # print("Response being sent to frontend:", result)
        return jsonify({"result": result_str})
        

    except Exception as e:
        app.logger.error(f"Error during crew kickoff: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001) # Run on a different port than React dev server