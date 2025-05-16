import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { router, Stack } from "expo-router";
import InputField from "@/components/InputField";
import { useBudgetStore, useFixedCostStore } from "@/store/index";
import { Ionicons } from "@expo/vector-icons";
import { ReactNativeModal } from "react-native-modal";
import { Budget } from "@/types/type";
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
        amount: parseFloat(amount),
        frequency,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
        category_id: selectedCategory?.id || null,
        clerk_id: user?.id || "",
      });

      const result = await addFixedCost({
        name,
        amount: parseFloat(amount),
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
          onPress: () => router.back(),
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
            contentContainerStyle={{ paddingBottom: 100 }} // Add extra padding at bottom
          >
            <View className="bg-purple-600 p-6 rounded-b-3xl shadow-lg mb-4">
              <Text className="text-3xl text-white font-bold mb-2">
                Add Fixed Cost
              </Text>
              <Text className="text-purple-100">
                Create a new recurring expense
              </Text>
            </View>

            <View className="px-6">
              <InputField
                label="Fixed Cost Name"
                placeholder="Enter fixed cost name"
                value={name}
                onChangeText={setName}
                containerStyle="bg-white border-gray-300 mb-5"
                inputStyle="bg-white"
              />

              <InputField
                label="Amount"
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                containerStyle="bg-white border-gray-300 mb-5"
                inputStyle="bg-white"
              />

              <View className="mb-5">
                <Text className="text-lg font-semibold mb-3">Frequency</Text>
                <View className="flex-row space-x-4">
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setFrequency(option)}
                      className={`flex-1 p-4 rounded-lg border ${
                        frequency === option
                          ? "bg-purple-500 border-purple-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-center font-semibold ${
                          frequency === option ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {capitalizeFirstLetter(option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-5">
                <Text className="text-lg font-semibold mb-3">
                  Link to Category (Optional)
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryModal(true)}
                  className="p-4 rounded-lg border border-gray-300 flex-row justify-between items-center"
                >
                  <Text>
                    {selectedCategory
                      ? selectedCategory.category
                      : "Select a category"}
                  </Text>
                  <Ionicons name="chevron-down" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View className="mb-5">
                <Text className="text-lg font-semibold mb-3">
                  Start Date (Optional)
                </Text>
                <TouchableOpacity
                  onPress={openStartDatePicker}
                  className="p-4 rounded-lg border border-gray-300 flex-row justify-between items-center"
                >
                  <Text>
                    {startDate
                      ? startDate.toLocaleDateString()
                      : "Select Start Date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View className="mb-5">
                <Text className="text-lg font-semibold mb-3">
                  End Date (Optional)
                </Text>
                <TouchableOpacity
                  onPress={openEndDatePicker}
                  className="p-4 rounded-lg border border-gray-300 flex-row justify-between items-center"
                >
                  <Text>
                    {endDate ? endDate.toLocaleDateString() : "Select End Date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between mt-8 mb-10">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="bg-gray-200 rounded-lg py-3 px-6"
                >
                  <Text className="text-gray-800 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading}
                  className={`rounded-lg py-3 px-6 ${
                    isLoading ? "bg-purple-400" : "bg-purple-600"
                  }`}
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
                <Text className="text-2xl font-bold text-purple-600">
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
                  <Text className="text-purple-500 font-semibold text-lg">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold">Select Start Date</Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text className="text-purple-500 font-semibold text-lg">
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
                          className={`py-2 ${tempMonth === i ? "bg-purple-100 rounded-lg" : ""}`}
                        >
                          <Text
                            className={`text-center text-lg ${tempMonth === i ? "text-purple-600 font-bold" : ""}`}
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
                          className={`py-2 ${tempDay === day ? "bg-purple-100 rounded-lg" : ""}`}
                        >
                          <Text
                            className={`text-center text-lg ${tempDay === day ? "text-purple-600 font-bold" : ""}`}
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
                          className={`py-2 ${tempYear === year ? "bg-purple-100 rounded-lg" : ""}`}
                        >
                          <Text
                            className={`text-center text-lg ${tempYear === year ? "text-purple-600 font-bold" : ""}`}
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
                  <Text className="text-purple-500 font-semibold text-lg">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold">Select End Date</Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text className="text-purple-500 font-semibold text-lg">
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
                          className={`py-2 ${tempMonth === i ? "bg-purple-100 rounded-lg" : ""}`}
                        >
                          <Text
                            className={`text-center text-lg ${tempMonth === i ? "text-purple-600 font-bold" : ""}`}
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
                          className={`py-2 ${tempDay === day ? "bg-purple-100 rounded-lg" : ""}`}
                        >
                          <Text
                            className={`text-center text-lg ${tempDay === day ? "text-purple-600 font-bold" : ""}`}
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
                          className={`py-2 ${tempYear === year ? "bg-purple-100 rounded-lg" : ""}`}
                        >
                          <Text
                            className={`text-center text-lg ${tempYear === year ? "text-purple-600 font-bold" : ""}`}
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
