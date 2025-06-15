import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import apiHandling from './apiHandling';
import Emoji from './emoji';
import Checkbox from '@mui/material/Checkbox';

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
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [checked, setChecked] = useState(true);

  // sample calling
  // Using Method 3 (enhanced with custom options)
  // const result = await enhancedApiCall('/generate', 'POST', { message: 'Hello' }, { timeout: 5000 });

  // generate format
  // fetch('/api/generate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     message: "How can I improve my presentation skills?",
  //     auto_speak: true  // Optional: speak the response
  //   })
  // })

  const handleChange = (event) => {
    setChecked(event.target.checked);
    setAutoSpeak(true)
  };

  const messageEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({
      behavior : "smooth"
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages])

  useEffect(() => {
    startEmotionMonitoring();

    getCurrentEmotion();

    return () => {
      stopEmotionMonitoring()
    };

  }, [])

  const startEmotionMonitoring = async () => {
    try {
      await apiHandling('/start-emotion-monitoring', 'POST');
      setIsEmotionMonitoring(true);

      // stack emotion update for every 3 seconds
      const interval = setInterval(getCurrentEmotion, 3000);
      return () => clearInterval(interval);
    } catch (error) {
      console.error("Error starting Emotion Monitoring", error);
    }
  }

  const getCurrentEmotion = async () => {
    try {
      const response = await apiHandling('/get-current-emotion')
      if (response.success) {
        setCurrentEmotion(response.emotion)
      }
    } catch (error) {
      console.error("Error getting emotion", error);
    }
  }

  const stopEmotionMonitoring = async () => {
    try {
      await apiHandling('/stop-emotion-monitoring', 'POST');
      setIsEmotionMonitoring(false);
    } catch (error) {
      console.error("Error stopping Emotion Monitoring", error);
    }
  }

  // send message to AI
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return; // fun stuff, for inputText, after checking fi teh stuff is empty, empty is falsy, so then the ! makes it truthy, or isLoading is truthy, then the function returns early

    const userMessage = {
      role : 'user',
      content : inputText,
      emotion : currentEmotion,
      timestamp : new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    //resulting logic
    // messages = [
    //   { type: 'user', content: 'Hello!', emotion: 'neutral', timestamp: '10:00 AM' },
    //   { type: 'user', content: 'How are you?', emotion: 'neutral', timestamp: '10:01 AM' },
    // ];

    try {
      const response = await apiHandling('/generate', 'POST', {
        message : inputText
      });

      // const requestReadOtLoud = await apiHandling('/aiReponse', 'POST', {
      //   aiReponse : response.result
      // })

      const aiMessage = {
        role : 'bot',
        content : response.result,
        emotionContext : response.emotion_context,
        timestamp : new Date().toLocaleDateString()
      };

      setMessages(prev => [...prev, aiMessage]);
      setInputText('')
      //resulting logic
      // messages = [
      //   { type: 'user', content: 'Hello!', emotion: 'neutral', timestamp: '10:00 AM' },
      //   { type: 'user', content: 'How are you?', emotion: 'neutral', timestamp: '10:01 AM' },
      //   { type: 'bot', content: 'I am fine, what about you?', emotionContext: 'happy', timestamp: '10:01 AM'}
      // ];
    } catch (error) {
      const errorMessage = {
        role : 'error',
        content : `Error: ${error.message}`,
        timestamp : new Date().toLocaleDateString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  // voice chat functionality
  const startVoiceChat = async () => {
    if (isListening) return;

    setIsListening(true);

    try {
      const response = await apiHandling('/voice-chat', 'POST');

      if (response.success) {
        const userMessage = {
          role : 'user_speech',
          content : response.user_speech,
          emotion : response.emotion_context,
          timestamp : new Date().toLocaleDateString()
        }

        const aiMessage = {
          role : 'ai_response',
          content : response.ai_response,
          emotion : response.emotion_context,
          timestamp : new Date().toLocaleDateString()
        }

        setMessages(prev => [...prev, userMessage, aiMessage])
      }
    } catch (error) {
      const errorMessage = {
        role : "error",
        content : `Voice chat error ${error.message}`,
        timestamp : new Date().toLocaleDateString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsListening(false)
    }
  }

  // speech to text
  const speechToText = async () => {
    if (isListening) return;

    setIsListening(true);

    try {
      const response = await apiHandling('/speech-to-text', 'POST')

      if (response.success) {
        setInputText(response.transcription);
      } else {
        alert(`Speech recognition error: ${response.error}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsListening(false)
    }
  }
  // text to speech
  const textToSpeech = async (text) => {
    try {
      await apiHandling('/text-to-speech', 'POST', {text});
    } catch (error) {
      console.error('TextToSpeech Error:', error);
    }
  }

  const detectEmotionOnce = async () => {
    try {
      const response = await apiHandling('/detect-emotion', 'POST');
      if (response.success) {
        setCurrentEmotion(response.emotion);
        alert(`Detected Emotion: ${response.emotion}`)
      } else {
        alert(`Emotion Detection Error: ${response.error}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    }
  }

  const clearHistory = async () => {
    try {
      await apiHandling('/clear-history', 'POST');
      setMessages([]);
    } catch (error) {
      console.error('Error clearing hisotry:', error);
    }
  }
 
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

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: '#4CAF50',
      sad: '#2196F3',
      angry: '#F44336',
      surprise: '#FF9800',
      fear: '#9C27B0',
      disgust: '#795548',
      neutral: '#9E9E9E'
    }

    return colors[emotion] || colors.neutral;
  }



  // skeletal API call handler

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!goal.trim()) {
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
      <div className="w-[60%] items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-[95vh]">
        {/* Header */}
        <div className="flex p-4 border-b border-gray-200 dark:border-gray-700 gap-2">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            LeroyAI Chatbot
          </h1>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto w-full mx-5 p-4 space-y-4">
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
              className={`flex ${msg.role === 'user' || msg.role === 'user_speech' ? 'justify-end' : msg.role === 'Error' ? 'items-center justify-center' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg
                    ${msg.role === 'user' || msg.role === 'user_speech'
                    ? 'bg-neutral-900 text-white' : msg.role === 'error' ? 'bg-red-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                }`}>
                    {
                      msg.role === 'user' ? 'Written user Prompt' : 
                      msg.role === 'user_speech' ? "Spoken user prompt" : 
                      msg.role === 'bot' ? "Written AI response" : 
                      msg.role === 'ai_response' ? "Spoken AI Response" : "Error"
                    }

                    {
                      msg.emotion && (
                          `${msg.emotion}`
                        )
                    } - {msg.timestamp}

                    {
                      msg.role === 'user' ? (
                        <>
                          <strong>Prompt:</strong> {msg.content}
                        </>
                      ) : (
                      <pre>
                        {
                          typeof msg.content === 'object'
                          ? JSON.stringify(msg.content, null, 2)
                          : <ReactMarkdown>{msg.content}</ReactMarkdown>
                        }
                    </pre>)
                    }

                    {
                      (msg.role === "bot" || msg.role === "ai_response" &&
                        (
                          <button
                            onClick={textToSpeech(msg.content)}
                            className='mt-1'
                          >
                            🔊 Speak
                          </button>
                        )
                      )
                    }

                    {/* // (
                    // <>
                        

                    //     {
                    //     }
                    // </>
                    // ) : (
                    // <pre className="whitespace-pre-wrap">
                    //     {
                    //       typeof msg.content === 'object'
                    //       ? JSON.stringify(msg.content, null, 2)
                    //       : <ReactMarkdown>{msg.content}</ReactMarkdown>
                    //     } 
                    // </pre> */}
                <div ref={messageEndRef}/>
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
          className="mb-2 items-center justify-center bg-neutral-900 text-white rounded-md hover:bg-neutral-900 transition"
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>

        {
          !isCollapsed && (
            <>
              {/* Suggested Prompts */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-800 shadow-xl rounded-xl mb-3 w-full max-w-[43rem]">
                <form onSubmit={sendMessage} className="space-y-2">
                  <div className='relative flex flex-col w-full h-[8.5rem] dark:bg-gray-900 bg-gray-600 rounded-md'>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Enter prompt (e.g., Render 3D assets into a Lifelike futuristic cityscape)"
                        className="absolute top-0 left-0 h-full w-full z-1 p-2 rounded-md dark:bg-gray-900 bg-gray-600 text-gray-800 dark:text-white resize-none overflow-y-auto"
                        rows={3}
                        disabled={isLoading}
                        onKeyDown={
                          (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              sendMessage()
                            }
                          }
                        }
                        style={{
                          minHeight: '1.5rem',
                          maxHeight: '6rem', // Approximately 3 lines
                          height: 'auto'
                        }}
                        required
                      />
                      <div className='absolute bottom-1 w-full h-fit flex flex-row z-10'>
                        <div className='mx-2 rounded-md w-full flex  items-center justify-between'>
                          <div className='flex'>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={isEmotionMonitoring ? stopEmotionMonitoring : startEmotionMonitoring}
                              className="h-fit p-2 my-0 ml-2 mr-0 bg-neutral-900 text-white rounded-md hover:bg-neutral-900 disabled:bg-blue-300 dark:bg-neutral-900 dark:hover:bg-blue-700 dark:disabled:bg-blue-400 transition"
                              >
                                {isEmotionMonitoring ? 'Stop Emotion' : 'Detect 😄'} 
                            </button>
                            <div className='h-fit p-[0.3rem] my-0 mx-1 bg-neutral-900 text-white rounded-md hover:bg-neutral-900 dark:bg-neutral-900 transition pointer-events-none'
                            style={{
                              fontSize : '1rem',
                              fontWeight : '500',
                            }}>
                              {/* You seem &nbsp; */}
                              <span style={{
                                color : getEmotionColor(currentEmotion),
                                textTransform : 'capitalize'
                                }}>
                                {currentEmotion}
                              </span> 
                              <Emoji/>
                      
                            </div>
                            <button
                              type="button"
                              disabled={!inputText}
                              onClick={clearHistory}
                              className="h-fit p-2 my-0 ml-2 mr-0 bg-neutral-900 text-white rounded-md hover:bg-neutral-900 disabled:bg-blue-300 dark:bg-neutral-900 dark:hover:bg-blue-700 dark:disabled:bg-blue-400 transition"
                              >
                                {inputText ? 'clearing' : 'clear'}
                            </button>
                            <button
                              type="button"
                              disabled={isListening}
                              onClick={speechToText}
                              className={`${isListening ? 'bg-[ff9800]' : 'bg-[ff0000]'} h-fit p-2 my-0 ml-2 mr-0 text-white rounded-md hover:bg-neutral-900 disabled:bg-blue-300 dark:bg-neutral-900 dark:hover:bg-blue-700 dark:disabled:bg-blue-400 transition`}
                              >
                                {isListening ? 'Listening 👂' : 'STT 🎤'}
                            </button>
                            <button
                              type="button"
                              disabled={!inputText}
                              onClick={startVoiceChat}
                              className="h-fit p-2 my-0 ml-2 mr-0 bg-neutral-900 text-white rounded-md hover:bg-neutral-900 disabled:bg-blue-300 dark:bg-neutral-900 dark:hover:bg-blue-700 dark:disabled:bg-blue-400 transition"
                              >
                                {inputText ? 'AI speaking' : 'User '}
                            </button>
                          </div>
                          

                          <div className='mr-2'>
                            <Checkbox
                              checked={checked}
                              onChange={handleChange}
                              inputProps={{ 'aria-label': 'controlled' }}
                              // style={{
                              //   backgroundColor : 'white'
                              // }}
                            />🔊
                            <button
                              type="submit"
                              disabled={isLoading || !inputText.trim()}
                              onClick={sendMessage}
                              className="h-fit p-2 my-1 mx-1 bg-neutral-900 text-white rounded-md hover:bg-neutral-900 disabled:bg-blue-300 dark:bg-neutral-900 dark:hover:bg-blue-700 dark:disabled:bg-blue-400 transition duration-300"
                            >
                              {isLoading ?
                                <div className="flex justify-center">
                                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                </div>
                               : 'Send'}
                            </button>
                          </div>
                        </div>
                      </div>
                  </div>
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