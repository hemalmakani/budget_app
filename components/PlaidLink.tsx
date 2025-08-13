import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { PlaidLink, LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";
import { useAuth } from "@clerk/clerk-expo";
import { getApiUrl } from "../lib/config";

interface PlaidLinkComponentProps {
  onSuccess?: (accounts: any[]) => void;
  onExit?: () => void;
  buttonText?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  onExit,
  buttonText = "Connect Bank Account",
  disabled = false,
  variant = "primary",
  size = "medium",
}) => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

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
      return data.link_token;
    } catch (error: any) {
      console.error("Error creating link token:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to initialize bank connection"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (!linkToken) {
      await createLinkToken();
    }
  };

  const handleSuccess = async (success: LinkSuccess) => {
    try {
      setIsLoading(true);

      const response = await fetch(
        getApiUrl("/(api)/plaid/exchange-public-token"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicToken: success.publicToken,
            clerkId: userId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect bank account");
      }

      Alert.alert(
        "Success!",
        `${data.accounts?.length || 0} account(s) connected successfully`,
        [{ text: "OK", onPress: () => onSuccess?.(data.accounts || []) }]
      );
    } catch (error: any) {
      console.error("Error exchanging public token:", error);
      Alert.alert("Error", error.message || "Failed to connect bank account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExit = (exit: LinkExit) => {
    console.log("Plaid Link exit:", exit);
    if (exit.error) {
      console.error("Plaid Link error:", exit.error);
      Alert.alert(
        "Connection Error",
        exit.error.display_message || "Failed to connect account"
      );
    }
    onExit?.();
  };

  return (
    <View>
      {linkToken ? (
        <PlaidLink
          tokenConfig={{
            token: linkToken,
          }}
          onSuccess={handleSuccess}
          onExit={handleExit}
        >
          <TouchableOpacity
            style={[
              {
                backgroundColor: "#007AFF",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
                opacity: disabled || isLoading ? 0.6 : 1,
              },
            ]}
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
        </PlaidLink>
      ) : (
        <TouchableOpacity
          style={[
            {
              backgroundColor: "#007AFF",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
              opacity: disabled || isLoading ? 0.6 : 1,
            },
          ]}
          onPress={handlePress}
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
      )}
    </View>
  );
};
