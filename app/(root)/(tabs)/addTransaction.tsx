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
                Add Transaction
              </Text>
              <Text className="text-sm text-gray-500">
                Record a new expense
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
                  label="Transaction Name"
                  placeholder="Enter transaction name"
                  value={formData.transactionName}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, transactionName: text }))
                  }
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
              <View className="w-1/3">
                <InputField
                  label="Amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, amount: text }))
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
                onPress={handleSubmit}
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
        </ScrollView>

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
                  <Text className="text-lg text-gray-700">{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </ReactNativeModal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default AddTransaction;
