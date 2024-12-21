import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { useUser } from "@clerk/clerk-expo";
import TransactionCard from "@/components/TransactionCard";
import { useTransactionStore } from "@/store";
import { useFetch } from "@/lib/fetch";
import { Transaction } from "@/types/type";

const Dashboard = () => {
  const { user } = useUser();
  const { transactions, setTransactions, deleteTransaction } =
    useTransactionStore();
  const [selectedDate, setSelectedDate] = useState("");
  const [displayCount, setDisplayCount] = useState(6);

  const {
    data: response,
    loading,
    error,
  } = useFetch<Transaction[]>(
    `/(api)/transactions/transactionFetch/${user?.id}`
  );

  useEffect(() => {
    if (response) {
      setTransactions(response);
      setDisplayCount(6); // Reset display count when new data is loaded
    }
  }, [response]);

  const handleDelete = async (transaction_id: string) => {
    try {
      console.log("Delete transaction ID:", transaction_id);
      await deleteTransaction(transaction_id);
    } catch (err) {
      console.error("Delete operation failed:", err);
    }
  };

  const markedDates = useMemo(() => {
    const dates: { [key: string]: { marked: boolean } } = {};
    transactions.forEach((transaction) => {
      const date = transaction.created_at.split("T")[0];
      dates[date] = { marked: true };
    });
    return dates;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) =>
      transaction.created_at.startsWith(selectedDate)
    );
    return filtered.slice(0, displayCount);
  }, [transactions, selectedDate, displayCount]);

  const handleLoadMore = () => {
    const filtered = transactions.filter((transaction) =>
      transaction.created_at.startsWith(selectedDate)
    );
    if (displayCount < filtered.length) {
      setDisplayCount((prev) => prev + 6);
    }
  };

  return (
    <SafeAreaView className="flex-1 mb-6 px-4 bg-gray-200">
      <Text className="text-2xl font-semibold text-gray-800 mb-4">
        Transactions Calendar
      </Text>
      <View className="rounded-3xl overflow-hidden bg-white shadow-lg">
        <Calendar
          onDayPress={(day: DateData) => {
            setSelectedDate(day.dateString);
            setDisplayCount(6); // Reset display count when new date is selected
          }}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              selected: true,
              marked: markedDates[selectedDate]?.marked,
            },
          }}
          theme={{
            selectedDayBackgroundColor: "#007AFF",
            todayTextColor: "#007AFF",
            dotColor: "#007AFF",
            calendarBackground: "transparent",
            textDayFontFamily: "System",
            textMonthFontFamily: "System",
            textDayHeaderFontFamily: "System",
            textDayFontWeight: "400",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "300",
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
          style={{
            borderWidth: 1,
            borderColor: "rgba(0, 0, 0, 0.1)",
            borderRadius: 24,
          }}
        />
      </View>
      <View className="mt-4">
        <Text className="text-lg font-semibold mb-2">
          {selectedDate
            ? `Transactions for ${selectedDate}`
            : "Select a date to view transactions"}
        </Text>

        <View className="h-[360px]">
          <FlatList
            data={filteredTransactions}
            renderItem={({ item }) => (
              <TransactionCard transaction={item} onDelete={handleDelete} />
            )}
            keyExtractor={(item) => item.transaction_id}
            ListEmptyComponent={() => (
              <Text className="text-center text-gray-500">
                No transactions for this date
              </Text>
            )}
            showsVerticalScrollIndicator={true}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            initialNumToRender={6}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Dashboard;
