import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { getApiUrl } from "@/lib/config";

interface PlaidAccount {
  id: number;
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  current_balance: number;
  available_balance: number;
  credit_limit: number;
  official_name: string;
  institution_name: string;
  is_active: boolean;
  last_balance_update: string;
}

interface PlaidTransaction {
  id: string;
  account_id: number;
  name: string;
  amount: number;
  date: string;
  category: string;
  subcategory: string;
  transaction_type: string;
  pending: boolean;
  merchant_name: string;
  iso_currency_code: string;
  transaction_id: string;
}

interface BankData {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
}

export default function Bank() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const fetchBankData = async (showLoading = true) => {
    if (!userId) return;

    try {
      if (showLoading) setIsLoading(true);

      // Fetch accounts
      const accountsResponse = await fetch(
        getApiUrl(`/api/plaid/accounts?clerkId=${userId}`)
      );

      let accounts = [];
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        console.log(
          "=== ACCOUNTS API RESPONSE ===",
          JSON.stringify(accountsData, null, 2)
        );
        accounts = accountsData.accounts || [];
        console.log("=== EXTRACTED ACCOUNTS ===", accounts);
        console.log("=== ACCOUNTS LENGTH ===", accounts.length);
      } else {
        const errorText = await accountsResponse.text();
        console.error(
          "Accounts API error:",
          accountsResponse.status,
          errorText
        );
      }

      // Fetch transactions
      const transactionsResponse = await fetch(
        getApiUrl(`/api/plaid/transactions?clerkId=${userId}`)
      );

      let transactions = [];
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        console.log("Transactions API response:", transactionsData);
        transactions = transactionsData.transactions || [];
      } else {
        console.error(
          "Transactions API error:",
          transactionsResponse.status,
          await transactionsResponse.text()
        );
      }

      setBankData({ accounts, transactions });
    } catch (error: any) {
      console.error("Error fetching bank data:", error);
      Alert.alert("Error", "Failed to fetch bank data");
    } finally {
      if (showLoading) setIsLoading(false);
      setRefreshing(false);
    }
  };

  const syncTransactions = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl("/api/plaid/transactions-sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: userId }),
      });

      if (response.ok) {
        Alert.alert("Success", "Transactions synced successfully!");
        await fetchBankData(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync transactions");
      }
    } catch (error: any) {
      console.error("Error syncing transactions:", error);
      Alert.alert("Error", error.message || "Failed to sync transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const debugData = async () => {
    if (!userId) return;

    try {
      const response = await fetch(
        getApiUrl(`/api/plaid/debug?clerkId=${userId}`)
      );
      const data = await response.json();
      console.log("=== DEBUG DATA ===", data);
      Alert.alert(
        "Debug",
        `Check console for debug data. Found ${data.counts?.transactions} transactions`
      );
    } catch (error: any) {
      console.error("Debug error:", error);
      Alert.alert("Error", "Debug failed");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBankData(false);
  };

  useEffect(() => {
    fetchBankData();
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAccountsByInstitution = () => {
    if (!bankData?.accounts) return {};

    return bankData.accounts.reduce(
      (acc, account) => {
        const institution = account.institution_name || "Unknown Bank";
        if (!acc[institution]) {
          acc[institution] = [];
        }
        acc[institution].push(account);
        return acc;
      },
      {} as Record<string, PlaidAccount[]>
    );
  };

  const getFilteredTransactions = () => {
    if (!bankData?.transactions) return [];

    if (selectedAccount) {
      return bankData.transactions.filter(
        (t) => t.account_id.toString() === selectedAccount
      );
    }

    return bankData.transactions;
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-6">
        <Text className="text-lg text-gray-600 text-center">
          Please sign in to view your bank accounts
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoading && !bankData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 mt-4">
          Loading your bank accounts...
        </Text>
      </SafeAreaView>
    );
  }

  const accountsByInstitution = getAccountsByInstitution();
  const filteredTransactions = getFilteredTransactions();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-3xl font-bold text-gray-900">
                Bank Accounts
              </Text>
              <Text className="text-gray-600">
                Connected accounts and transactions
              </Text>
            </View>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={debugData}
                className="bg-purple-600 rounded-xl px-4 py-2"
              >
                <Text className="text-white font-semibold">Debug</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={syncTransactions}
                disabled={isLoading}
                className={`bg-green-600 rounded-xl px-4 py-2 ${isLoading ? "opacity-50" : ""}`}
              >
                <Text className="text-white font-semibold">
                  {isLoading ? "Syncing..." : "Sync"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Filter */}
          {bankData?.accounts && bankData.accounts.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Filter by Account
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  onPress={() => setSelectedAccount(null)}
                  className={`mr-3 px-4 py-2 rounded-xl ${
                    selectedAccount === null ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedAccount === null ? "text-white" : "text-gray-700"
                    }`}
                  >
                    All Accounts
                  </Text>
                </TouchableOpacity>
                {bankData.accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => setSelectedAccount(account.id.toString())}
                    className={`mr-3 px-4 py-2 rounded-xl ${
                      selectedAccount === account.id.toString()
                        ? "bg-blue-600"
                        : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        selectedAccount === account.id.toString()
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {account.name} (••{account.mask})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bank Accounts by Institution */}
          {Object.keys(accountsByInstitution).length > 0 ? (
            Object.entries(accountsByInstitution).map(
              ([institution, accounts]) => (
                <View key={institution} className="mb-6">
                  <Text className="text-xl font-bold text-gray-900 mb-4">
                    {institution}
                  </Text>
                  {accounts.map((account) => (
                    <View
                      key={account.id}
                      className="bg-white rounded-xl p-6 mb-4 shadow-sm"
                    >
                      <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-gray-900">
                            {account.name}
                          </Text>
                          <Text className="text-gray-600 capitalize">
                            {account.subtype} • ••{account.mask}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-2xl font-bold text-gray-900">
                            {formatCurrency(account.current_balance)}
                          </Text>
                          {account.available_balance !== null && (
                            <Text className="text-sm text-gray-600">
                              Available:{" "}
                              {formatCurrency(account.available_balance)}
                            </Text>
                          )}
                        </View>
                      </View>

                      {account.credit_limit && (
                        <View className="border-t border-gray-200 pt-3">
                          <Text className="text-sm text-gray-600">
                            Credit Limit: {formatCurrency(account.credit_limit)}
                          </Text>
                        </View>
                      )}

                      <View className="border-t border-gray-200 pt-3 mt-3">
                        <Text className="text-xs text-gray-500">
                          Last updated:{" "}
                          {formatDate(account.last_balance_update)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )
            )
          ) : (
            <View className="bg-yellow-50 rounded-xl p-6 mb-6">
              <Text className="text-lg font-semibold text-yellow-900 mb-2">
                No Bank Accounts Connected
              </Text>
              <Text className="text-yellow-800 mb-4">
                Connect your bank accounts through the Plaid tab to see your
                accounts and transactions here.
              </Text>
            </View>
          )}

          {/* Transactions Section */}
          <View className="mt-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Recent Transactions
              {selectedAccount && (
                <Text className="text-base font-normal text-gray-600">
                  {" "}
                  • Filtered Account
                </Text>
              )}
            </Text>

            {filteredTransactions.length > 0 ? (
              filteredTransactions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 20)
                .map((transaction) => (
                  <View
                    key={transaction.id}
                    className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900">
                          {transaction.merchant_name || transaction.name}
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          {transaction.category}
                          {transaction.subcategory &&
                            ` • ${transaction.subcategory}`}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          {formatDate(transaction.date)}
                          {transaction.pending && (
                            <Text className="text-orange-600"> • Pending</Text>
                          )}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-lg font-bold ${
                            transaction.amount > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {transaction.amount > 0 ? "-" : "+"}
                          {formatCurrency(transaction.amount)}
                        </Text>
                        <Text className="text-xs text-gray-500 uppercase">
                          {transaction.transaction_type}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
            ) : (
              <View className="bg-gray-100 rounded-xl p-6">
                <Text className="text-gray-600 text-center">
                  {selectedAccount
                    ? "No transactions found for this account"
                    : "No transactions found. Sync your accounts to see transactions."}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
