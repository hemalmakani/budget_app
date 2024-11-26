import React from "react";
import { View, Text, FlatList, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";
import { useFetch, deleteAPI, fetchAPI } from "@/lib/fetch";
import { Budget } from "@/types/type";
import { useState, useEffect } from "react";
export default function Page() {
  const { user } = useUser();
  const {
    data: response,
    loading,
    error,
  } = useFetch<{ data: Budget[] }>(`/(api)/budgetLoad/${user?.id}`);
  const [budgetCategories, setBudgetCategories] = useState([]);

  useEffect(() => {
    if (response) {
      setBudgetCategories(response);
    }
  }, [response]);

  const handleDelete = async (id: string) => {
    try {
      await fetchAPI(`/(api)/budgetCardDelete/${id}`, { method: "DELETE" });

      setBudgetCategories((prev) => prev.filter((item) => item.id !== id));
      Alert.alert("Success", "Budget category deleted successfully!");
    } catch (err) {
      console.error("Failed to delete:", err);
      Alert.alert("Error", "Failed to delete the budget category.");
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4">
        <View className="py-1">
          <Text className="text-xl font-bold text-center text-gray-800">
            Welcome,{" "}
            {user?.firstName ||
              user?.emailAddresses[0]?.emailAddress.split("@")[0]}
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-2xl font-semibold mb-4 text-gray-800">
            Budget Categories
          </Text>
          <FlatList
            data={budgetCategories}
            renderItem={({ item }) =>
              item.type === "weekly" || item.type === "monthly" ? (
                <BudgetCard budget={item} onDelete={handleDelete} />
              ) : null
            }
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        <View className="mb-6">
          <Text className="text-2xl font-semibold mb-4 text-gray-800">
            Savings
          </Text>
          <FlatList
            data={budgetCategories}
            renderItem={({ item }) =>
              item.type === "savings" ? (
                <BudgetCard budget={item} onDelete={handleDelete} />
              ) : null
            }
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
