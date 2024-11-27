import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Button,
  Alert,
  Modal,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";
import { useBudgetStore, useTransactionStore } from "@/store/index";
import { router } from "expo-router";

const AddTransaction = () => {
  const { userId } = useAuth();
  const { budgets } = useBudgetStore();
  const { addTransaction } = useTransactionStore();
  const [formData, setFormData] = useState({
    transactionName: "",
    amount: "",
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (budgets.length > 0 && !selectedCategory) {
      setSelectedCategory(budgets[0]);
    }
  }, [budgets]);

  const handleSubmit = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "You must be logged in to add a transaction");
        return;
      }

      setIsLoading(true);

      if (!formData.transactionName || !formData.amount || !selectedCategory) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Error", "Please enter a valid positive amount");
        return;
      }

      const transaction = {
        name: formData.transactionName,
        categoryId: selectedCategory?.id,
        amount: parseFloat(amount),
        clerk_id: userId,
      };

      await addTransaction(transaction);

      const requestData = {
        name: formData.transactionName,
        amount: amount,
        categoryId: selectedCategory.id,
        clerkId: userId,
      };

      Alert.alert("Success", "Transaction added successfully", [
        {
          text: "OK",
          onPress: () => {
            // Reset form data after successful submission
            setFormData({
              transactionName: "",
              amount: "",
            });
            setSelectedCategory(null);

            // Navigate back to home screen
            router.push("/(root)/(tabs)/home");
          },
        },
      ]);
    } catch (error) {
      // Handle any errors that occurred during submission
      console.error("Error adding transaction:", error);
      Alert.alert(
        "Error",
        // Provide a user-friendly error message
        error instanceof Error
          ? error.message
          : "Failed to add transaction. Please try again."
      );
    } finally {
      // Always reset loading state, regardless of success or failure
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="relative w-full bg-gray-200 h-24">
        <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
          Add Transaction
        </Text>
      </View>

      <View className="p-5">
        <InputField
          label="Transaction name"
          placeholder="Enter transaction name"
          value={formData.transactionName}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, transactionName: text }))
          }
          containerStyle="bg-white border-gray-300"
          inputStyle="bg-white"
        />

        <InputField
          label="Amount"
          placeholder="Enter transaction amount"
          value={formData.amount}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, amount: text }))
          }
          keyboardType="numeric"
          containerStyle="bg-white border-gray-300"
          inputStyle="bg-white"
        />

        <TouchableOpacity
          onPress={() => setShowCategoryModal(true)}
          className="bg-white border border-gray-300 rounded-lg mt-2 mb-4 p-4"
        >
          <Text>
            {selectedCategory ? selectedCategory.category : "Select a category"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between mt-4">
          <Button
            title="Cancel"
            onPress={() => router.push("/(root)/(tabs)/home")}
            color="gray"
          />
          <Button
            title={isLoading ? "Adding..." : "Add Transaction"}
            onPress={handleSubmit}
            disabled={isLoading}
          />
        </View>
      </View>

      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-lg p-5 h-1/2">
            <Text className="text-xl font-bold mb-4">Select a Category</Text>
            <FlatList
              data={budgets}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryModal(false);
                  }}
                  className="p-3 border-b border-gray-200"
                >
                  <Text>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AddTransaction;
