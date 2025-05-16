import { useState, useEffect, useCallback } from "react";

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    console.log(
      `Fetching URL: ${url} with method: ${options?.method || "GET"}`
    );

    // Ensure we have the right headers for JSON
    if (options?.method && ["POST", "PUT", "PATCH"].includes(options.method)) {
      options.headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };
    }

    const response = await fetch(url, options);

    // Log detailed response info
    console.log(`Response status: ${response.status} for URL: ${url}`);
    console.log(`Content-Type: ${response.headers.get("Content-Type")}`);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        // Try to parse as JSON first
        const errorData = await response.json();
        console.error("Error response:", errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If not JSON, get as text
        const text = await response.text();
        console.error("Error response text:", text);
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
