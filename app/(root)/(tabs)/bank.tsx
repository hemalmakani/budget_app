import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { getApiUrl } from "@/lib/config";
import PlaidTransactionCard from "@/components/PlaidTransactionCard";
import ClassifiedTransactionCard from "@/components/ClassifiedTransactionCard";
import type { PlaidTransaction } from "@/types/plaid";
import {
  isFoundationModelsEnabled,
  AppleLLMSession,
} from "react-native-apple-llm";
import { useBudgetStore, useTransactionStore } from "@/store";

export default function Bank() {
  const { userId } = useAuth();
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchTransactions = async () => {
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
    }
  };

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
          await new Promise((resolve) => setTimeout(resolve, 500));
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
    const transaction = pendingApproval.find((t) => t.id === transactionId);
    if (!transaction) return;

    const category =
      transaction.editable_category || transaction.classified_category;
    const budget = budgets.find((b) => b.category === category);

    if (!budget) {
      Alert.alert("Error", "Budget category not found");
      return;
    }

    try {
      // Add to transactions table
      await addTransaction({
        name: transaction.merchant_name || transaction.name,
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

      // Remove from pending approval
      setPendingApproval((prev) => prev.filter((t) => t.id !== transactionId));

      // Also remove from the transactions list since it's now synced
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));

      Alert.alert("Success", "Transaction added to your budget!");
    } catch (error) {
      console.error("Error approving transaction:", error);
      Alert.alert("Error", "Failed to add transaction");
    }
  };

  const handleEditCategory = (transactionId: string, newCategory: string) => {
    setPendingApproval((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, editable_category: newCategory } : t
      )
    );
  };

  const handleConnectToPlaid = () => {
    // Navigate to the plaid tab/screen
    router.push("/(root)/(tabs)/plaid");
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

  if (!userId) {
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
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Bank Accounts
        </Text>
        <Text className="text-gray-600 mb-4">
          Connect your bank accounts to get started
        </Text>

        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={handleConnectToPlaid}
            className="flex-1 bg-blue-600 rounded-xl px-4 py-3"
          >
            <Text className="text-white font-semibold text-center">
              Connect to Plaid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSyncTransactions}
            disabled={syncing}
            className={`flex-1 bg-green-600 rounded-xl px-4 py-3 ${syncing ? "opacity-50" : ""}`}
          >
            {syncing ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold ml-2">
                  Syncing...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-center">Sync</Text>
            )}
          </TouchableOpacity>
        </View>

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

        <View className="bg-blue-50 rounded-xl p-3 mb-4">
          <Text className="text-blue-900 text-sm text-center">
            💡 Tip: Sync your transactions, then use Apple Intelligence to
            automatically classify them into your budget categories
          </Text>
        </View>

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

          {loading ? (
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
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
