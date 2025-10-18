import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { fetchAPI } from "../lib/fetch";
import { getApiUrl } from "../lib/config";

interface Account {
  id: number;
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype?: string;
  mask?: string;
  current_balance: number;
  available_balance: number;
  credit_limit: number;
  last_balance_update: string;
  institution_name?: string;
  is_active: boolean;
}

interface AccountsSummary {
  total_accounts: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

interface AccountsData {
  accounts: Account[];
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

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "depository":
        return "#4CAF50"; // Green for checking/savings
      case "credit":
        return "#FF5722"; // Red for credit cards
      case "loan":
        return "#FF9800"; // Orange for loans
      case "investment":
        return "#2196F3"; // Blue for investments
      default:
        return "#757575"; // Gray for other
    }
  };

  const renderAccount = ({ item }: { item: Account }) => (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#333",
              marginBottom: 4,
            }}
          >
            {item.official_name || item.name}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
            {[
              item.institution_name || "Bank",
              item.subtype || item.type,
              item.mask ? `•••• ${item.mask}` : "",
            ]
              .filter(Boolean)
              .join(" • ")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getAccountTypeColor(item.type),
                marginRight: 8,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                color: "#888",
                textTransform: "capitalize",
              }}
            >
              {item.subtype || item.type}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: "#999" }}>
            Last updated:{" "}
            {new Date(item.last_balance_update).toLocaleDateString()}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: item.type === "credit" ? "#FF5722" : "#4CAF50",
              marginBottom: 4,
            }}
          >
            {formatCurrency(item.current_balance)}
          </Text>

          {item.available_balance !== null &&
            item.available_balance !== item.current_balance && (
              <Text style={{ fontSize: 12, color: "#666" }}>
                Available: {formatCurrency(item.available_balance)}
              </Text>
            )}

          {item.credit_limit > 0 && (
            <Text style={{ fontSize: 12, color: "#999" }}>
              Limit: {formatCurrency(item.credit_limit)}
            </Text>
          )}
        </View>
      </View>
    </View>
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
