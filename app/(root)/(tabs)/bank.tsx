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
import { getApiUrl } from "@/lib/config";
import PlaidTransactionCard from "@/components/PlaidTransactionCard";
import ClassifiedTransactionCard from "@/components/ClassifiedTransactionCard";
import AccountCard from "@/components/AccountCard";
import type { PlaidTransaction, PlaidAccount } from "@/types/plaid";
import {
  isFoundationModelsEnabled,
  AppleLLMSession,
} from "react-native-apple-llm";
import { useBudgetStore, useTransactionStore } from "@/store";
import { create, open } from "react-native-plaid-link-sdk";

type TabType = "transactions" | "accounts";

export default function Bank() {
  const { userId } = useAuth();
  const { user } = useUser();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("transactions");

  // Transaction states
  const [syncing, setSyncing] = useState(false);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState({
    current: 0,
    total: 0,
  });
  const [llmAvailable, setLlmAvailable] = useState<boolean>(false);
  const [pendingApproval, setPendingApproval] = useState<PlaidTransaction[]>(
    []
  );

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

  const budgets = useBudgetStore((state) => state.budgets);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const checkLLMAvailability = async () => {
    try {
      const status = await isFoundationModelsEnabled();
      const isAvailable = status === "available";
      setLlmAvailable(isAvailable);
      console.log(
        "Apple Intelligence status:",
        status,
        "Available:",
        isAvailable
      );
    } catch (error) {
      console.error("Error checking LLM availability:", error);
      setLlmAvailable(false);
    }
  };

  useEffect(() => {
    checkLLMAvailability();
  }, []);

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
      const response = await fetch(
        getApiUrl(`/api/plaid/transactions?clerkId=${userId}`)
      );

      if (response.ok) {
        const data = await response.json();
        const fetchedTransactions = data.transactions || [];
        setTransactions(fetchedTransactions);

        // Note: Automatic classification disabled to prevent crashes
        // User can manually click the classify button when ready
      } else {
        console.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const classifyTransactions = async (
    transactionsToClassify: PlaidTransaction[]
  ) => {
    if (!llmAvailable) {
      Alert.alert(
        "Not Available",
        "Apple Intelligence is not available on this device."
      );
      return;
    }

    if (budgets.length === 0) {
      Alert.alert(
        "No Categories",
        "Please create budget categories first to classify transactions."
      );
      return;
    }

    try {
      setClassifying(true);
      setClassifyProgress({
        current: 0,
        total: transactionsToClassify.length,
      });

      const budgetCategories = budgets
        .map((b) => b.category)
        .filter((cat) => cat)
        .join(", ");

      const classifiedTransactions: PlaidTransaction[] = [];

      // Process transactions sequentially to avoid overwhelming the system
      for (let i = 0; i < transactionsToClassify.length; i++) {
        const transaction = transactionsToClassify[i];
        setClassifyProgress({
          current: i + 1,
          total: transactionsToClassify.length,
        });

        try {
          // Create a new session for each transaction
          const session = new AppleLLMSession();
          await session.configure({
            instructions:
              "You are a financial transaction classifier. You will classify transactions into budget categories based on the transaction name, merchant, and amount. Always respond with ONLY the category name that best matches, nothing else.",
          });

          const merchantName = transaction.merchant_name || transaction.name;
          const amount = Math.abs(transaction.amount).toFixed(2);

          const prompt = `Given these budget categories: ${budgetCategories}

Classify this transaction into ONE of these categories. Respond with ONLY the category name.

Transaction:
- Merchant: ${merchantName}
- Amount: $${amount}
- Date: ${transaction.date}

Which category does this belong to?`;

          const response = await session.generateText({
            prompt: prompt,
          });

          // Clean up session immediately after use
          session.dispose();

          // Extract the category from the response
          const classifiedCategory = response
            .trim()
            .replace(/[.,;:!?]$/, "")
            .replace(/^["']|["']$/g, "");

          // Validate that the category exists in our budget categories
          const matchedCategory = budgets.find(
            (b) => b.category.toLowerCase() === classifiedCategory.toLowerCase()
          )?.category;

          classifiedTransactions.push({
            ...transaction,
            classified_category: matchedCategory || classifiedCategory,
          });

          console.log(
            `Classified ${i + 1}/${transactionsToClassify.length}: ${merchantName} → ${matchedCategory || classifiedCategory}`
          );

          // Small delay between classifications to prevent overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(
            `Error classifying transaction ${transaction.id}:`,
            error
          );
          classifiedTransactions.push({
            ...transaction,
            classified_category: "Uncategorized",
          });
        }
      }

      setTransactions(classifiedTransactions);
      setPendingApproval(classifiedTransactions);
      Alert.alert(
        "Success",
        `Classified ${classifiedTransactions.length} transactions! Review and approve them below.`
      );
    } catch (error: any) {
      console.error("Error classifying transactions:", error);
      Alert.alert("Error", error.message || "Failed to classify transactions");
    } finally {
      setClassifying(false);
      setClassifyProgress({ current: 0, total: 0 });
    }
  };

  const handleClassifyTransactions = async () => {
    if (transactions.length === 0) {
      Alert.alert("No Transactions", "Please sync transactions first.");
      return;
    }
    await classifyTransactions(transactions);
  };

  const handleApproveTransaction = async (transactionId: string) => {
    // Check both pending approval and regular transactions list
    const transaction =
      pendingApproval.find((t) => t.id === transactionId) ||
      transactions.find((t) => t.id === transactionId);

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
      await fetch(getApiUrl("/api/plaid/mark-synced"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.transaction_id,
          clerkId: userId,
        }),
      });

      // Remove from both lists
      setPendingApproval((prev) => prev.filter((t) => t.id !== transactionId));

      // Also remove from the transactions list since it's now synced
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));

      Alert.alert("Success", "Transaction added to your budget!");
    } catch (error) {
      console.error("Error approving transaction:", error);
      Alert.alert("Error", "Failed to add transaction");
    }
  };

  const handleEditCategory = (
    transactionId: string,
    newName: string,
    newCategory: string
  ) => {
    setPendingApproval((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? { ...t, editable_name: newName, editable_category: newCategory }
          : t
      )
    );
  };

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

  const handleAddAllTransactions = async () => {
    // Get all transactions that have categories (from AI or manual edit)
    const classifiedTransactions = [
      ...pendingApproval,
      ...transactions.filter(
        (t) => t.editable_category || t.classified_category
      ),
    ];

    if (classifiedTransactions.length === 0) {
      Alert.alert("No Transactions", "No classified transactions to add.");
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const transaction of classifiedTransactions) {
        const category =
          transaction.editable_category || transaction.classified_category;
        const transactionName =
          transaction.editable_name ||
          transaction.merchant_name ||
          transaction.name;

        if (!category) continue;

        const budget = budgets.find((b) => b.category === category);
        if (!budget) {
          failCount++;
          continue;
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
          await fetch(getApiUrl("/api/plaid/mark-synced"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: transaction.transaction_id,
              clerkId: userId,
            }),
          });

          successCount++;
        } catch (error) {
          console.error(`Error adding transaction ${transaction.id}:`, error);
          failCount++;
        }
      }

      // Clear all lists
      setPendingApproval([]);
      setTransactions([]);

      if (failCount > 0) {
        Alert.alert(
          "Partially Complete",
          `Successfully added ${successCount} transaction${successCount !== 1 ? "s" : ""}. ${failCount} failed.`
        );
      } else {
        Alert.alert(
          "Success",
          `Successfully added all ${successCount} transaction${successCount !== 1 ? "s" : ""} to your budget!`
        );
      }

      // Refresh transactions
      fetchTransactions();
    } catch (error) {
      console.error("Error adding all transactions:", error);
      Alert.alert("Error", "Failed to add transactions");
    }
  };

  // Account-related functions from plaid.tsx
  const fetchAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      setFetchingAccounts(true);
      const resp = await fetch(
        getApiUrl(`/api/plaid/fetch-accounts?clerkId=${userId}`),
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
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
      setLoadingPlaid(false);
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

  const handleSyncTransactions = async () => {
    if (!userId) {
      Alert.alert("Error", "Please sign in to sync transactions");
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch(getApiUrl("/api/plaid/transactions-sync"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success",
          "Transactions synced successfully! Check your bank accounts for updates."
        );
        fetchTransactions();
      } else {
        throw new Error(data.error || "Failed to sync transactions");
      }
    } catch (error: any) {
      console.error("Error syncing transactions:", error);
      Alert.alert("Error", error.message || "Failed to sync transactions");
    } finally {
      setSyncing(false);
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
          Sync and classify your transactions
        </Text>

        <TouchableOpacity
          onPress={handleSyncTransactions}
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

        {llmAvailable && transactions.length > 0 && (
          <TouchableOpacity
            onPress={handleClassifyTransactions}
            disabled={classifying}
            className={`bg-purple-600 rounded-xl px-4 py-3 mb-4 ${classifying ? "opacity-50" : ""}`}
          >
            {classifying ? (
              <View className="flex-col items-center justify-center">
                <View className="flex-row items-center mb-1">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Classifying with AI...
                  </Text>
                </View>
                {classifyProgress.total > 0 && (
                  <Text className="text-white text-xs">
                    {classifyProgress.current} / {classifyProgress.total}
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-white font-semibold text-center">
                🤖 Classify Transactions with Apple Intelligence
              </Text>
            )}
          </TouchableOpacity>
        )}

        {(pendingApproval.length > 0 ||
          transactions.some(
            (t) => t.editable_category || t.classified_category
          )) && (
          <TouchableOpacity
            onPress={handleAddAllTransactions}
            className="bg-green-600 rounded-xl px-4 py-3 mb-4"
          >
            <Text className="text-white font-semibold text-center">
              ✓ Add All Classified Transactions
            </Text>
          </TouchableOpacity>
        )}

        {llmAvailable === false && (
          <View className="bg-yellow-50 rounded-xl p-3 mb-4">
            <Text className="text-yellow-900 text-sm text-center">
              ⚠️ Apple Intelligence is not available on this device
            </Text>
          </View>
        )}
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
        {pendingApproval.length > 0 && (
          <View className="px-6 mb-4">
            <View className="bg-purple-50 rounded-xl p-4 mb-3">
              <Text className="text-purple-900 font-bold text-base mb-1">
                🤖 Review AI Classifications
              </Text>
              <Text className="text-purple-700 text-sm">
                {pendingApproval.length} transaction
                {pendingApproval.length !== 1 ? "s" : ""} ready for review. Edit
                the category if needed, then tap ✓ to add to your budget.
              </Text>
            </View>

            {pendingApproval.map((transaction) => (
              <ClassifiedTransactionCard
                key={transaction.id}
                transaction={transaction}
                onApprove={handleApproveTransaction}
                onEdit={handleEditCategory}
              />
            ))}
          </View>
        )}

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
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              Accounts
            </Text>
            <Text className="text-gray-600">
              Manage your connected accounts
            </Text>
          </View>
          <TouchableOpacity
            onPress={ready ? openLink : getLinkToken}
            disabled={loadingPlaid || exchanging}
            className={`bg-blue-600 rounded-xl px-4 py-2 ${loadingPlaid || exchanging ? "opacity-50" : ""}`}
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
              <Text className="text-lg font-semibold text-yellow-900 mb-3">
                🧪 Testing with Sandbox
              </Text>
              <Text className="text-yellow-800 text-sm mb-2">
                • Select "Platypus Bank" (Plaid's test bank)
              </Text>
              <Text className="text-yellow-800 text-sm mb-2">
                <Text>• Username: </Text>
                <Text className="font-mono font-bold">user_good</Text>
              </Text>
              <Text className="text-yellow-800 text-sm">
                <Text>• Password: </Text>
                <Text className="font-mono font-bold">pass_good</Text>
              </Text>
            </View>
          </View>
        ) : (
          <>
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
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
            className={`flex-1 py-3 rounded-lg ${
              activeTab === "transactions" ? "bg-teal-600" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === "transactions" ? "text-white" : "text-gray-600"
              }`}
            >
              Transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("accounts")}
            className={`flex-1 py-3 rounded-lg ${
              activeTab === "accounts" ? "bg-teal-600" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === "accounts" ? "text-white" : "text-gray-600"
              }`}
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
