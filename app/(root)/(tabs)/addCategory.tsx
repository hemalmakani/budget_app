import React, { useState } from "react";
import { Text, View, Alert, TouchableOpacity, StatusBar } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";
import { useBudgetStore } from "@/store/index";
import { Stack, router } from "expo-router";
import { ScrollView } from "react-native";

const AddCategory = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AddCategoryContent />
    </>
  );
};

const AddCategoryContent = () => {
  const { userId } = useAuth();
  const { addBudget } = useBudgetStore();
  // Form state
  const [formData, setFormData] = useState({
    categoryName: "",
    budget: "",
  });
  const [categoryType, setCategoryType] = useState<
    "weekly" | "monthly" | "savings"
  >("weekly");
  const [isLoading, setIsLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to add a category");
        return;
      }

      setIsLoading(true);

      // Validate form fields
      if (!formData.categoryName || !formData.budget) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      // Validate budget is a number
      const budgetAmount = parseFloat(formData.budget);
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
      };

      await addBudget(requestData);

      // Reset form
      setFormData({
        categoryName: "",
        budget: "",
      });
      setCategoryType("weekly");

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
    <SafeAreaView
      className="flex-1 bg-gray-100"
      edges={["top", "right", "bottom", "left"]}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1">
        <View className="py-4">
          <Text className="text-xl font-bold text-center text-gray-800">
            Add Category
          </Text>
        </View>

        <View className="p-6">
          <InputField
            label="Category name"
            placeholder="Enter category name"
            value={formData.categoryName}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, categoryName: text }))
            }
            containerStyle="bg-white border-gray-300 mb-4"
            inputStyle="bg-white"
          />

          <InputField
            label={
              categoryType === "savings"
                ? "Enter your savings amount"
                : "Enter your budget amount"
            }
            placeholder={
              categoryType === "savings"
                ? "Enter your savings value"
                : "Enter your budget amount"
            }
            value={formData.budget}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, budget: text }))
            }
            keyboardType="numeric"
            containerStyle="bg-white border-gray-300 mb-4"
            inputStyle="bg-white"
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">
            Category Type
          </Text>
          <View className="bg-white border border-gray-300 rounded-lg mb-4">
            <Picker
              selectedValue={categoryType}
              onValueChange={setCategoryType}
            >
              <Picker.Item label="Weekly" value="weekly" />
              <Picker.Item label="Monthly" value="monthly" />
              <Picker.Item label="Savings" value="savings" />
            </Picker>
          </View>

          <View className="flex-row justify-between mt-8">
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/home")}
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
                {isLoading ? "Adding..." : "Add Category"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddCategory;
