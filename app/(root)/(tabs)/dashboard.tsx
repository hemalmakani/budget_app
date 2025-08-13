"use client";

import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, type DateData } from "react-native-calendars";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import TransactionCard from "@/components/TransactionCard";
import IncomeCard from "@/components/IncomeCard";
import { PlaidLinkComponent } from "@/components/PlaidLink";
import { TransactionSync } from "@/components/TransactionSync";
import { AccountsOverview } from "@/components/AccountsOverview";
import { useTransactionStore, useIncomeStore } from "@/store";
import { useDataStore } from "@/store/dataStore";

const Dashboard = () => {
  const { user } = useUser();
  const { transactions, setTransactions, deleteTransaction } =
    useTransactionStore();
  const { incomes, fetchIncomes, deleteIncome } = useIncomeStore();
  const [selectedDate, setSelectedDate] = useState("");
  const [displayCount, setDisplayCount] = useState(10); // Increased from 6 to 10
  const [showCalendar, setShowCalendar] = useState(true);
  const [showTransactions, setShowTransactions] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [hasPlaidConnection, setHasPlaidConnection] = useState(false);
  const [showPlaidSection, setShowPlaidSection] = useState(true);
  const isLoading = useDataStore((state) => state.isLoading);
  const hasInitialDataLoaded = useDataStore(
    (state) => state.hasInitialDataLoaded
  );
  const setTotalIncome = useDataStore((state) => state.setTotalIncome);
  const screenHeight = Dimensions.get("window").height;

  // Fetch incomes when user is available
  useEffect(() => {
    if (user?.id) {
      fetchIncomes(user.id);
      checkConnectedAccounts();
    }
  }, [user?.id, fetchIncomes]);

  // Check if user has connected Plaid accounts
  const checkConnectedAccounts = async () => {
    try {
      if (!user?.id) return;

      const response = await fetch(
        `https://budget-app-hemalmakani-hemalmakanis-projects.vercel.app/api/plaid/accounts?clerkId=${user.id}`
      );
      const data = await response.json();

      if (response.ok && data.accounts?.length > 0) {
        setConnectedAccounts(data.accounts);
        setHasPlaidConnection(true);
      }
    } catch (error) {
      console.error("Error checking connected accounts:", error);
    }
  };

  const markedDates = useMemo(() => {
    const dates: { [key: string]: { marked: boolean } } = {};
    transactions.forEach((transaction) => {
      const date = transaction.created_at.split("T")[0];
      dates[date] = { marked: true };
    });
    incomes.forEach((income) => {
      const date = income.received_on.split("T")[0];
      dates[date] = { marked: true };
    });
    return dates;
  }, [transactions, incomes]);

  const filteredTransactions = useMemo(() => {
    if (selectedDate) {
      return transactions
        .filter((transaction) =>
          transaction.created_at.startsWith(selectedDate)
        )
        .slice(0, displayCount);
    } else {
      // If no date selected, show most recent transactions
      return [...transactions]
        .sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        })
        .slice(0, displayCount);
    }
  }, [transactions, selectedDate, displayCount]);

  const filteredIncomes = useMemo(() => {
    if (selectedDate) {
      return incomes
        .filter((income) => income.received_on.startsWith(selectedDate))
        .slice(0, displayCount);
    } else {
      // If no date selected, show most recent incomes
      return [...incomes]
        .sort((a, b) => {
          return (
            new Date(b.received_on).getTime() -
            new Date(a.received_on).getTime()
          );
        })
        .slice(0, displayCount);
    }
  }, [incomes, selectedDate, displayCount]);

  const handleLoadMore = () => {
    const filteredTransactionCount = selectedDate
      ? transactions.filter((transaction) =>
          transaction.created_at.startsWith(selectedDate)
        ).length
      : transactions.length;

    const filteredIncomeCount = selectedDate
      ? incomes.filter((income) => income.received_on.startsWith(selectedDate))
          .length
      : incomes.length;

    const totalCount = filteredTransactionCount + filteredIncomeCount;
    if (displayCount < totalCount) {
      setDisplayCount((prev) => prev + 10);
    }
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  const toggleView = () => {
    setShowTransactions(!showTransactions);
  };

  const handleDeleteIncome = (incomeId: string) => {
    if (user?.id) {
      deleteIncome(incomeId, user.id, setTotalIncome);
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
      <View className="px-4 mb-2">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xl font-semibold text-gray-800">
            {showTransactions ? "Transactions" : "Income"}
          </Text>
          <View className="flex-row">
            <TouchableOpacity onPress={toggleView} className="p-2 mr-2">
              <Ionicons
                name={showTransactions ? "cash-outline" : "receipt-outline"}
                size={22}
                color="#14B8A6"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleCalendar} className="p-2">
              <Ionicons
                name={showCalendar ? "calendar" : "calendar-outline"}
                size={22}
                color="#007AFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {showCalendar && (
          <View className="rounded-xl overflow-hidden bg-white shadow-sm mb-2">
            <Calendar
              onDayPress={(day: DateData) => {
                setSelectedDate(day.dateString);
                setDisplayCount(10);
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
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
                dayTextColor: "#2d4150",
                monthTextColor: "#2d4150",
              }}
              style={{
                borderWidth: 1,
                borderColor: "rgba(0, 0, 0, 0.1)",
                height: screenHeight * 0.35, // Make calendar height responsive
              }}
            />
          </View>
        )}

        {/* Plaid Bank Connection Section */}
        {showPlaidSection && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-gray-900">
                Bank Accounts
              </Text>
              <TouchableOpacity
                onPress={() => setShowPlaidSection(!showPlaidSection)}
                className="p-1"
              >
                <Ionicons
                  name={showPlaidSection ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#007AFF"
                />
              </TouchableOpacity>
            </View>

            {hasPlaidConnection ? (
              <View>
                <AccountsOverview clerkId={user?.id || ""} />
                <TransactionSync
                  onSyncComplete={(summary) => {
                    console.log("Sync completed:", summary);
                    // Refresh transactions data here if needed
                  }}
                />
              </View>
            ) : (
              <View>
                <Text className="text-sm text-gray-600 mb-3">
                  Connect your bank accounts to automatically import
                  transactions and track spending
                </Text>
                <PlaidLinkComponent
                  onSuccess={(accounts) => {
                    setConnectedAccounts(accounts);
                    setHasPlaidConnection(true);
                    checkConnectedAccounts();
                  }}
                  buttonText="Connect Bank Account"
                  variant="primary"
                  size="medium"
                />
              </View>
            )}
          </View>
        )}

        {selectedDate ? (
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-medium text-gray-600">
              {new Date(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            {selectedDate && (
              <TouchableOpacity
                onPress={() => setSelectedDate("")}
                className="p-1"
              >
                <Text className="text-sm text-blue-500">Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text className="text-sm font-medium text-gray-600 mb-2">
            {showTransactions ? "Recent Transactions" : "Recent Income"}
          </Text>
        )}
      </View>

      {showTransactions ? (
        filteredTransactions.length > 0 ? (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.transaction_id}
            renderItem={({ item }) => (
              <TransactionCard
                transaction={item}
                onDelete={deleteTransaction}
              />
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 120,
            }}
          />
        ) : (
          <View className="flex-1 justify-center items-center px-4">
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-center mt-4">
              {selectedDate
                ? "No transactions found for this date"
                : "No recent transactions found"}
            </Text>
          </View>
        )
      ) : filteredIncomes.length > 0 ? (
        <FlatList
          data={filteredIncomes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IncomeCard income={item} onDelete={handleDeleteIncome} />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="cash-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-500 text-center mt-4">
            {selectedDate
              ? "No income found for this date"
              : "No recent income found"}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Dashboard;
