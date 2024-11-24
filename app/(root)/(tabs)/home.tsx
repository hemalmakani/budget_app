import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import type { BudgetResponse, Budget } from "@/types/type";
import { useFetch } from "@/lib/fetch";

const HomePage = () => {
  const { userId } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, loading, error, refetch } = useFetch<BudgetResponse>(
    `/(api)/budget/${userId}`
  );

  const budgets = data?.data || [];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text className="text-red-500">Error loading budgets</Text>
        <Text className="text-sm text-gray-500 mt-2">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-5 bg-gray-50">
        <Text className="text-2xl font-JakartaSemiBold">My Budgets</Text>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {budgets.length === 0 ? (
          <View className="flex-1 items-center justify-center py-10">
            <Text className="text-gray-500">No budgets found</Text>
          </View>
        ) : (
          budgets.map((budget) => (
            <View
              key={budget.id}
              className={`p-4 rounded-lg mb-4 ${getBudgetColor(budget.type)}`}
            >
              {/* Rest of your budget card UI */}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomePage;
