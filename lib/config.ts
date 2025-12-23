// Use __DEV__ for React Native (reliable in native builds) with fallback for Node.js
// __DEV__ is a global boolean in React Native: true in dev, false in production builds
const isDevelopment =
  typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

// Your Vercel domain - REPLACE THIS with your actual Vercel domain after deployment
// Example: 'https://budget-app-123.vercel.app'
const VERCEL_DOMAIN =
  "https://budget-app-hemalmakani-hemalmakanis-projects.vercel.app";

// Local development configuration
const LOCAL_API_URL = "http://localhost:3000";

// Determine if we're running locally by checking for local development indicators
const isLocalDevelopment =
  isDevelopment &&
  (process.env.EXPO_PUBLIC_USE_LOCAL_API === "true" ||
    // Check if we're in a local development environment
    (typeof window !== "undefined" &&
      window.location?.hostname === "localhost"));

// API base URL configuration - use local or Vercel based on environment
// __DEV__ is the correct way to check for development in React Native
export const API_BASE_URL = isDevelopment
  ? LOCAL_API_URL
  : VERCEL_DOMAIN;

// Plaid Configuration
export const PLAID_CONFIG = {
  CLIENT_ID: process.env.PLAID_CLIENT_ID || "",
  SECRET: process.env.PLAID_SECRET || "",
  ENV: process.env.PLAID_ENV || "sandbox",
  PRODUCTS: (process.env.PLAID_PRODUCTS || "transactions,auth,identity").split(
    ","
  ),
  COUNTRY_CODES: (process.env.PLAID_COUNTRY_CODES || "US,CA").split(","),
  WEBHOOK_URL:
    process.env.PLAID_WEBHOOK_URL || `${VERCEL_DOMAIN}/api/plaid/webhook`,
};

// Helper function to construct full API URLs
export const getApiUrl = (endpoint: string): string => {
  // Always use Vercel URLs since APIs are deployed there
  // Convert /(api)/ pattern to /api/ for Vercel traditional API routes

  if (endpoint.startsWith("/(api)/")) {
    // Remove /(api)/ and replace with /api/
    const cleanEndpoint = endpoint.replace("/(api)/", "");
    return `${API_BASE_URL}/api/${cleanEndpoint}`;
  } else if (endpoint.startsWith("/api/")) {
    // Already a traditional API route
    return `${API_BASE_URL}${endpoint}`;
  } else {
    // If it's already a clean endpoint, use it as is
    return `${API_BASE_URL}${endpoint}`;
  }
};

// Helper function to log current configuration (useful for debugging)
export const logConfig = () => {
  console.log("🔧 Budget App Configuration:", {
    NODE_ENV: process.env.NODE_ENV,
    isDevelopment,
    isLocalDevelopment,
    API_BASE_URL,
    EXPO_PUBLIC_USE_LOCAL_API: process.env.EXPO_PUBLIC_USE_LOCAL_API,
    "window.location":
      typeof window !== "undefined" ? window.location?.hostname : "undefined",
  });
};

export const config = {
  API_BASE_URL,
  isDevelopment,
  isLocalDevelopment,
  LOCAL_API_URL,
  VERCEL_DOMAIN,
  PLAID_CONFIG,
  logConfig,
};
