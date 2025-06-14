import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
import pyttsx3
import speech_recognition as sr
import google.generativeai as genai
import cv2
from deepface import DeepFace
import time
import queue
# import json
import threading
# import base64
# import numpy as np
# from io import BytesIO

load_dotenv() # Load environment variables from .env

app = Flask(__name__)
CORS(app) # Enable CORS for local development (React app on different port)

# Initialize LLM (do this once)
# Ensure GOOGLE_API_KEY is loaded from environment
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env")

# Global variables for shared state
current_emotion = "neutral"
speech_queue = queue.Queue()
text_to_speech_queue = queue.Queue()
camera_active = False

class ChatbotState:
    def __init__(self):
        self.current_emotion = "neutral"
        self.last_speech = ""
        self.conversation_history = []
        self.is_listening = False
        self.camera_active = False

llm = LLM(
    model="gemini/gemini-1.5-flash", # or your preferred model
    temperature=0.7,
    api_key=api_key
)

# Global state instance
chatbot_state = ChatbotState()   # global state object # OOP integration

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
def speak_text(text, speak_prompt=True):
    if speak_prompt:
        try:
            engine = pyttsx3.init()
            engine.say(text)
            engine.runAndWait()
            return True
        except Exception as e:
            print(f"TTS Error: {e}")
            return False
    if not speak_prompt:
        return True

def speak_and_listen_for_response(prompt_text):
    #speak prompt text
    if not speak_text(prompt_text):
        return jsonify({
            "error" : "Failed to speak the prompt."
        }), 500
    
    print(f"Listening for response...")
    response = recognize_speech_from_mic()

    if response["success"]:
        user_response = response["transcription"].lower()

        #check if the response is truthy
        if user_response in ["yes", "yeah", "yep"]:
            return True
        elif user_response in ["no", "nope"]:
            return False
        else:
            speak_text("I didn't get that, can you please come again.")
            return None
    else:
        return jsonify({
            "error" : "Error recognizing speech: {response['error']}"
        }), 500



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

# Capture single frame and detect motion
def detect_emotion_from_frame():
    try:
        cap = cv2.VideoCapture(0)
        ret, frame = cap.read()
        cap.release()

        if not ret: # for false face detection or not face detected
            return {
                "Success" : False,
                "emotion" : None,
                "error" : "Camera Not Accessible"
            }
        analysis = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False) # consider adding more than just emotion, let the AI take face_data and craft response base on that

        if isinstance(analysis, list):
            dominant_emotion = analysis[0]['dominant_emotion']
        else:
            dominant_emotion = analysis['dominant_emotion']

        return {
            "Success" : True,
            "emotion" : dominant_emotion,
            "error" : None
        }
    except Exception as e:
        return {
           "Success" : False,
           "emotion" : None,
           "error" : str(e)
        }

def continuous_emotion_detection():
    global chatbot_state # accessing the glovbal chatbot_state variable

    while chatbot_state.camera_active:
        try:
            cap = cv2.VideoCapture(0)
            ret, frame = cap.read()

            if ret:
                analysis = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False) # consider adding more than just emotion, let the AI take face_data and craft response base on that
                if isinstance(analysis, list):
                    chatbot_state.current_emotion = analysis[0]['dominant_emotion']
                else:
                    chatbot_state.current_emotion = analysis['dominant_emotion']
            cap.release()
            time.sleep(2)
        except Exception as e:
            print(f"Emotion detection error: {e}")
            time.sleep(5)


# API routes

@app.route('/api/generate', methods=['POST'])
def generate_response():
    try:
        data = request.get_json()
        if not data or 'goal' not in data or 'description' not in data:
            return jsonify({"error": "Missing 'goal' or 'description' in request"}), 400

        user_goal = data['goal']
        user_description = data['description']

        user_input = ""
        if 'goal' in data and 'description' in data:
            user_input = f"Goal: {user_goal} \n Description: {user_description}"
        elif 'message' in data:
            user_input = data['message']
        elif 'text' in data:
            user_input = data['text']
        else:
            jsonify({
                "error" : "missing required input field"
            }), 400


        emotion_context = chatbot_state.current_emotion

        ai_result = chat_with_gemini(user_input, emotion_context)

        if not ai_result["success"]:
            return jsonify({
                "error" : ai_result["error"]
            }), 500

        response_text = ai_result["response"]

        chatbot_state.conversation_history.extend([
            {
                "type" : "user_message",
                "message" : user_input,
                "emotion" : emotion_context,
                "timestamp" : time.time()
            },
            {
                "type" : "ai_response",
                "content" : ai_result,
                "timestamp" : time.time()
            }
        ])

        auto_speak = data.get("auto_speak", False)
        if auto_speak:
            speak_text(response_text)

        #crew AI persepctive
        # Dynamically create agent and task based on input
        # You might want to make the agent's role more dynamic too, or have a fixed one
        # custom_agent = Agent(
        #     role="Creative Content Generator", # Or make this configurable
        #     goal=user_goal,
        #     backstory="You are an expert in generating creative content based on user specifications, with a focus on clear and actionable outputs.",
        #     verbose=True,
        #     llm=llm
        # )

        # custom_task = Task(
        #     description=user_description,
        #     expected_output="A detailed and creative response fulfilling the user's request.", # Or customize this
        #     agent=custom_agent
        # )

        # crew = Crew(agents=[custom_agent], tasks=[custom_task], verbose=True)
        # result = crew.kickoff()
        # # print("Raw result from crew.kickoff():", result)

        # result_str = str(result)

        # # print("Response being sent to frontend:", result)
        # return jsonify({"result": result_str})

        return jsonify({
            "result" : response_text,
            "emotion_context" : emotion_context,
            "conversation_ID" : len(chatbot_state.conversation_history),
            "auto_spoke" : auto_speak
        })

    except Exception as e:
        app.logger.error(f"Error during crew kickoff: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

#API route for converting speech to text
@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    try:
        result = recognize_speech_from_mic()

        if result["success"]:
            chatbot_state.last_speech = result["transcription"]
            chatbot_state.conversation_history.append({
                "type" : "user_speech",
                "content" : result["transcription"],
                "timestamp" : time.time()
            })

        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success" : False,
            "error" : str(e)
        }), 500

#API route for convertin text to speech
@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json()
        if not data or 'goal' not in data:
            return jsonify({
                "error" : "missing text in request"
            }), 500
        text = data['goal']
        condition = speak_text(text, False)
        description = data['description']
        success = speak_and_listen_for_response("Would you like to include the description in your prompt?")
        if success is True:
            chatbot_state.conversation_history.append({
                "type" : "ai_speech",
                "content" : text,
                "description"  : description,
                "timestamp" : time.time()
            })
        elif success is False:
            chatbot_state.conversation_history.append({
                "type" : "ai_speech",
                "content" : text,
                "timestamp" : time.time()
            })
        return jsonify({
            "success" : condition
        })
    except Exception as e:
        return jsonify({
            "error" : str(e)
        }), 500

@app.route('/api/detect-emotion', methods=['POST'])
def detect_emotion():
    try:
        result = detect_emotion_from_frame()

        if result["success"]:
            chatbot_state.current_emotion = result["emotion"]
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success" : False,
            "error" : str(e)
        }), 500
    
@app.route('/api/start-emotion-monitoring', methods=['POST'])
def start_emotion_monitoring():
    try:
        if not chatbot_state.camera_active:
            chatbot_state.camera_active = True
            emotion_thread = threading.Thread(target=continuous_emotion_detection)
            emotion_thread.daemon
            emotion_thread.start()
        return jsonify({
            "success" : True,
            "message" : "Emotion monitoring started"
        })
    except Exception as e:
        return jsonify({
            "success" : False,
            "error" : str(e)
        }), 500
    
@app.route('/api/stop-emotion-monitoring', methods=['POST'])
def stop_emotion_monitoring():
    try:
        chatbot_state.camera_active = False
        return jsonify({
            "success" : True,
            "message" : "Emotion monitoring stopped"
        })
    except Exception as e:
        return jsonify({
            "success" : False,
            "error" : str(e)
        }), 500

@app.route('/api/voice-chat', methods=['POST'])
def voice_chat():
    try:
        speech_result = recognize_speech_from_mic()

        if not speech_result["success"]:
            return jsonify({
                "success" : False,
                "step" : "speech_recognition",
                "error" : speech_result["error"]
            }), 400
        
        user_speech = speech_result["transcription"]

        ai_result = chat_with_gemini(user_speech, chatbot_state.current_emotion)

        if not ai_result["success"]:
            return jsonify({
                "success" : False,
                "step" : "ai_generation",
                "error" : ai_result["error"]
            }), 500
        
        ai_response = ai_result["response"]

        text_to_speech_success = speak_text(ai_response)

        chatbot_state.conversation_history.extend([
            {
                "type" : "user_speech",
                "content" : user_speech,
                "emotion" : chatbot_state.current_emotion,
                "timestamp" : time.time()
            },
            {
                "type" : "ai_spoken_response",
                "content" : ai_response,
                "timestamp" : time.time()
            }
        ])

        return jsonify({
            "success" : True,
            "user_speech" : user_speech,
            "ai_response" : ai_response,
            "emotion_context" : chatbot_state.current_emotion,
            "text_to_speech_success" : text_to_speech_success
        })
    except Exception as e:
        return jsonify({
            "success" : False,
            "error" : str(e)
        }), 500

@app.route('/api/get-current-emotion', methods=['GET'])
def get_current_emotion():
    return jsonify({
        "success" : True,
        "emotion" : chatbot_state.current_emotion,
        "timestamp" : time.time()
    })

@app.route('/api/conversation-history', methods=['GET'])
def conversation_history():
    return jsonify({
        "success" : True,
        "history" : chatbot_state.conversation_history,
        "current_emotion" : chatbot_state.current_emotion
    })

@app.route('/api/clear-history', methods=['POST'])
def clear_conversation_history():
    chatbot_state.conversation_history = []
    return jsonify({
        "success": True,
        "message": "Conversation history cleared"
    })

#current chatbot status
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "success" : True,
        "status" : {
            "emotion_monitoring_active" : chatbot_state.camera_active,
            "current_emotion" : chatbot_state.current_emotion,
            "conversation_length" : len(chatbot_state.conversation_history),
            "last_speech" : chatbot_state.last_speech
        }
    })



if __name__ == '__main__':
    print("Starting Enhanced Chatbot API Server...")
    print("Available endpoints:")
    print("- POST /api/generate - Generate AI responses")
    print("- POST /api/speech-to-text - Convert speech to text")
    print("- POST /api/text-to-speech - Convert text to speech")
    print("- POST /api/voice-chat - Complete voice conversation")
    print("- POST /api/detect-emotion - Detect current emotion")
    print("- POST /api/start-emotion-monitoring - Start continuous emotion detection")
    print("- POST /api/stop-emotion-monitoring - Stop emotion detection")
    print("- GET /api/get-current-emotion - Get current emotion")
    print("- GET /api/conversation-history - Get chat history")
    print("- GET /api/status - Get system status")

    app.run(debug=True, port=5001) # Run on a different port than React dev server