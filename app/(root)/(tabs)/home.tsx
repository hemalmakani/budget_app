import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";
import { useFetch } from "@/lib/fetch";
import { Budget } from "@/types/type";
import { useEffect } from "react";
import { router } from "expo-router";
import { useBudgetStore } from "@/store/index";
export default function Page() {
  const { user } = useUser();
  const { budgets, setBudgets, deleteBudget } = useBudgetStore();

  const {
    data: response,
    loading,
    error,
  } = useFetch<{ data: Budget[] }>(`/(api)/budgetLoad/${user?.id}`);
  useEffect(() => {
    if (response) {
      setBudgets(response);
    }
  }, [response]);

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
    } catch (err) {
      // Error is already handled in the store
      console.error("Delete operation failed:", err);
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
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-semibold text-gray-800">
              Budget Categories
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(root)/addCategory")}
              className="bg-blue-500 flex rounded-lg w-10 h-10 justify-center items-center"
            >
              <Icon name="duplicate-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={budgets}
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
            data={budgets}
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
      <View>
        <TouchableOpacity
          className="absolute bottom-[60px] right-6 bg-blue-500 rounded-2xl w-16 h-16 justify-center items-center shadow-md"
          onPress={() => router.push("/(root)/addTransaction")}
        >
          <Icon name="add-outline" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
