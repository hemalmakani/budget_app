import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { fetchAPI } from "../lib/fetch";
import AccountCard from "./AccountCard";
import type { PlaidAccount } from "@/types/plaid";

interface AccountsSummary {
  total_accounts: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

interface AccountsData {
  accounts: PlaidAccount[];
  summary: AccountsSummary;
}

export const AccountsOverview: React.FC = () => {
  const { userId } = useAuth();
  const [accountsData, setAccountsData] = useState<AccountsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasVercelAuthIssue, setHasVercelAuthIssue] = useState(false);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);

      const data = await fetchAPI(`/(api)/plaid/accounts?clerkId=${userId}`);

      console.log("Accounts data received:", data);
      setAccountsData(data);
    } catch (error: any) {
      console.error("Error fetching accounts:", error);

      // Handle Vercel authentication specifically
      if (error.message && error.message.includes("Authentication Required")) {
        setHasVercelAuthIssue(true);
        return; // Don't show alert, handle in UI
      }

      // Only show alert if it's not a "no accounts" scenario
      if (error.message && !error.message.includes("404")) {
        Alert.alert("Error", error.message || "Failed to fetch accounts");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const syncAccounts = async () => {
    try {
      setRefreshing(true);

      const data = await fetchAPI("/(api)/plaid/accounts", {
        method: "POST",
        body: JSON.stringify({
          clerkId: userId,
        }),
      });

      // Refresh the accounts data after sync
      await fetchAccounts();

      Alert.alert(
        "Sync Complete",
        `Updated ${data.accounts_updated} account(s)`
      );
    } catch (error: any) {
      console.error("Error syncing accounts:", error);
      Alert.alert("Error", error.message || "Failed to sync accounts");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleRemoveAccount = async (accountId: number) => {
    try {
      await fetchAPI(`/(api)/plaid/accounts/delete/${accountId}?clerkId=${userId}`, {
        method: "DELETE",
      });

      Alert.alert("Success", "Account unlinked successfully");
      fetchAccounts();
    } catch (error: any) {
      console.error("Error removing account:", error);
      Alert.alert("Error", error.message || "Failed to remove account");
    }
  };

  const renderAccount = ({ item }: { item: PlaidAccount }) => (
    <AccountCard
      account={item}
      onRemove={() => handleRemoveAccount(item.id)}
    />
  );

  const renderSummary = () => {
    if (!accountsData?.summary) return null;

    const { summary } = accountsData;

    return (
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#333",
            marginBottom: 16,
          }}
        >
          Net Worth Overview
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: "#666" }}>Total Assets</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#4CAF50" }}>
            {formatCurrency(summary.total_assets)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: "#666" }}>Total Liabilities</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#FF5722" }}>
            {formatCurrency(summary.total_liabilities)}
          </Text>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#E0E0E0",
            paddingTop: 12,
            marginTop: 12,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#333" }}>
              Net Worth
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: summary.net_worth >= 0 ? "#4CAF50" : "#FF5722",
              }}
            >
              {formatCurrency(summary.net_worth)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Show Vercel authentication issue
  if (hasVercelAuthIssue) {
    return (
      <View
        style={{
          backgroundColor: "#FFF3CD",
          margin: 16,
          padding: 20,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: "#FF9800",
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: "#8B4513",
            marginBottom: 8,
            fontWeight: "600",
          }}
        >
          🔐 API Access Protected
        </Text>
        <Text style={{ fontSize: 14, color: "#B8860B", marginBottom: 12 }}>
          Vercel is protecting the API endpoints with authentication. This is
          likely due to:
        </Text>
        <Text style={{ fontSize: 14, color: "#B8860B", marginBottom: 8 }}>
          • Pro/Team account security settings
        </Text>
        <Text style={{ fontSize: 14, color: "#B8860B", marginBottom: 8 }}>
          • Organizational authentication policies
        </Text>
        <Text style={{ fontSize: 14, color: "#B8860B", marginBottom: 16 }}>
          • Domain protection enabled
        </Text>
        <Text style={{ fontSize: 14, color: "#8B4513", fontWeight: "500" }}>
          To fix this: Check your Vercel dashboard settings or contact your team
          admin to disable authentication for API routes.
        </Text>
      </View>
    );
  }

  if (isLoading && !accountsData) {
    return (
      <View
        style={{
          backgroundColor: "white",
          margin: 16,
          padding: 20,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: "#666" }}>
          Loading your accounts...
        </Text>
      </View>
    );
  }

  // Simple fallback for testing - no accounts connected
  if (!accountsData?.accounts || accountsData.accounts.length === 0) {
    return (
      <View
        style={{
          backgroundColor: "white",
          margin: 16,
          padding: 20,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 18, color: "#666", marginBottom: 8 }}>
          No accounts connected
        </Text>
        <Text style={{ fontSize: 14, color: "#999", textAlign: "center" }}>
          Connect your bank accounts to see your balances and transactions
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <FlatList
        data={accountsData?.accounts || []}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderSummary}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={syncAccounts}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={() => (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 18, color: "#666", marginBottom: 8 }}>
              No accounts connected
            </Text>
            <Text style={{ fontSize: 14, color: "#999", textAlign: "center" }}>
              Connect your bank accounts to see your balances and transactions
            </Text>
          </View>
        )}
      />
    </View>
  );
};
