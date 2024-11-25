import React from "react";
import { View, Text, FlatList, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";
import { useFetch } from "@/lib/fetch";
import { Budget } from "@/types/type";
export default function Page() {
  const { user } = useUser();
  const {
    data: response,
    loading,
    error,
  } = useFetch<{ data: Budget[] }>(`/(api)/${user?.id}`);
  const budgetCategories = response || [];
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
            renderItem={({ item }) => <BudgetCard budget={item} />}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        <View className="mb-6">
          <Text className="text-2xl font-semibold mb-4 text-gray-800">
            Savings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
