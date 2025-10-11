import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { create, open } from "react-native-plaid-link-sdk";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { getApiUrl } from "@/lib/config";

export default function PlaidIntegration() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  const getLinkToken = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "Please sign in to connect your bank account");
        return;
      }

      setLoading(true);
      const resp = await fetch(getApiUrl("/api/plaid/link-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: userId }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Failed to create link token");
      }

      if (!data.link_token) {
        throw new Error("No link_token in response");
      }

      create({
        token: data.link_token,
        noLoadingState: false,
      });
      setReady(true);
      console.log("Plaid Link token created successfully");
    } catch (err: any) {
      console.error("Error creating link token:", err);
      Alert.alert("Error", err.message ?? "Failed to create link token");
    } finally {
      setLoading(false);
    }
  };

  const exchangePublicToken = async (publicToken: string) => {
    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setExchanging(true);
      const resp = await fetch(getApiUrl("/api/plaid/exchange-public-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          clerkId: userId,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Failed to exchange token");
      }

      Alert.alert("Success", "Bank account connected successfully!");
      return data.item_id;
    } catch (err: any) {
      console.error("Error exchanging token:", err);
      throw err;
    } finally {
      setExchanging(false);
    }
  };

  const openLink = () => {
    console.log("Opening Plaid Link...");
    open({
      onSuccess: async (success) => {
        console.log("Plaid Link success:", success.publicToken);
        try {
          await exchangePublicToken(success.publicToken);
        } catch (err: any) {
          Alert.alert("Error", err.message ?? "Failed to connect bank account");
        } finally {
          // Reset ready state so user can reinitialize if they want to connect another account
          setReady(false);
        }
      },
      onExit: (linkExit) => {
        console.log("Plaid Link exit:", linkExit);

        // Reset ready state - Plaid Link instance is consumed after opening
        setReady(false);

        // Only show error if there's a real error (not empty string or user cancellation)
        const hasRealError =
          linkExit.error?.errorCode &&
          linkExit.error.errorCode.trim() !== "" &&
          linkExit.error.errorMessage &&
          linkExit.error.errorMessage.trim() !== "";

        if (hasRealError) {
          console.error("Plaid Link exit error:", linkExit.error);
          Alert.alert(
            "Connection Error",
            `Error: ${linkExit.error.errorCode} - ${linkExit.error.errorMessage}`
          );
        } else {
          // User simply cancelled - no error
          console.log("User cancelled Plaid Link");
        }
      },
    });
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Text className="text-lg text-gray-600 text-center">
          Please sign in to connect your bank accounts
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Bank Integration
        </Text>
        <Text className="text-gray-600 mb-8 text-center">
          Securely connect your bank accounts through Plaid
        </Text>

        <TouchableOpacity
          onPress={ready ? openLink : getLinkToken}
          disabled={loading || exchanging}
          className={`bg-blue-600 rounded-xl px-8 py-4 ${loading || exchanging ? "opacity-50" : ""}`}
        >
          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Creating connection...
              </Text>
            </View>
          ) : exchanging ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Connecting account...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-lg">
              {ready ? "Connect Bank Account" : "Initialize Plaid"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Testing Instructions */}
        <View className="bg-yellow-50 rounded-xl p-6 mt-8">
          <Text className="text-lg font-semibold text-yellow-900 mb-3">
            🧪 Testing with Sandbox
          </Text>
          <Text className="text-yellow-800 text-sm mb-2">
            • Select "Platypus Bank" (Plaid's test bank)
          </Text>
          <Text className="text-yellow-800 text-sm mb-2">
            • Username: <Text className="font-mono font-bold">user_good</Text>
          </Text>
          <Text className="text-yellow-800 text-sm">
            • Password: <Text className="font-mono font-bold">pass_good</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
