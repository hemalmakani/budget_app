import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { useAuth } from "@clerk/clerk-expo";
import { getApiUrl } from "../lib/config";

interface PlaidLinkWebViewProps {
  onSuccess?: (accounts: any[]) => void;
  onExit?: () => void;
  buttonText?: string;
  disabled?: boolean;
}

export const PlaidLinkWebView: React.FC<PlaidLinkWebViewProps> = ({
  onSuccess,
  onExit,
  buttonText = "Connect Bank Account",
  disabled = false,
}) => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  const createLinkToken = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        getApiUrl("/(api)/plaid/create-link-token"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkId: userId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create link token");
      }

      setLinkToken(data.link_token);
      setShowWebView(true);
    } catch (error: any) {
      console.error("Error creating link token:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to initialize bank connection"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "success" && data.publicToken) {
        setIsLoading(true);
        setShowWebView(false);

        const response = await fetch(
          getApiUrl("/(api)/plaid/exchange-public-token"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              publicToken: data.publicToken,
              clerkId: userId,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to connect bank account");
        }

        Alert.alert(
          "Success!",
          `${result.accounts?.length || 0} account(s) connected successfully`,
          [{ text: "OK", onPress: () => onSuccess?.(result.accounts || []) }]
        );
      } else if (data.type === "exit") {
        setShowWebView(false);
        onExit?.();
      }
    } catch (error: any) {
      console.error("Error processing WebView message:", error);
      Alert.alert("Error", error.message || "Failed to connect bank account");
    } finally {
      setIsLoading(false);
    }
  };

  const plaidLinkHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
    </head>
    <body>
      <div id="container" style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
        <div style="text-align: center;">
          <h2>Connecting to your bank...</h2>
          <p>Please wait while we set up the connection</p>
        </div>
      </div>
      
      <script>
        const linkToken = '${linkToken}';
        
        if (linkToken) {
          const handler = Plaid.create({
            token: linkToken,
            onSuccess: (public_token, metadata) => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                publicToken: public_token,
                metadata: metadata
              }));
            },
            onExit: (err, metadata) => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'exit',
                error: err,
                metadata: metadata
              }));
            },
            onEvent: (eventName, metadata) => {
              console.log('Plaid event:', eventName, metadata);
            }
          });
          
          // Auto-open Plaid Link
          handler.open();
        }
      </script>
    </body>
    </html>
  `;

  if (showWebView && linkToken) {
    return (
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ html: plaidLinkHTML }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          style={{ flex: 1 }}
        />
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 50,
            right: 20,
            backgroundColor: "#FF5722",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}
          onPress={() => setShowWebView(false)}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#007AFF",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        opacity: disabled || isLoading ? 0.6 : 1,
      }}
      onPress={createLinkToken}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  );
};
