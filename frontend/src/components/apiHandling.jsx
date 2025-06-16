import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// new instance of axios with a custom config
const apiClient = axios.create({
    baseURL : API_BASE,
    headers : {
        'Content-Type' : 'application/json'
    },
    timeout : 30000,
})

// adding request interceptor for logging, auth tokens etc
apiClient.interceptors.request.use(
    (config) => {
        console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error)
        return Promise.reject(error);
    }
);

// adding response interceptors e.g. for global error handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            console.error('Unauthorized - redirect to login');
        } else if (error.response?.status >= 500) {
            console.error('Server Error Occured');
        }
        return Promise.reject(error);
    }
);

const apiHandling = async (endpoint, method = 'GET', data = null, options = {}) => {
    try {
        const config = {
            method : method.toLowerCase(),
            url: endpoint,
            ...options, // Allow custom axios options
        };

        // Handle data based on method
        if (data) {
            if (method.toLowerCase() === 'get') {
                config.params = data;
            } else {
                config.data = data;
            }
        }

        const response = await apiClient(config)
        return response.data
    } catch (error) {
        console.error('Enhanced API error:', error)

        //Detailed error handling
        if (error.response) {
            const errorData = error.response.data;
            throw new Error(errorData?.error || errorData?.message || `HTTP ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
            // Request made but no response received
            throw new Error('Network Error - no response received')
        } else {
            throw new Error(error.message || 'Unknown Error occured')
        }
    }
}

export default apiHandling