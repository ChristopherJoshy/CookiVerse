// Configuration file to access environment variables
export const config = {
    firebase: {
        apiKey: window.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
        projectId: window.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        appId: window.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
    },
    gemini: {
        apiKey: window.GEMINI_API_KEY || process.env.GEMINI_API_KEY
    }
};

// For client-side access, try to get from global window object first
if (typeof window !== 'undefined') {
    // Make environment variables available on window object
    window.config = config;
}