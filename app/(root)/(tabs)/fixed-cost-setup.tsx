"use client";

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { router, Stack } from "expo-router";
import InputField from "@/components/InputField";
import { useBudgetStore, useFixedCostStore } from "@/store/index";
import { Ionicons } from "@expo/vector-icons";
import { ReactNativeModal } from "react-native-modal";
import type { Budget } from "@/types/type";
import { FlatList } from "react-native-gesture-handler";

// Update to lowercase to match database constraints
const frequencyOptions = ["weekly", "biweekly", "monthly"] as const;
// Define a new type based on the updated frequency options
type Frequency = (typeof frequencyOptions)[number];

export default function FixedCostSetup() {
  const { user } = useUser();
  const { budgets } = useBudgetStore();
  const { addFixedCost } = useFixedCostStore();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>(frequencyOptions[0]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Budget | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState<number>(new Date().getMonth());
  const [tempDay, setTempDay] = useState<number>(new Date().getDate());
  const [activeDateField, setActiveDateField] = useState<
    "start" | "end" | null
  >(null);

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

  // Get days in month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Generate arrays for picker values
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

  // Helper function to capitalize first letter for display purposes
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a fixed cost name");
      return;
    }
    if (!amount) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }
    if (!frequency) {
      Alert.alert("Error", "Please select a frequency");
      return;
    }
    setIsLoading(true);
    try {
      console.log("Adding fixed cost with data:", {
        name,
        amount: Number.parseFloat(amount),
        frequency,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
        category_id: selectedCategory?.id || null,
        clerk_id: user?.id || "",
      });

      const result = await addFixedCost({
        name,
        amount: Number.parseFloat(amount),
        frequency,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
        category_id: selectedCategory?.id || null,
        clerk_id: user?.id || "",
      });

      console.log("Fixed cost added successfully:", result);

      Alert.alert("Success", "Fixed cost added successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/home"),
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          className="flex-1 bg-white"
          edges={["top", "left", "right"]}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 120 }} // Increased padding to avoid tab bar overlap
            showsVerticalScrollIndicator={false}
          >
            <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-200 mb-4">
              <View>
                <Text className="text-xl font-bold text-gray-800">
                  Add Fixed Cost
                </Text>
                <Text className="text-sm text-gray-500">
                  Create a new recurring expense
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
                className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View className="px-6">
              <View className="flex-row gap-4 mb-5">
                <View className="flex-1">
                  <InputField
                    label="Fixed Cost Name"
                    placeholder="Enter name"
                    value={name}
                    onChangeText={setName}
                    containerStyle="bg-white border-gray-300"
                    inputStyle="bg-white"
                  />
                </View>
                <View className="w-1/3">
                  <InputField
                    label="Amount"
                    placeholder="0.00"
                    value={amount}
                    onChangeText={setAmount}
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
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setFrequency(option)}
                      className={`flex-1 py-2 rounded-lg border ${
                        frequency === option
                          ? "bg-teal-500 border-teal-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium text-sm ${frequency === option ? "text-white" : "text-gray-700"}`}
                      >
                        {capitalizeFirstLetter(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
                    {selectedCategory
                      ? selectedCategory.category
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
                      {startDate
                        ? startDate.toLocaleDateString()
                        : "Select date"}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#0d9488"
                    />
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
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#0d9488"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mt-6 mb-10">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading}
                  className={`rounded-lg py-3 w-full flex items-center justify-center ${isLoading ? "bg-teal-400" : "bg-teal-600"}`}
                >
                  <Text className="text-white font-semibold">
                    {isLoading ? "Adding..." : "Add Fixed Cost"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
                      setSelectedCategory(item);
                      setShowCategoryModal(false);
                    }}
                    className="py-4 border-b border-gray-200"
                  >
                    <Text className="text-lg text-gray-700">
                      {item.category}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </ReactNativeModal>

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
    </>
  );
}
