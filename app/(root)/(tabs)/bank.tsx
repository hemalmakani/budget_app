
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { getApiUrl } from "@/lib/config";
import PlaidTransactionCard from "@/components/PlaidTransactionCard";
import type { PlaidTransaction } from "@/types/plaid";

export default function Bank() {
  const { userId } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
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
        setTransactions(data.transactions || []);
      } else {
        console.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
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

        <View className="bg-blue-50 rounded-xl p-3 mb-4">
          <Text className="text-blue-900 text-sm text-center">
            💡 Tip: Sync your transactions to get the latest data from all your
            connected bank accounts
          </Text>
        </View>
      </View>

      <View className="flex-1 px-6">
        <Text className="text-xl font-bold text-gray-900 mb-3">
          Recent Transactions
        </Text>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 mt-2">Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-center">
              No transactions found.{"\n"}Connect your bank account and sync to
              see transactions.
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlaidTransactionCard transaction={item} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-4"
          />
        )}
      </View>
    </SafeAreaView>
  );
}
