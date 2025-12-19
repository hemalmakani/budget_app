"use client";

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { create, open } from "react-native-plaid-link-sdk";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { getApiUrl } from "@/lib/config";
import { useAuthenticatedFetch } from "@/lib/fetch";
import AccountCard from "@/components/AccountCard";
import type { PlaidAccount } from "@/types/plaid";

export default function PlaidIntegration() {
  const { userId, getToken } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [summary, setSummary] = useState({
    total_accounts: 0,
    total_assets: 0,
    total_liabilities: 0,
    net_worth: 0,
  });
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user accounts
  const fetchAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      setFetchingAccounts(true);
      const data = await authenticatedFetch(`/api/plaid/fetch-accounts?clerkId=${userId}`, {
        method: "GET",
      });

      if (data.error) {
        throw new Error(data.error || "Failed to fetch accounts");
      }

      setAccounts(data.accounts);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Error fetching accounts:", err);
      // Don't show alert for initial load failures
      if (accounts.length > 0) {
        Alert.alert("Error", err.message ?? "Failed to fetch accounts");
      }
    } finally {
      setFetchingAccounts(false);
      setRefreshing(false);
    }
  }, [userId, accounts.length]);

  // Load accounts on mount
  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccounts();
  }, [fetchAccounts]);

  const getLinkToken = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "Please sign in to connect your bank account");
        return;
      }

      setLoading(true);
      const data = await authenticatedFetch("/api/plaid/link-token", {
        method: "POST",
        body: JSON.stringify({ clerkId: userId }),
      });

      if (data.error) {
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
      const data = await authenticatedFetch("/api/plaid/exchange-public-token", {
        method: "POST",
        body: JSON.stringify({
          public_token: publicToken,
          clerkId: userId,
        }),
      });

      if (data.error) {
        throw new Error(data.error || "Failed to exchange token");
      }

      Alert.alert("Success", "Bank account connected successfully!");
      // Refresh accounts list after successful connection
      await fetchAccounts();
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
            `Error: ${linkExit.error.errorCode} - ${linkExit.error.errorMessage}`,
          );
        } else {
          // User simply cancelled - no error
          console.log("User cancelled Plaid Link");
        }
      },
    });
  };

  const handleRemoveAccount = async (accountId: number) => {
    try {
      const data = await authenticatedFetch(`/api/plaid/accounts/delete/${accountId}?clerkId=${userId}`, {
        method: "DELETE",
      });

      if (!data.error) {
        Alert.alert("Success", "Account unlinked successfully");
        fetchAccounts();
      } else {
        Alert.alert("Error", data.error || "Failed to remove account");
      }
    } catch (error: any) {
      console.error("Error removing account:", error);
      Alert.alert("Error", error.message || "Failed to remove account");
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            Connected Accounts
          </Text>
          <TouchableOpacity
            onPress={ready ? openLink : getLinkToken}
            disabled={loading || exchanging}
            className={`bg-blue-600 rounded-xl px-4 py-2 ${loading || exchanging ? "opacity-50" : ""}`}
          >
            {loading || exchanging ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-sm">
                + Add Account
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        {accounts.length > 0 && (
          <View className="mb-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <Text className="text-sm text-gray-600 mb-2">Net Worth</Text>
              <Text
                className={`text-4xl font-bold ${summary.net_worth >= 0 ? "text-green-700" : "text-red-700"}`}
              >
                {formatCurrency(summary.net_worth)}
              </Text>
              <View className="flex-row mt-4 pt-4 border-t border-gray-100">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Assets</Text>
                  <Text className="text-lg font-semibold text-green-700">
                    {formatCurrency(summary.total_assets)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">
                    Liabilities
                  </Text>
                  <Text className="text-lg font-semibold text-red-700">
                    {formatCurrency(summary.total_liabilities)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Accounts List */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {fetchingAccounts && accounts.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 mt-4">Loading accounts...</Text>
          </View>
        ) : accounts.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
              No Connected Accounts
            </Text>
            <Text className="text-gray-600 mb-8 text-center px-6">
              Connect your bank accounts through Plaid to get started
            </Text>

            {/* Testing Instructions */}
            <View className="bg-yellow-50 rounded-xl p-6 mx-6">
              <Text className="text-lg font-semibold text-yellow-900 mb-3">
                🧪 Testing with Sandbox
              </Text>
              <Text className="text-yellow-800 text-sm mb-2">
                Select &quot;Platypus Bank&quot; (Plaid&apos;s test bank)
              </Text>
              <Text className="text-yellow-800 text-sm mb-2">
                Username: <Text className="font-mono font-bold">user_good</Text>
              </Text>
              <Text className="text-yellow-800 text-sm">
                Password: <Text className="font-mono font-bold">pass_good</Text>
              </Text>
            </View>
          </View>
        ) : (
          <>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onRemove={() => handleRemoveAccount(account.id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
