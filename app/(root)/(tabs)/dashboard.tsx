import { useUser } from "@clerk/clerk-expo";
import { Text, View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TransactionCard from "@/components/TransactionCard";
import { useTransactionStore } from "@/store";
import { useEffect } from "react";
import { useFetch } from "@/lib/fetch";
import { Transaction } from "@/types/type";

const Dashboard = () => {
  const { user } = useUser();

  const { transactions, setTransactions, deleteTransaction } =
    useTransactionStore();
  const {
    data: response,
    loading,
    error,
  } = useFetch<{ data: Transaction[] }>(
    `/(api)/transactions/transactionFetch/${user?.id}`
  );
  useEffect(() => {
    if (response) {
      setTransactions(response);
    }
  }, [response]);
  const handleDelete = async (transaction_id: string) => {
    try {
      console.log("Delete transaction ID:", transaction_id);
      await deleteTransaction(transaction_id);
    } catch (err) {
      // Error is already handled in the store
      console.error("Delete operation failed:", err);
    }
  };
  return (
    <SafeAreaView className="mb-6 px-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-semibold text-gray-800">
          Transactions
        </Text>
      </View>
      <FlatList
        data={transactions}
        renderItem={({ item }) => (
          <TransactionCard
            key={item.transaction_id} // Add this line
            transaction={item}
            onDelete={handleDelete}
          />
        )}
        keyExtractor={(item) => item.transaction_id} // Convert to string if needed
        scrollEnabled={false}
      />
    </SafeAreaView>
  );
};

export default Dashboard;
