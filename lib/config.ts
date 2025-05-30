import Constants from "expo-constants";

// Determine if we're in development or production
const isDevelopment = __DEV__;

// Your Vercel domain - REPLACE THIS with your actual Vercel domain after deployment
// Example: 'https://budget-app-123.vercel.app'
const VERCEL_DOMAIN =
  "https://budget-3ie4tru57-hemalmakanis-projects.vercel.app";

// API base URL configuration - now always use Vercel since APIs are deployed there
export const API_BASE_URL = VERCEL_DOMAIN;

// Helper function to construct full API URLs
export const getApiUrl = (endpoint: string): string => {
  // Always use Vercel URLs since APIs are deployed there
  // Convert /(api)/ pattern to /api/ for Vercel

  if (endpoint.startsWith("/(api)/")) {
    // Remove /(api)/ and replace with /api/
    const cleanEndpoint = endpoint.replace("/(api)/", "");
    return `${API_BASE_URL}/api/${cleanEndpoint}`;
  } else {
    // If it's already a clean endpoint, use it as is
    return `${API_BASE_URL}${endpoint}`;
  }
};

export const config = {
  API_BASE_URL,
  isDevelopment,
  VERCEL_DOMAIN,
};
