import React from "react";
import { View, StyleSheet, Alert, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import PlaidLinkComponent from "../components/PlaidLink";

export const ConnectBankScreen: React.FC = () => {
  const router = useRouter();

  const handlePlaidSuccess = async (publicToken: string) => {
    try {
      const response = await fetch(
        "https://6mo7phodkb.execute-api.us-east-2.amazonaws.com/dev/plaid/exchange-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_token: publicToken,
            userId: "test-user-123", // Replace with actual user ID
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Bank account connected successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        throw new Error(data.error || "Failed to connect bank account");
      }
    } catch (error) {
      console.error("Error exchanging token:", error);
      Alert.alert("Error", "Failed to connect bank account");
    }
  };

  const handlePlaidExit = () => {
    console.log("Plaid Link exit");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Bank Account</Text>
        <Text style={styles.subtitle}>
          Securely connect your bank account using Plaid
        </Text>
      </View>
      <View style={styles.content}>
        <PlaidLinkComponent
          onSuccess={handlePlaidSuccess}
          onExit={handlePlaidExit}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});

export default ConnectBankScreen;
