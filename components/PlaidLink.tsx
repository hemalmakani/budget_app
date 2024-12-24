import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { PlaidLink, LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";

interface PlaidLinkComponentProps {
  onSuccess: (publicToken: string) => void;
  onExit: () => void;
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  onExit,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createLinkToken = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://6mo7phodkb.execute-api.us-east-2.amazonaws.com/dev/plaid/create-link-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "test-user-123",
          }),
        }
      );

      const data = await response.json();
      console.log("Link token response:", data);

      if (data.link_token) {
        setLinkToken(data.link_token);
      } else if (data.error) {
        console.error("Error from API:", data.error);
        console.error("Error details:", data.details);
        Alert.alert("Error", `Failed to initialize: ${data.error}`);
        throw new Error(data.error);
      } else {
        throw new Error("No link token returned");
      }
    } catch (error) {
      console.error("Error creating link token:", error);
      Alert.alert(
        "Error",
        `Failed to initialize bank connection: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSuccess = useCallback(
    (success: LinkSuccess) => {
      console.log("Success:", success);
      onSuccess(success.publicToken);
    },
    [onSuccess]
  );

  const handleExit = useCallback(
    (exit: LinkExit) => {
      if (
        exit.error &&
        typeof exit.error === "object" &&
        "message" in exit.error
      ) {
        console.error("Plaid exit with error:", exit.error);
      }
      onExit();
    },
    [onExit]
  );

  React.useEffect(() => {
    createLinkToken();
  }, [createLinkToken]);

  if (!linkToken) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={true}
        >
          <ActivityIndicator color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PlaidLink
        tokenConfig={{
          token: linkToken,
        }}
        onSuccess={handleSuccess}
        onExit={handleExit}
      >
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Connect Your Bank Account</Text>
        </TouchableOpacity>
      </PlaidLink>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default PlaidLinkComponent;
