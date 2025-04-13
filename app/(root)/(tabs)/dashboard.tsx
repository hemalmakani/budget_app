import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { useUser } from "@clerk/clerk-expo";
import TransactionCard from "@/components/TransactionCard";
import { useTransactionStore } from "@/store";
import { APITransaction } from "@/types/type";
import { useDataStore } from "@/store/dataStore";

const Dashboard = () => {
  const { user } = useUser();
  const { transactions, setTransactions, deleteTransaction } =
    useTransactionStore();
  const [selectedDate, setSelectedDate] = useState("");
  const [displayCount, setDisplayCount] = useState(6);
  const isLoading = useDataStore((state) => state.isLoading);
  const hasInitialDataLoaded = useDataStore(
    (state) => state.hasInitialDataLoaded
  );

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

  if (isLoading && !hasInitialDataLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-200">
      <View className="px-4 mb-6">
        <Text className="text-2xl font-semibold text-gray-800 mb-4">
          Transactions Calendar
        </Text>
        <View className="rounded-3xl overflow-hidden bg-white shadow-sm">
          <Calendar
            onDayPress={(day: DateData) => {
              setSelectedDate(day.dateString);
              setDisplayCount(6);
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
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.transaction_id}
        renderItem={({ item }) => (
          <TransactionCard transaction={item} onDelete={deleteTransaction} />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </SafeAreaView>
  );
};

export default Dashboard;
