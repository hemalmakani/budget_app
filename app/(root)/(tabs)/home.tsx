import React from "react";
import { View, Text, FlatList, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";

const budgetCategories = [
  {
    id: "1",
    budget: 100.0,
    balance: 50.0,
    category: "Groceries",
    type: "weekly",
    created_at: "2024-08-12 05:19:20.620007",
    user_id: "1",
  },
  {
    id: "2",
    budget: 100.0,
    balance: 50.0,
    category: "Rent",
    type: "monthly",
    created_at: "2024-09-12 05:19:20.620007",
    user_id: "1",
  },
];

const savingsCategories = [
  {
    id: "3",
    budget: 100.0,
    balance: 50.0,
    category: "Emergency Fund",
    type: "savings",
    created_at: "2024-08-17 05:19:20.620007",
    user_id: "1",
  },
];

export default function Page() {
  const { user } = useUser();

  const renderBudgetCard = ({ item }) => <BudgetCard budget={item} />;

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
            renderItem={renderBudgetCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        <View className="mb-6">
          <Text className="text-2xl font-semibold mb-4 text-gray-800">
            Savings
          </Text>
          <FlatList
            data={savingsCategories}
            renderItem={renderBudgetCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
