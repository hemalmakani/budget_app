import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "@/components/InputField";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useBudgetStore, useFixedCostStore } from "@/store/index";
import { Ionicons } from "@expo/vector-icons";
import { ReactNativeModal } from "react-native-modal";
import { Budget } from "@/types/type";
import { FlatList } from "react-native-gesture-handler";

const frequencyOptions = ["weekly", "biweekly", "monthly"] as const;
type Frequency = (typeof frequencyOptions)[number];

const EditFixedCost = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EditFixedCostContent />
    </>
  );
};

const EditFixedCostContent = () => {
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fixedCosts, updateFixedCost } = useFixedCostStore();
  const { budgets } = useBudgetStore();

  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>(frequencyOptions[0]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Budget | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Find the fixed cost to edit
  useEffect(() => {
    if (id && fixedCosts.length > 0) {
      const fixedCostToEdit = fixedCosts.find((fc) => fc.id === id);
      if (fixedCostToEdit) {
        setName(fixedCostToEdit.name);
        setAmount(fixedCostToEdit.amount.toString());
        setFrequency(fixedCostToEdit.frequency);

        if (fixedCostToEdit.start_date) {
          setStartDate(new Date(fixedCostToEdit.start_date));
        }
        if (fixedCostToEdit.end_date) {
          setEndDate(new Date(fixedCostToEdit.end_date));
        }

        if (fixedCostToEdit.category_id) {
          const linkedBudget = budgets.find(
            (b) => b.id === fixedCostToEdit.category_id
          );
          if (linkedBudget) {
            setSelectedCategory(linkedBudget);
          }
        }

        setIsLoading(false);
      } else {
        Alert.alert("Error", "Fixed cost not found");
        router.back();
      }
    } else if (fixedCosts.length > 0) {
      setIsLoading(false);
    }
  }, [id, fixedCosts, budgets]);

  const handleStartDateChange = (newDate: Date) => {
    setStartDate(newDate);
    setShowStartDatePicker(false);
  };

  const handleEndDateChange = (newDate: Date) => {
    setEndDate(newDate);
    setShowEndDatePicker(false);
  };

  const handleSubmit = async () => {
    try {
      if (!name.trim()) {
        Alert.alert("Error", "Please enter a fixed cost name");
        return;
      }

      if (!amount) {
        Alert.alert("Error", "Please enter an amount");
        return;
      }

      const updatedFixedCostData = {
        name,
        amount: parseFloat(amount),
        frequency: frequency as Frequency,
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
        category_id: selectedCategory?.id || null,
      };

      await updateFixedCost(id!, updatedFixedCostData);
      router.back();
    } catch (error) {
      console.error("Failed to update fixed cost:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to update fixed cost. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-6">Edit Fixed Cost</Text>

        <InputField
          label="Fixed Cost Name"
          placeholder="Enter fixed cost name"
          value={name}
          onChangeText={setName}
          containerStyle="bg-white border-gray-300 mb-4"
          inputStyle="bg-white"
        />

        <InputField
          label="Amount"
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          containerStyle="bg-white border-gray-300 mb-4"
          inputStyle="bg-white"
        />

        <View className="mb-4">
          <Text className="text-lg font-semibold mb-3">Frequency</Text>
          <View className="flex-row space-x-4">
            {frequencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setFrequency(option as Frequency)}
                className={`flex-1 p-4 rounded-lg border ${
                  frequency === option
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    frequency === option ? "text-white" : "text-gray-700"
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-4">
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
            <Ionicons name="chevron-up" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold mb-3">
            Start Date (Optional)
          </Text>
          <TouchableOpacity
            onPress={() => setShowStartDatePicker(true)}
            className="p-4 rounded-lg border border-gray-300"
          >
            <Text>
              {startDate ? startDate.toLocaleDateString() : "Select Start Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold mb-3">
            End Date (Optional)
          </Text>
          <TouchableOpacity
            onPress={() => setShowEndDatePicker(true)}
            className="p-4 rounded-lg border border-gray-300"
          >
            <Text>
              {endDate ? endDate.toLocaleDateString() : "Select End Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mt-8">
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
              isLoading ? "bg-blue-400" : "bg-blue-600"
            }`}
          >
            <Text className="text-white font-semibold">
              {isLoading ? "Updating..." : "Update Fixed Cost"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ReactNativeModal
        isVisible={showCategoryModal}
        onBackdropPress={() => setShowCategoryModal(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-3xl p-6 h-2/3 shadow-lg">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-blue-600">
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
                <Text className="text-lg text-gray-700">{item.category}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </ReactNativeModal>

      <ReactNativeModal
        isVisible={showStartDatePicker}
        onBackdropPress={() => setShowStartDatePicker(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
              <Text className="text-blue-500 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold">Select Start Date</Text>
            <TouchableOpacity
              onPress={() => handleStartDateChange(startDate || new Date())}
            >
              <Text className="text-blue-500 font-semibold">Confirm</Text>
            </TouchableOpacity>
          </View>
          <View className="py-4">
            <Text className="text-center text-lg">
              {startDate?.toLocaleDateString() ||
                new Date().toLocaleDateString()}
            </Text>
            <View className="flex-row justify-center space-x-4 mt-4">
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(startDate || new Date());
                  newDate.setDate(newDate.getDate() - 1);
                  setStartDate(newDate);
                }}
                className="p-2 bg-gray-200 rounded-full"
              >
                <Ionicons name="chevron-back" size={24} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(startDate || new Date());
                  newDate.setDate(newDate.getDate() + 1);
                  setStartDate(newDate);
                }}
                className="p-2 bg-gray-200 rounded-full"
              >
                <Ionicons name="chevron-forward" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ReactNativeModal>

      <ReactNativeModal
        isVisible={showEndDatePicker}
        onBackdropPress={() => setShowEndDatePicker(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
              <Text className="text-blue-500 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold">Select End Date</Text>
            <TouchableOpacity
              onPress={() => handleEndDateChange(endDate || new Date())}
            >
              <Text className="text-blue-500 font-semibold">Confirm</Text>
            </TouchableOpacity>
          </View>
          <View className="py-4">
            <Text className="text-center text-lg">
              {endDate?.toLocaleDateString() || new Date().toLocaleDateString()}
            </Text>
            <View className="flex-row justify-center space-x-4 mt-4">
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(endDate || new Date());
                  newDate.setDate(newDate.getDate() - 1);
                  setEndDate(newDate);
                }}
                className="p-2 bg-gray-200 rounded-full"
              >
                <Ionicons name="chevron-back" size={24} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(endDate || new Date());
                  newDate.setDate(newDate.getDate() + 1);
                  setEndDate(newDate);
                }}
                className="p-2 bg-gray-200 rounded-full"
              >
                <Ionicons name="chevron-forward" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
};

export default EditFixedCost;
