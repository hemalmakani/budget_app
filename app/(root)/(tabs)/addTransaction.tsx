"use client";

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Alert,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";
import {
  useBudgetStore,
  useTransactionStore,
  useFixedCostStore,
  useIncomeStore,
} from "@/store/index";
import { router, Stack } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Budget } from "@/types/type";
import CustomDatePicker from "@/components/CustomDatePicker";
import { fetchAPI } from "@/lib/fetch";
import { useDataStore } from "@/store/dataStore";

type TabType = "transaction" | "fixedCost" | "income";
type Frequency = "weekly" | "biweekly" | "monthly";

const AddTransaction = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AddTransactionContent />
    </>
  );
};

const AddTransactionContent = () => {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const { budgets } = useBudgetStore();
  const { addTransaction } = useTransactionStore();
  const { addFixedCost } = useFixedCostStore();
  const { addIncome } = useIncomeStore();
  const { setTotalIncome } = useDataStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("transaction");

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    transactionName: "",
    amount: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<Budget | null>(null);

  // Fixed Cost form state
  const [fixedCostForm, setFixedCostForm] = useState({
    name: "",
    amount: "",
    frequency: "weekly" as Frequency,
  });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedFixedCostCategory, setSelectedFixedCostCategory] =
    useState<Budget | null>(null);

  // Income form state
  const [incomeForm, setIncomeForm] = useState({
    source_name: "",
    amount: "",
    received_on: new Date(),
    recurring: false,
    frequency: "monthly",
  });

  // Modal states
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showIncomeDatePicker, setShowIncomeDatePicker] = useState(false);

  // Date picker temp state
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState<number>(new Date().getMonth());
  const [tempDay, setTempDay] = useState<number>(new Date().getDate());
  const [activeDateField, setActiveDateField] = useState<
    "start" | "end" | null
  >(null);

  useEffect(() => {
    if (
      budgets.length > 0 &&
      !selectedCategory &&
      activeTab === "transaction"
    ) {
      setSelectedCategory(budgets[0]);
    }
  }, [budgets, activeTab]);

  // Initialize temp date values when opening date picker
  useEffect(() => {
    if (activeDateField === "start" && startDate) {
      setTempYear(startDate.getFullYear());
      setTempMonth(startDate.getMonth());
      setTempDay(startDate.getDate());
    } else if (activeDateField === "end" && endDate) {
      setTempYear(endDate.getFullYear());
      setTempMonth(endDate.getMonth());
      setTempDay(endDate.getDate());
    } else if (activeDateField) {
      const today = new Date();
      setTempYear(today.getFullYear());
      setTempMonth(today.getMonth());
      setTempDay(today.getDate());
    }
  }, [activeDateField, startDate, endDate]);

  const openStartDatePicker = () => {
    setActiveDateField("start");
    setShowStartDatePicker(true);
  };

  const openEndDatePicker = () => {
    setActiveDateField("end");
    setShowEndDatePicker(true);
  };

  const confirmDateSelection = () => {
    const newDate = new Date(tempYear, tempMonth, tempDay);

    if (activeDateField === "start") {
      setStartDate(newDate);
      setShowStartDatePicker(false);
    } else if (activeDateField === "end") {
      setEndDate(newDate);
      setShowEndDatePicker(false);
    }

    setActiveDateField(null);
  };

  const cancelDateSelection = () => {
    if (activeDateField === "start") {
      setShowStartDatePicker(false);
    } else if (activeDateField === "end") {
      setShowEndDatePicker(false);
    }

    setActiveDateField(null);
  };

  const getMonthName = (month: number): string => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month];
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  const generateDays = (): number[] => {
    const daysInMonth = getDaysInMonth(tempYear, tempMonth);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleTransactionSubmit = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to add a transaction");
        return;
      }

      setIsLoading(true);

      if (
        !transactionForm.transactionName ||
        !transactionForm.amount ||
        !selectedCategory
      ) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      const amount = parseFloat(transactionForm.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Error", "Please enter a valid positive amount");
        return;
      }

      const transaction = {
        name: transactionForm.transactionName,
        categoryId: selectedCategory.id,
        amount: amount,
        clerk_id: userId,
        category_name: selectedCategory.category,
      };

      const token = await getToken();
      await addTransaction(transaction, token);

      Alert.alert("Success", "Transaction added successfully", [
        {
          text: "OK",
          onPress: () => {
            setTransactionForm({
              transactionName: "",
              amount: "",
            });
            setSelectedCategory(null);
            router.push("/(root)/(tabs)/home");
          },
        },
      ]);
    } catch (error) {
      console.error("Error adding transaction:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to add transaction. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixedCostSubmit = async () => {
    if (!fixedCostForm.name.trim()) {
      Alert.alert("Error", "Please enter a fixed cost name");
      return;
    }
    if (!fixedCostForm.amount) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }
    if (!fixedCostForm.frequency) {
      Alert.alert("Error", "Please select a frequency");
      return;
    }
    setIsLoading(true);
    try {
      const token = await getToken();
      await addFixedCost({
        name: fixedCostForm.name,
        amount: Number.parseFloat(fixedCostForm.amount),
        frequency: fixedCostForm.frequency,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
        category_id: selectedFixedCostCategory?.id || null,
        clerk_id: user?.id || "",
      }, token);

      Alert.alert("Success", "Fixed cost added successfully!", [
        {
          text: "OK",
          onPress: () => {
            setFixedCostForm({ name: "", amount: "", frequency: "weekly" });
            setStartDate(null);
            setEndDate(null);
            setSelectedFixedCostCategory(null);
            router.push("/(root)/(tabs)/home");
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to add fixed cost:", error);
      const errorMessage =
        error instanceof Error
          ? `Failed: ${error.message}`
          : "Failed to add fixed cost. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncomeSubmit = async () => {
    if (!incomeForm.source_name || !incomeForm.amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      setIsLoading(true);

      const token = await getToken();
      await addIncome({
        source_name: incomeForm.source_name,
        amount: parseFloat(incomeForm.amount),
        received_on: incomeForm.received_on.toISOString(),
        recurring: incomeForm.recurring,
        frequency: incomeForm.frequency,
        clerk_id: user.id,
      }, token);
      const totalResponse = await fetchAPI(`/(api)/incomes/total/${user.id}`, undefined, token);
      if (totalResponse.data) {
        setTotalIncome(Number(totalResponse.data.total) || 0);
      }

      Alert.alert("Success", "Income added successfully", [
        {
          text: "OK",
          onPress: () => {
            setIncomeForm({
              source_name: "",
              amount: "",
              received_on: new Date(),
              recurring: false,
              frequency: "monthly",
            });
            router.push("/(root)/(tabs)/home");
          },
        },
      ]);
    } catch (error) {
      console.error("Error adding income:", error);
      Alert.alert("Error", "Failed to add income");
    } finally {
      setIsLoading(false);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "transaction":
        return { title: "Add Transaction", subtitle: "Record a new expense" };
      case "fixedCost":
        return {
          title: "Add Fixed Cost",
          subtitle: "Create a new recurring expense",
        };
      case "income":
        return { title: "Add Income", subtitle: "Record a new income source" };
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "transaction":
        return (
          <View className="px-6">
            <View className="flex-row gap-4 mb-5">
              <View className="flex-1">
                <InputField
                  label="Transaction Name"
                  placeholder="Enter transaction name"
                  value={transactionForm.transactionName}
                  onChangeText={(text) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      transactionName: text,
                    }))
                  }
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
              <View className="w-1/3">
                <InputField
                  label="Amount"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChangeText={(text) =>
                    setTransactionForm((prev) => ({ ...prev, amount: text }))
                  }
                  keyboardType="decimal-pad"
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium mb-2 text-gray-700">
                Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(true)}
                className="py-3 px-4 rounded-lg border border-gray-300 flex-row justify-between items-center bg-white"
              >
                <Text className="text-gray-700">
                  {selectedCategory
                    ? selectedCategory.category
                    : "Select a category"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#0d9488" />
              </TouchableOpacity>
            </View>

            <View className="mt-6 mb-10">
              <TouchableOpacity
                onPress={handleTransactionSubmit}
                disabled={isLoading}
                className={`rounded-lg py-3 w-full flex items-center justify-center ${
                  isLoading ? "bg-teal-400" : "bg-teal-600"
                }`}
              >
                <Text className="text-white font-semibold">
                  {isLoading ? "Adding..." : "Add Transaction"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "fixedCost":
        return (
          <View className="px-6">
            <View className="flex-row gap-4 mb-5">
              <View className="flex-1">
                <InputField
                  label="Fixed Cost Name"
                  placeholder="Enter name"
                  value={fixedCostForm.name}
                  onChangeText={(text) =>
                    setFixedCostForm((prev) => ({ ...prev, name: text }))
                  }
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
              <View className="w-1/3">
                <InputField
                  label="Amount"
                  placeholder="0.00"
                  value={fixedCostForm.amount}
                  onChangeText={(text) =>
                    setFixedCostForm((prev) => ({ ...prev, amount: text }))
                  }
                  keyboardType="decimal-pad"
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium mb-2 text-gray-700">
                Frequency
              </Text>
              <View className="flex-row space-x-2">
                {(["weekly", "biweekly", "monthly"] as Frequency[]).map(
                  (option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() =>
                        setFixedCostForm((prev) => ({
                          ...prev,
                          frequency: option,
                        }))
                      }
                      className={`flex-1 py-2 rounded-lg border ${
                        fixedCostForm.frequency === option
                          ? "bg-teal-500 border-teal-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium text-sm ${fixedCostForm.frequency === option ? "text-white" : "text-gray-700"}`}
                      >
                        {capitalizeFirstLetter(option)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium mb-2 text-gray-700">
                Link to Category (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(true)}
                className="py-3 px-4 rounded-lg border border-gray-300 flex-row justify-between items-center bg-white"
              >
                <Text className="text-gray-700">
                  {selectedFixedCostCategory
                    ? selectedFixedCostCategory.category
                    : "Select a category"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#0d9488" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-4 mb-5">
              <View className="flex-1">
                <Text className="text-sm font-medium mb-2 text-gray-700">
                  Start Date (Optional)
                </Text>
                <TouchableOpacity
                  onPress={openStartDatePicker}
                  className="py-3 px-4 rounded-lg border border-gray-300 flex-row justify-between items-center bg-white"
                >
                  <Text className="text-gray-700 text-sm">
                    {startDate ? startDate.toLocaleDateString() : "Select date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#0d9488" />
                </TouchableOpacity>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-medium mb-2 text-gray-700">
                  End Date (Optional)
                </Text>
                <TouchableOpacity
                  onPress={openEndDatePicker}
                  className="py-3 px-4 rounded-lg border border-gray-300 flex-row justify-between items-center bg-white"
                >
                  <Text className="text-gray-700 text-sm">
                    {endDate ? endDate.toLocaleDateString() : "Select date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#0d9488" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-6 mb-10">
              <TouchableOpacity
                onPress={handleFixedCostSubmit}
                disabled={isLoading}
                className={`rounded-lg py-3 w-full flex items-center justify-center ${isLoading ? "bg-teal-400" : "bg-teal-600"}`}
              >
                <Text className="text-white font-semibold">
                  {isLoading ? "Adding..." : "Add Fixed Cost"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "income":
        return (
          <View className="px-6">
            <View className="flex-row gap-4 mb-5">
              <View className="flex-1">
                <InputField
                  label="Source Name"
                  placeholder="Enter source name"
                  value={incomeForm.source_name}
                  onChangeText={(text) =>
                    setIncomeForm({ ...incomeForm, source_name: text })
                  }
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
              <View className="w-1/3">
                <InputField
                  label="Amount"
                  placeholder="0.00"
                  value={incomeForm.amount}
                  onChangeText={(text) =>
                    setIncomeForm({ ...incomeForm, amount: text })
                  }
                  keyboardType="decimal-pad"
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium mb-2 text-gray-700">
                Received On
              </Text>
              <TouchableOpacity
                onPress={() => setShowIncomeDatePicker(true)}
                className="py-3 px-4 rounded-lg border border-gray-300 flex-row justify-between items-center bg-white"
              >
                <Text className="text-gray-700">
                  {incomeForm.received_on.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#0d9488" />
              </TouchableOpacity>
            </View>

            <View className="mb-5">
              <View className="flex-row items-center mb-3">
                <TouchableOpacity
                  onPress={() =>
                    setIncomeForm({
                      ...incomeForm,
                      recurring: !incomeForm.recurring,
                    })
                  }
                  className={`w-6 h-6 rounded border mr-3 flex items-center justify-center ${
                    incomeForm.recurring
                      ? "bg-teal-500 border-teal-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {incomeForm.recurring && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </TouchableOpacity>
                <Text className="text-gray-700 font-medium">
                  Recurring Income
                </Text>
              </View>
            </View>

            {incomeForm.recurring && (
              <View className="mb-5">
                <Text className="text-sm font-medium mb-2 text-gray-700">
                  Frequency
                </Text>
                <View className="flex-row space-x-2">
                  {["weekly", "biweekly", "monthly"].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      onPress={() =>
                        setIncomeForm({ ...incomeForm, frequency: freq })
                      }
                      className={`flex-1 py-2 rounded-lg border ${
                        incomeForm.frequency === freq
                          ? "bg-teal-500 border-teal-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium text-sm ${
                          incomeForm.frequency === freq
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {capitalizeFirstLetter(freq)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View className="mt-6 mb-10">
              <TouchableOpacity
                onPress={handleIncomeSubmit}
                disabled={isLoading}
                className={`rounded-lg py-3 w-full flex items-center justify-center ${
                  isLoading ? "bg-teal-400" : "bg-teal-600"
                }`}
              >
                <Text className="text-white font-semibold">
                  {isLoading ? "Adding..." : "Add Income"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-200 mb-4">
            <View>
              <Text className="text-xl font-bold text-gray-800">{title}</Text>
              <Text className="text-sm text-gray-500">{subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View className="px-6 mb-6">
            <View className="flex-row bg-gray-100 rounded-xl p-1">
              <TouchableOpacity
                onPress={() => setActiveTab("transaction")}
                className={`flex-1 py-3 rounded-lg ${
                  activeTab === "transaction" ? "bg-teal-600" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "transaction" ? "text-white" : "text-gray-600"
                  }`}
                >
                  Transaction
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("fixedCost")}
                className={`flex-1 py-3 rounded-lg ${
                  activeTab === "fixedCost" ? "bg-teal-600" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "fixedCost" ? "text-white" : "text-gray-600"
                  }`}
                >
                  Fixed Cost
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("income")}
                className={`flex-1 py-3 rounded-lg ${
                  activeTab === "income" ? "bg-teal-600" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "income" ? "text-white" : "text-gray-600"
                  }`}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderTabContent()}
        </ScrollView>

        {/* Category Modal */}
        <ReactNativeModal
          isVisible={showCategoryModal}
          onBackdropPress={() => setShowCategoryModal(false)}
          style={{ margin: 0, justifyContent: "flex-end" }}
          onBackButtonPress={() => setShowCategoryModal(false)}
        >
          <View className="bg-white rounded-t-3xl p-6 h-2/3 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-teal-600">
                Select a Category
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={budgets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (activeTab === "transaction") {
                      setSelectedCategory(item);
                    } else if (activeTab === "fixedCost") {
                      setSelectedFixedCostCategory(item);
                    }
                    setShowCategoryModal(false);
                  }}
                  className="py-4 border-b border-gray-200"
                >
                  <Text className="text-lg text-gray-700">{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </ReactNativeModal>

        {/* Income Date Picker */}
        <CustomDatePicker
          isVisible={showIncomeDatePicker}
          onClose={() => setShowIncomeDatePicker(false)}
          onDateChange={(date) =>
            setIncomeForm({ ...incomeForm, received_on: date })
          }
          initialDate={incomeForm.received_on}
        />

        {/* Custom Start Date Picker Modal */}
        <ReactNativeModal
          isVisible={showStartDatePicker}
          onBackdropPress={cancelDateSelection}
          style={{ margin: 0, justifyContent: "flex-end" }}
          onBackButtonPress={cancelDateSelection}
        >
          <View className="bg-white rounded-t-3xl p-6 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={cancelDateSelection}>
                <Text className="text-teal-500 font-semibold text-lg">
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text className="text-xl font-bold">Select Start Date</Text>
              <TouchableOpacity onPress={confirmDateSelection}>
                <Text className="text-teal-500 font-semibold text-lg">
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center py-4">
              {/* Month Selector */}
              <View className="flex-1">
                <Text className="text-center text-gray-500 mb-2">Month</Text>
                <View className="bg-gray-100 rounded-lg p-2">
                  <ScrollView
                    className="h-32"
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setTempMonth(i)}
                        className={`py-2 ${tempMonth === i ? "bg-teal-100 rounded-lg" : ""}`}
                      >
                        <Text
                          className={`text-center text-lg ${tempMonth === i ? "text-teal-600 font-bold" : ""}`}
                        >
                          {getMonthName(i)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Day Selector */}
              <View className="flex-1 mx-2">
                <Text className="text-center text-gray-500 mb-2">Day</Text>
                <View className="bg-gray-100 rounded-lg p-2">
                  <ScrollView
                    className="h-32"
                    showsVerticalScrollIndicator={false}
                  >
                    {generateDays().map((day) => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => setTempDay(day)}
                        className={`py-2 ${tempDay === day ? "bg-teal-100 rounded-lg" : ""}`}
                      >
                        <Text
                          className={`text-center text-lg ${tempDay === day ? "text-teal-600 font-bold" : ""}`}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Year Selector */}
              <View className="flex-1">
                <Text className="text-center text-gray-500 mb-2">Year</Text>
                <View className="bg-gray-100 rounded-lg p-2">
                  <ScrollView
                    className="h-32"
                    showsVerticalScrollIndicator={false}
                  >
                    {generateYears().map((year) => (
                      <TouchableOpacity
                        key={year}
                        onPress={() => setTempYear(year)}
                        className={`py-2 ${tempYear === year ? "bg-teal-100 rounded-lg" : ""}`}
                      >
                        <Text
                          className={`text-center text-lg ${tempYear === year ? "text-teal-600 font-bold" : ""}`}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-center text-lg font-semibold">
                {getMonthName(tempMonth)} {tempDay}, {tempYear}
              </Text>
            </View>
          </View>
        </ReactNativeModal>

        {/* Custom End Date Picker Modal */}
        <ReactNativeModal
          isVisible={showEndDatePicker}
          onBackdropPress={cancelDateSelection}
          style={{ margin: 0, justifyContent: "flex-end" }}
          onBackButtonPress={cancelDateSelection}
        >
          <View className="bg-white rounded-t-3xl p-6 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={cancelDateSelection}>
                <Text className="text-teal-500 font-semibold text-lg">
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text className="text-xl font-bold">Select End Date</Text>
              <TouchableOpacity onPress={confirmDateSelection}>
                <Text className="text-teal-500 font-semibold text-lg">
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center py-4">
              {/* Month Selector */}
              <View className="flex-1">
                <Text className="text-center text-gray-500 mb-2">Month</Text>
                <View className="bg-gray-100 rounded-lg p-2">
                  <ScrollView
                    className="h-32"
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setTempMonth(i)}
                        className={`py-2 ${tempMonth === i ? "bg-teal-100 rounded-lg" : ""}`}
                      >
                        <Text
                          className={`text-center text-lg ${tempMonth === i ? "text-teal-600 font-bold" : ""}`}
                        >
                          {getMonthName(i)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Day Selector */}
              <View className="flex-1 mx-2">
                <Text className="text-center text-gray-500 mb-2">Day</Text>
                <View className="bg-gray-100 rounded-lg p-2">
                  <ScrollView
                    className="h-32"
                    showsVerticalScrollIndicator={false}
                  >
                    {generateDays().map((day) => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => setTempDay(day)}
                        className={`py-2 ${tempDay === day ? "bg-teal-100 rounded-lg" : ""}`}
                      >
                        <Text
                          className={`text-center text-lg ${tempDay === day ? "text-teal-600 font-bold" : ""}`}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Year Selector */}
              <View className="flex-1">
                <Text className="text-center text-gray-500 mb-2">Year</Text>
                <View className="bg-gray-100 rounded-lg p-2">
                  <ScrollView
                    className="h-32"
                    showsVerticalScrollIndicator={false}
                  >
                    {generateYears().map((year) => (
                      <TouchableOpacity
                        key={year}
                        onPress={() => setTempYear(year)}
                        className={`py-2 ${tempYear === year ? "bg-teal-100 rounded-lg" : ""}`}
                      >
                        <Text
                          className={`text-center text-lg ${tempYear === year ? "text-teal-600 font-bold" : ""}`}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-center text-lg font-semibold">
                {getMonthName(tempMonth)} {tempDay}, {tempYear}
              </Text>
            </View>
          </View>
        </ReactNativeModal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default AddTransaction;
