"use client";

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { router, Stack } from "expo-router";
import InputField from "@/components/InputField";
import { fetchAPI } from "@/lib/fetch";
import CustomDatePicker from "@/components/CustomDatePicker";
import { Ionicons } from "@expo/vector-icons";
import { useIncomeStore } from "@/store";
import { useDataStore } from "@/store/dataStore";

export default function AddIncome() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AddIncomeContent />
    </>
  );
}

const AddIncomeContent = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { addIncome } = useIncomeStore();
  const { setTotalIncome } = useDataStore();
  const [form, setForm] = useState({
    source_name: "",
    amount: "",
    received_on: new Date(),
    recurring: false,
    frequency: "monthly",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to capitalize first letter for display purposes
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleSubmit = async () => {
    if (!form.source_name || !form.amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      setIsLoading(true);

      // Add income using the store method
      const token = await getToken();
      await addIncome({
        source_name: form.source_name,
        amount: parseFloat(form.amount),
        received_on: form.received_on.toISOString(),
        recurring: form.recurring,
        frequency: form.frequency,
        clerk_id: user.id,
      }, token);

      // Fetch updated total income
      const totalResponse = await fetchAPI(`/(api)/incomes/total/${user.id}`, undefined, token);
      if (totalResponse.data) {
        setTotalIncome(Number(totalResponse.data.total) || 0);
      }

      Alert.alert("Success", "Income added successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error adding income:", error);
      Alert.alert("Error", "Failed to add income");
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
                Add Income
              </Text>
              <Text className="text-sm text-gray-500">
                Record a new income source
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
                  label="Source Name"
                  placeholder="Enter source name"
                  value={form.source_name}
                  onChangeText={(text) =>
                    setForm({ ...form, source_name: text })
                  }
                  containerStyle="bg-white border-gray-300"
                  inputStyle="bg-white"
                />
              </View>
              <View className="w-1/3">
                <InputField
                  label="Amount"
                  placeholder="0.00"
                  value={form.amount}
                  onChangeText={(text) => setForm({ ...form, amount: text })}
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
                onPress={() => setShowDatePicker(true)}
                className="py-3 px-4 rounded-lg border border-gray-300 flex-row justify-between items-center bg-white"
              >
                <Text className="text-gray-700">
                  {form.received_on.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#0d9488" />
              </TouchableOpacity>
            </View>

            <CustomDatePicker
              isVisible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              onDateChange={(date) => setForm({ ...form, received_on: date })}
              initialDate={form.received_on}
            />

            <View className="mb-5">
              <View className="flex-row items-center mb-3">
                <TouchableOpacity
                  onPress={() =>
                    setForm({ ...form, recurring: !form.recurring })
                  }
                  className={`w-6 h-6 rounded border mr-3 flex items-center justify-center ${
                    form.recurring
                      ? "bg-teal-500 border-teal-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {form.recurring && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </TouchableOpacity>
                <Text className="text-gray-700 font-medium">
                  Recurring Income
                </Text>
              </View>
            </View>

            {form.recurring && (
              <View className="mb-5">
                <Text className="text-sm font-medium mb-2 text-gray-700">
                  Frequency
                </Text>
                <View className="flex-row space-x-2">
                  {["weekly", "biweekly", "monthly"].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      onPress={() => setForm({ ...form, frequency: freq })}
                      className={`flex-1 py-2 rounded-lg border ${
                        form.frequency === freq
                          ? "bg-teal-500 border-teal-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <Text
                        className={`text-center font-medium text-sm ${
                          form.frequency === freq
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
                onPress={handleSubmit}
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
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};
