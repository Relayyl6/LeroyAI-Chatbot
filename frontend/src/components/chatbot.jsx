import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const Chatbot = () => {
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]); // Store chat history
  const [isCollapsed, setIsCollapsed] = useState(false);

  // advanced featuring
  const [inputText, setInputText] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isListening, setIsListening] = useState(false);
  const [isEmotionMonitoring, setIsEmotionMonitoring] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false)

  // Predefined prompt suggestions
  const suggestedPrompts = [
    {
      goal: "Create a marketing plan",
      description: "Develop a strategy for launching a new tech product",
    },
    {
      goal: "Write a blog post",
      description: "Draft a 500-word article on AI advancements",
    },
    {
      goal: "Generate code",
      description: "Create a Python script for data analysis",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!goal.trim() || !description.trim()) {
      setError('Goal and Description fields are empty');
      setIsLoading(false);
      return;
    }

    // Add user message to chat
    setMessages([...messages, { role: 'user', goal, description }]);

    try {
      const response = await axios.post('http://127.0.0.1:5001/api/generate', {
        goal,
        description,
      });


      // How chat history becomes
      // [
      //   {
      //     role: 'user',
      //     goal: "Create a marketing plan",
      //     description: "Strategy for product launch"
      //   },
      //   {
      //     role: 'bot',
      //     content: "Here’s your marketing plan: ... (Markdown/API response)"
      //   }
      // ]


      if (response?.data?.result) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: response.data.result
          },
        ]);
      } else {
        setError('Received a response, but the expected "result" field was not found.');
      }
    } catch (err) {
      console.error("Error fetching response:", err);
      let errorMessage = 'An unexpected error occurred while fetching the response.';
      if (err.response) {
        errorMessage = err.response.data?.error ||
          (typeof err.response.data === 'string' && err.response.data.trim() !== ''
            ? err.response.data
            : `Server Error: ${err.response.status} ${err.response.statusText || 'Unknown'}`);
      } else if (err.request) {
        errorMessage = 'No response received from the server. Please check your network connection and ensure the server is running.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setGoal('');
      setDescription('');
    }
  };

  // Handle clicking a suggested prompt
  const handlePromptClick = (prompt) => {
    setGoal(prompt.goal);
    setDescription(prompt.description);
  };

  return (
    <div className="relative flex w-screen items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-[70%] items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-[95vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            LeroyAI Chatbot
          </h1>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {
            messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 h-10 dark:text-gray-400">
              Start by entering a goal and description or try a suggested prompt below!
              <br/>
              Collapse to view full content
            </div>
          )
          }
          {
            messages?.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg 
                    ${msg.role === 'user'
                    ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                }`}>
                {
                    msg.role === 'user' ? (
                    <>
                        <strong>Goal:</strong> {msg.goal}
                        <br />
                        <strong>Description:</strong> {msg.description}
                    </>
                    ) : (
                    <pre className="whitespace-pre-wrap">
                        {
                          typeof msg.content === 'object'
                          ? JSON.stringify(msg.content, null, 2)
                          : <ReactMarkdown>{msg.content}</ReactMarkdown>
                        } 
                    </pre>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          {error && (
            <div className="text-red-500 dark:text-red-400 text-center">{error}</div>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-4 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>

        {
          !isCollapsed && (
            <>
              {/* Suggested Prompts */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-800 shadow-xl rounded-xl">
                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handlePromptClick(prompt)}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-full text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      {prompt.goal}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="space-y-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Enter your goal (e.g., Render 3D assets)"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter task description (e.g., Lifelike futuristic cityscape)"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-blue-400 transition"
                  >
                    {isLoading ? 'Generating...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          )
        }


        
      </div>
    </div>
  );
};

export default Chatbot;