import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Alert,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";
import { useBudgetStore, useTransactionStore } from "@/store/index";
import { router, Stack } from "expo-router";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Budget } from "@/types/type";

const AddTransaction = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AddTransactionContent />
    </>
  );
};

const AddTransactionContent = () => {
  const { userId } = useAuth();
  const { budgets } = useBudgetStore();
  const { addTransaction } = useTransactionStore();
  const [formData, setFormData] = useState({
    transactionName: "",
    amount: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<Budget | null>(null);
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
        categoryId: selectedCategory.id,
        amount: amount,
        clerk_id: userId,
        category_name: selectedCategory.category,
      };

      await addTransaction(transaction);

      Alert.alert("Success", "Transaction added successfully", [
        {
          text: "OK",
          onPress: () => {
            setFormData({
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

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      edges={["top", "right", "bottom", "left"]}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1">
        <View className="py-4">
          <Text className="text-xl font-bold text-center text-gray-800">
            Add Transaction
          </Text>
        </View>

        <View className="p-6">
          <InputField
            label="Transaction name"
            placeholder="Enter transaction name"
            value={formData.transactionName}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, transactionName: text }))
            }
            containerStyle="bg-white border-gray-300 mb-4"
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
            containerStyle="bg-white border-gray-300 mb-4"
            inputStyle="bg-white"
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">
            Category
          </Text>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            className="bg-white border border-gray-300 rounded-lg p-4 flex-row justify-between items-center"
          >
            <Text className="text-gray-700">
              {selectedCategory
                ? selectedCategory.category
                : "Select a category"}
            </Text>
            <Ionicons name="chevron-up" size={24} color="#4B5563" />
          </TouchableOpacity>

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
                {isLoading ? "Adding..." : "Add Transaction"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ReactNativeModal
        isVisible={showCategoryModal}
        onBackdropPress={() => setShowCategoryModal(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
        onBackButtonPress={() => setShowCategoryModal(false)}
      >
        <View className="bg-white rounded-t-3xl p-6 h-2/3 shadow-lg">
          <View className="flex-row justify-between items-center mb-4 shadow-lg">
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
    </SafeAreaView>
  );
};

export default AddTransaction;
