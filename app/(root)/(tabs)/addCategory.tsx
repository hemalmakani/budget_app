"use client";

import { useState } from "react";
import {
  Text,
  View,
  Alert,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";
import { useBudgetStore } from "@/store/index";
import { Stack, router } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ParentCategory } from "@/types/type";

const AddCategory = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AddCategoryContent />
    </>
  );
};

const AddCategoryContent = () => {
  const { userId, getToken } = useAuth();
  const { addBudget } = useBudgetStore();
  // Form state
  const [formData, setFormData] = useState({
    categoryName: "",
    budget: "",
  });
  const [categoryType, setCategoryType] = useState<
    "weekly" | "monthly" | "savings"
  >("weekly");
  const [parentCategory, setParentCategory] = useState<ParentCategory | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to capitalize first letter for display purposes
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent double submission
    if (isLoading) return;

    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to add a category");
        return;
      }

      setIsLoading(true);

      // Validate form fields
      if (!formData.categoryName || !formData.budget || !parentCategory) {
        Alert.alert(
          "Error",
          "Please fill in all fields including parent category"
        );
        return;
      }

      // Validate budget is a number
      const budgetAmount = Number.parseFloat(formData.budget);
      if (isNaN(budgetAmount)) {
        Alert.alert("Error", "Please enter a valid budget amount");
        return;
      }

      // Prepare the data
      const requestData = {
        category: formData.categoryName,
        type: categoryType,
        budget: budgetAmount,
        balance: budgetAmount,
        clerkId: userId,
        parentCategory: parentCategory,
      };

      const token = await getToken();
      await addBudget(requestData, token);

      // Reset form
      setFormData({
        categoryName: "",
        budget: "",
      });
      setCategoryType("weekly");
      setParentCategory(null);

      Alert.alert("Success", "Category added successfully", [
        {
          text: "OK",
          onPress: () => {
            router.push("/(root)/(tabs)/home");
          },
        },
      ]);
    } catch (error) {
      console.error("Error adding category:", error);
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "Failed to add category. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              <Text className="text-xl font-bold text-gray-800">
                Add Category
              </Text>
              <Text className="text-sm text-gray-500">
                Create a new budget category
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/home")}
              className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <View className="px-6">
            <View className="flex-row gap-4 mb-5">
              <View className="flex-1">
                <InputField
                  label="Category Name"
                  placeholder="Enter name"
                  value={formData.categoryName}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, categoryName: text }))
                  }
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
              <View className="w-1/3">
                <InputField
                  label="Amount"
                  placeholder="0.00"
                  value={formData.budget}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, budget: text }))
                  }
                  keyboardType="numeric"
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium mb-2 text-gray-700">
                Category Type
              </Text>
              <View className="flex-row space-x-2">
                {(["weekly", "monthly", "savings"] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setCategoryType(option)}
                    className={`flex-1 py-2 rounded-lg border ${
                      categoryType === option
                        ? "bg-teal-500 border-teal-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-center font-medium text-sm ${
                        categoryType === option ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {capitalizeFirstLetter(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium mb-2 text-gray-700">
                Parent Category *
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(
                  [
                    "Debts",
                    "Savings",
                    "Misc. Expenses",
                    "Variable Expenses",
                    "Fixed Expenses",
                    "Incomes",
                  ] as ParentCategory[]
                ).map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setParentCategory(option)}
                    className={`py-2 px-3 rounded-lg border ${
                      parentCategory === option
                        ? "bg-teal-500 border-teal-500"
                        : "bg-white border-gray-300"
                    }`}
                    style={{ minWidth: "48%" }}
                  >
                    <Text
                      className={`text-center font-medium text-sm ${
                        parentCategory === option
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mt-6 mb-10">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                className={`rounded-lg py-3 w-full flex items-center justify-center ${
                  isLoading ? "bg-teal-400" : "bg-teal-600"
                }`}
              >
                <Text className="text-white font-semibold">
                  {isLoading ? "Adding..." : "Add Category"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default AddCategory;
