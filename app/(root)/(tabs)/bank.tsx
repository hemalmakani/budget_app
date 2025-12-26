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
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useAuthenticatedFetch } from "@/lib/fetch";
import PlaidTransactionCard from "@/components/PlaidTransactionCard";
import AccountCard from "@/components/AccountCard";
import type { PlaidTransaction, PlaidAccount } from "@/types/plaid";
import { useBudgetStore, useTransactionStore } from "@/store";
import { create, open } from "react-native-plaid-link-sdk";

type TabType = "transactions" | "accounts";

export default function Bank() {
  const { userId, getToken } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const { user } = useUser();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("transactions");

  // Transaction states
  const [syncing, setSyncing] = useState(false);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Account states
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
  const [loadingPlaid, setLoadingPlaid] = useState(false);
  const [syncingInvestments, setSyncingInvestments] = useState(false);

  const budgets = useBudgetStore((state) => state.budgets);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
      fetchAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await authenticatedFetch(
        `/api/plaid/transactions?clerkId=${userId}`
      );
      const fetchedTransactions = data.transactions || [];
      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const handleApproveTransaction = async (transactionId: string) => {
    const transaction = transactions.find((t) => t.id === transactionId);

    if (!transaction) return;

    const category =
      transaction.editable_category || transaction.classified_category;
    const transactionName =
      transaction.editable_name ||
      transaction.merchant_name ||
      transaction.name;

    if (!category) {
      Alert.alert("Error", "Please select a category first");
      return;
    }

    const budget = budgets.find((b) => b.category === category);

    if (!budget) {
      Alert.alert("Error", "Budget category not found");
      return;
    }

    try {
      // Add to transactions table
      await addTransaction({
        name: transactionName,
        categoryId: budget.id,
        amount: Math.abs(transaction.amount),
        clerk_id: userId!,
        category_name: budget.category,
      });

      // Mark as synced in Plaid transactions
      await authenticatedFetch("/api/plaid/mark-synced", {
        method: "POST",
        body: JSON.stringify({
          transactionId: transaction.transaction_id,
          clerkId: userId,
        }),
      });

      // Remove from the transactions list since it's now synced
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));

      Alert.alert("Success", "Transaction added to your budget!");
    } catch (error) {
      console.error("Error approving transaction:", error);
      Alert.alert("Error", "Failed to add transaction");
    }
  };

  // Manual edit handler for transactions
  const handleManualEdit = (
    transactionId: string,
    newName: string,
    newCategory: string
  ) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? { ...t, editable_name: newName, editable_category: newCategory }
          : t
      )
    );
  };

  // Account-related functions from plaid.tsx
  const fetchAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      setFetchingAccounts(true);
      const data = await authenticatedFetch(
        `/api/plaid/fetch-accounts?clerkId=${userId}`,
        {
          method: "GET",
        }
      );

      if (data.error) {
        throw new Error(data.error || "Failed to fetch accounts");
      }

      setAccounts(data.accounts);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Error fetching accounts:", err);
      if (accounts.length > 0) {
        Alert.alert("Error", err.message ?? "Failed to fetch accounts");
      }
    } finally {
      setFetchingAccounts(false);
      setRefreshing(false);
    }
  }, [userId, accounts.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === "accounts") {
      fetchAccounts();
    } else {
      fetchTransactions();
    }
  }, [activeTab, fetchAccounts, fetchTransactions]);

  const getLinkToken = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "Please sign in to connect your bank account");
        return;
      }

      setLoadingPlaid(true);

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
      setLoadingPlaid(false);
    }
  };

  const exchangePublicToken = async (publicToken: string) => {
    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      setExchanging(true);

      const data = await authenticatedFetch(
        "/api/plaid/exchange-public-token",
        {
          method: "POST",
          body: JSON.stringify({
            public_token: publicToken,
            clerkId: userId,
          }),
        }
      );

      if (data.error) {
        throw new Error(data.error || "Failed to exchange token");
      }

      Alert.alert("Success", "Bank account connected successfully!");
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
          setReady(false);
        }
      },
      onExit: (linkExit) => {
        console.log("Plaid Link exit:", linkExit);
        setReady(false);

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
          console.log("User cancelled Plaid Link");
        }
      },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Unified sync handler
  const handleSync = async () => {
    if (!userId) {
      Alert.alert("Error", "Please sign in to sync accounts");
      return;
    }

    try {
      setSyncing(true);
      setSyncingInvestments(true);

      // Run all syncs in parallel
      const results = await Promise.allSettled([
        authenticatedFetch("/api/plaid/transactions-sync", {
          method: "POST",
          body: JSON.stringify({ clerkId: userId }),
        }),
        authenticatedFetch("/api/plaid/investments-sync", {
          method: "POST",
          body: JSON.stringify({ clerkId: userId }),
        }),
        authenticatedFetch("/api/plaid/liabilities-sync", {
          method: "POST",
          body: JSON.stringify({ clerkId: userId }),
        }),
      ]);

      const [txResult, invResult, liabResult] = results;

      // Check results
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error));
      
      // Calculate successes
      let msg = "Sync complete!\n";
      
      if (txResult.status === "fulfilled" && !txResult.value.error) {
        msg += "✓ Transactions\n";
      }
      if (invResult.status === "fulfilled" && !invResult.value.error) {
        const invCount = invResult.value.accounts_updated || 0;
        msg += `✓ Investments (${invCount} updated)\n`;
      }
      if (liabResult.status === "fulfilled" && !liabResult.value.error) {
        const liabCount = liabResult.value.accounts_updated || 0;
         msg += `✓ Credit Cards (${liabCount} updated)`;
      }

      if (failed.length > 0) {
        msg += "\n\nNote: Some items failed to sync. Check logs or re-link accounts.";
      }

      Alert.alert("Sync Status", msg);
      
      // Refresh local data
      fetchAccounts();
      fetchTransactions();

    } catch (error: any) {
      console.error("Error syncing:", error);
      Alert.alert("Error", error.message || "Failed to sync accounts");
    } finally {
      setSyncing(false);
      setSyncingInvestments(false);
    }
  };

  const handleRemoveAccount = async (accountId: number) => {
    try {
      const data = await authenticatedFetch(
        `/api/plaid/accounts/delete/${accountId}?clerkId=${userId}`,
        {
          method: "DELETE",
        }
      );

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

  if (!userId || !user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Text className="text-lg text-gray-600 text-center">
          Please sign in to connect your bank accounts
        </Text>
      </SafeAreaView>
    );
  }

  const renderTransactionsTab = () => (
    <>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Transactions
        </Text>
        <Text className="text-gray-600 mb-4">
          Sync and manually classify your transactions
        </Text>

        <TouchableOpacity
          onPress={handleSync}
          disabled={syncing}
          className={`bg-green-600 rounded-xl px-4 py-3 mb-4 ${syncing ? "opacity-50" : ""}`}
        >
          {syncing ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold ml-2">Syncing...</Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-center">
              Sync Transactions
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={["#2563eb"]}
          />
        }
      >
        <View className="px-6">
          <Text className="text-xl font-bold text-gray-900 mb-3">
            Recent Transactions
          </Text>

          {loading && !refreshing ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-600 mt-2">
                Loading transactions...
              </Text>
            </View>
          ) : transactions.length === 0 ? (
            <View className="py-20 items-center">
              <Text className="text-gray-500 text-center">
                No transactions found.{"\n"}Connect your bank account and sync
                to see transactions.
              </Text>
            </View>
          ) : (
            <View>
              {transactions.map((transaction) => (
                <PlaidTransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onApprove={handleApproveTransaction}
                  onEdit={handleManualEdit}
                  showActions={true}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );

  const renderAccountsTab = () => (
    <>
      <View className="px-6 pt-4 pb-2">
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 mb-1">
            Accounts
          </Text>
          <Text className="text-gray-600">
            Manage your connected accounts
          </Text>
        </View>

        <View className="flex-row items-center justify-between mb-6 gap-3">
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncingInvestments}
            className={`flex-1 bg-green-600 rounded-xl py-3 items-center justify-center ${syncingInvestments ? "opacity-50" : ""}`}
          >
            {syncingInvestments ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-sm">
                ↻ Sync
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={ready ? openLink : getLinkToken}
            disabled={loadingPlaid || exchanging}
            className={`flex-1 bg-blue-600 rounded-xl py-3 items-center justify-center ${loadingPlaid || exchanging ? "opacity-50" : ""}`}
          >
            {loadingPlaid || exchanging ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-sm">
                + Add Account
              </Text>
            )}
          </TouchableOpacity>
        </View>

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

      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={["#2563eb"]}
          />
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

            <View className="bg-yellow-50 rounded-xl p-6 mx-6">
              <Text className="text-center text-lg font-semibold text-yellow-900 mb-3">
                Click the add account button to connect your bank accounts
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
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Tab Switcher */}
      <View className="px-6 pt-4">
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("transactions")}
            className={`flex-1 py-3 rounded-lg ${activeTab === "transactions" ? "bg-teal-600" : "bg-transparent"}`}
          >
            <Text
              className={`text-center font-semibold ${activeTab === "transactions" ? "text-white" : "text-gray-600"}`}
            >
              Transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("accounts")}
            className={`flex-1 py-3 rounded-lg ${activeTab === "accounts" ? "bg-teal-600" : "bg-transparent"}`}
          >
            <Text
              className={`text-center font-semibold ${activeTab === "accounts" ? "text-white" : "text-gray-600"}`}
            >
              Accounts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "transactions"
        ? renderTransactionsTab()
        : renderAccountsTab()}
    </SafeAreaView>
  );
}
