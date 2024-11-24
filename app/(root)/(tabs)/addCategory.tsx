import React, { useState } from "react";
import { Text, View, Button, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";

const AddCategory = () => {
  const { userId } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    categoryName: "",
    budget: "",
  });
  const [categoryType, setCategoryType] = useState("weekly");
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
        balance: budgetAmount, // Initially, balance equals budget
        clerkId: userId, // Using Clerk userId
      };

      // Make API request - Update the URL to match your API route
      const response = await fetch("/(api)/budget", {
        // Update this URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      const data = await response.json();

      // Success
      Alert.alert("Success", "Category added successfully");

      // Reset form
      setFormData({
        categoryName: "",
        budget: "",
      });
      setCategoryType("weekly");
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
    <SafeAreaView className="flex-1 bg-white">
      {/* Header Section */}
      <View className="relative w-full bg-gray-200">
        <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
          Add a new category
        </Text>
      </View>

      {/* Form Section */}
      <View className="p-5">
        <InputField
          label="Category name"
          placeholder="Enter category name"
          value={formData.categoryName}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, categoryName: text }))
          }
          containerStyle="bg-white border-gray-300"
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
          containerStyle="bg-white border-gray-300"
          inputStyle="bg-white"
        />

        <View className="bg-white border border-gray-300 rounded-lg mt-2 mb-4">
          <Picker selectedValue={categoryType} onValueChange={setCategoryType}>
            <Picker.Item label="Weekly" value="weekly" />
            <Picker.Item label="Monthly" value="monthly" />
            <Picker.Item label="Savings" value="savings" />
          </Picker>
        </View>

        <Button
          title={isLoading ? "Adding..." : "Add Category"}
          onPress={handleSubmit}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

export default AddCategory;
