import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "./config";
import { useAuth } from "@clerk/clerk-expo";

export const fetchAPI = async (
  url: string,
  options?: RequestInit,
  token?: string | null
) => {
  try {
    // Convert the URL using our configuration
    const apiUrl = getApiUrl(url);

    console.log(
      `Fetching URL: ${apiUrl} with method: ${options?.method || "GET"}`
    );

    // Build headers with Vercel bypass
    const headers = new Headers(options?.headers);

    // Add Authorization header with JWT token if provided
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Add Vercel protection bypass header from environment variable
    const bypassToken = process.env.VERCEL_PROTECTION_BYPASS;
    if (bypassToken) {
      headers.set("x-vercel-protection-bypass", bypassToken);
    }

    // Add Content-Type for POST/PUT/PATCH requests
    if (options?.method && ["POST", "PUT", "PATCH"].includes(options.method)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(apiUrl, {
      ...options,
      headers,
    });

    // Log detailed response info
    console.log(`Response status: ${response.status} for URL: ${apiUrl}`);
    console.log(`Content-Type: ${response.headers.get("Content-Type")}`);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        // Clone the response so we can read it multiple times if needed
        const responseClone = response.clone();

        // Try to parse as JSON first
        const errorData = await responseClone.json();
        console.error("Error response:", errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        try {
          // If not JSON, get as text from the original response
          const text = await response.text();
          console.error("Error response text:", text);
          if (text && text.trim()) {
            errorMessage = text;
          }
        } catch (textError) {
          console.error("Could not read error response:", textError);
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      setData(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for making authenticated API calls with Clerk JWT token.
 * Use this instead of fetchAPI when you need authentication.
 * 
 * Example:
 * const { getToken } = useAuth();
 * const authenticatedFetch = useAuthenticatedFetch();
 * const data = await authenticatedFetch('/api/budget', { method: 'POST', body: JSON.stringify({...}) });
 */
export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth();

  return useCallback(
    async (url: string, options?: RequestInit) => {
      const token = await getToken();
      return fetchAPI(url, options, token);
    },
    [getToken]
  );
};
