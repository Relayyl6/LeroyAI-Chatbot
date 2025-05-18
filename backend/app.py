import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM

load_dotenv() # Load environment variables from .env

app = Flask(__name__)
CORS(app) # Enable CORS for local development (React app on different port)

# Initialize LLM (do this once)
# Ensure GOOGLE_API_KEY is loaded from environment
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env")

llm = LLM(
    model="gemini/gemini-1.5-flash", # or your preferred model
    temperature=0.7,
    api_key=api_key
)

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