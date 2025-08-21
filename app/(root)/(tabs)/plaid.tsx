import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
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
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);

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

      setConnected(true);
      return data.item_id;
    } catch (err: any) {
      console.error("Error exchanging token:", err);
      throw err;
    } finally {
      setExchanging(false);
    }
  };

  const syncTransactions = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "Please sign in to sync transactions");
        return;
      }

      setSyncing(true);
      const resp = await fetch(getApiUrl("/api/plaid/transactions-sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: userId }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Failed to sync transactions");
      }

      Alert.alert("Success", "Transactions synced successfully!");
    } catch (err: any) {
      console.error("Error syncing transactions:", err);
      Alert.alert("Error", err.message ?? "Failed to sync transactions");
    } finally {
      setSyncing(false);
    }
  };

  const openLink = () => {
    console.log("Opening Plaid Link...");
    open({
      onSuccess: async (success) => {
        console.log("Plaid Link success:", success);
        try {
          setExchanging(true);
          const itemId = await exchangePublicToken(success.publicToken);
          console.log("Token exchange successful, item_id:", itemId);
          Alert.alert(
            "Success 🎉",
            "Bank account connected successfully! You can now sync transactions.",
            [
              {
                text: "Sync Now",
                onPress: syncTransactions,
              },
              {
                text: "Later",
                style: "cancel",
              },
            ]
          );
        } catch (err: any) {
          console.error("Token exchange error:", err);
          Alert.alert("Error", err.message ?? "Failed to connect bank account");
        } finally {
          setExchanging(false);
        }
      },
      onExit: (linkExit) => {
        console.log("Plaid Link exit:", linkExit);
        if (linkExit.error) {
          console.error("Plaid Link exit error:", linkExit.error);
          Alert.alert(
            "Connection Error",
            `Error: ${linkExit.error.errorCode} - ${linkExit.error.errorMessage}`
          );
        } else {
          console.log("User cancelled Plaid Link");
          Alert.alert(
            "Connection Cancelled",
            "Bank account connection was cancelled"
          );
        }
      },
    });
  };

  // Check if user has existing connections on component mount
  useEffect(() => {
    const checkExistingConnections = async () => {
      if (!userId) return;

      try {
        const resp = await fetch(
          getApiUrl(`/api/plaid/accounts?clerkId=${userId}`)
        );
        if (resp.ok) {
          const data = await resp.json();
          console.log(
            "=== PLAID TAB ACCOUNTS CHECK ===",
            JSON.stringify(data, null, 2)
          );
          console.log(
            "=== PLAID TAB ACCOUNTS LENGTH ===",
            data.accounts?.length || 0
          );
          if (data.accounts && data.accounts.length > 0) {
            setConnected(true);
            console.log("=== PLAID TAB SETTING CONNECTED = TRUE ===");
          } else {
            console.log("=== PLAID TAB NO ACCOUNTS FOUND ===");
          }
        } else {
          const errorText = await resp.text();
          console.error(
            "Plaid tab accounts API error:",
            resp.status,
            errorText
          );
        }
      } catch (err) {
        console.log("No existing connections found");
      }
    };

    checkExistingConnections();
  }, [userId]);

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
      <ScrollView className="flex-1 px-6">
        <View className="py-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Bank Integration
          </Text>
          <Text className="text-gray-600 mb-8">
            Securely connect your bank accounts to automatically track
            transactions
          </Text>

          {/* Connection Status */}
          <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Connection Status
            </Text>
            <View className="flex-row items-center">
              <View
                className={`w-3 h-3 rounded-full mr-3 ${connected ? "bg-green-500" : "bg-gray-300"}`}
              />
              <Text
                className={`text-sm ${connected ? "text-green-700" : "text-gray-500"}`}
              >
                {connected
                  ? "Bank account connected"
                  : "No bank accounts connected"}
              </Text>
            </View>
          </View>

          {/* Main Actions */}
          <View className="space-y-4">
            {/* Connect Bank Account */}
            <TouchableOpacity
              onPress={ready ? openLink : getLinkToken}
              disabled={loading || exchanging}
              className={`bg-blue-600 rounded-xl p-4 ${loading || exchanging ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center justify-center">
                {loading ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="white"
                      className="mr-2"
                    />
                    <Text className="text-white font-semibold">
                      Creating secure connection...
                    </Text>
                  </>
                ) : exchanging ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="white"
                      className="mr-2"
                    />
                    <Text className="text-white font-semibold">
                      Connecting account...
                    </Text>
                  </>
                ) : (
                  <Text className="text-white font-semibold text-lg">
                    {ready
                      ? "🏦 Connect Bank Account"
                      : "🔗 Initialize Connection"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Sync Transactions */}
            {connected && (
              <TouchableOpacity
                onPress={syncTransactions}
                disabled={syncing}
                className={`bg-green-600 rounded-xl p-4 ${syncing ? "opacity-50" : ""}`}
              >
                <View className="flex-row items-center justify-center">
                  {syncing ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color="white"
                        className="mr-2"
                      />
                      <Text className="text-white font-semibold">
                        Syncing transactions...
                      </Text>
                    </>
                  ) : (
                    <Text className="text-white font-semibold text-lg">
                      🔄 Sync Latest Transactions
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Information Section */}
          <View className="bg-blue-50 rounded-xl p-6 mt-8">
            <Text className="text-lg font-semibold text-blue-900 mb-3">
              How it works
            </Text>
            <View className="space-y-2">
              <Text className="text-blue-800 text-sm">
                • Connect your bank account securely through Plaid
              </Text>
              <Text className="text-blue-800 text-sm">
                • Your banking credentials are never stored on our servers
              </Text>
              <Text className="text-blue-800 text-sm">
                • Transactions are automatically synced to help track your
                spending
              </Text>
              <Text className="text-blue-800 text-sm">
                • You can disconnect at any time from your bank's website
              </Text>
            </View>
          </View>

          {/* Testing Instructions */}
          <View className="bg-yellow-50 rounded-xl p-6 mt-4">
            <Text className="text-lg font-semibold text-yellow-900 mb-3">
              🧪 Testing with Sandbox
            </Text>
            <View className="space-y-2">
              <Text className="text-yellow-800 text-sm">
                • Select "Platypus Bank" (this is Plaid's test bank)
              </Text>
              <Text className="text-yellow-800 text-sm">
                • Username:{" "}
                <Text className="font-mono font-bold">user_good</Text>
              </Text>
              <Text className="text-yellow-800 text-sm">
                • Password:{" "}
                <Text className="font-mono font-bold">pass_good</Text>
              </Text>
              <Text className="text-yellow-800 text-sm">
                • If you see a white screen, try going back and selecting
                accounts manually
              </Text>
            </View>
          </View>

          {/* User Info */}
          <View className="bg-gray-100 rounded-xl p-4 mt-6">
            <Text className="text-sm text-gray-600">
              Logged in as:{" "}
              {user.emailAddresses[0]?.emailAddress || user.firstName || "User"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
