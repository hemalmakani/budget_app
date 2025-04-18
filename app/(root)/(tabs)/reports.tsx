import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { useBudgetStore } from "@/store";
import { Stack } from "expo-router";
import Icon from "react-native-vector-icons/Ionicons";
import { useDataStore } from "@/store/dataStore";

// Define time period options
const TIME_PERIODS = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
];

// Define types for spending data
interface SpendingDataItem {
  id: string;
  amount: number;
  date: string;
  description: string;
  category_id: string;
  category_name: string;
}

interface SpendingDataResponse {
  data: SpendingDataItem[];
}

interface CategoryDataItem {
  name: string;
  amount: number;
  percentage: number;
}

// Simple Bar Chart component that doesn't use SVG
const SimpleBarChart = ({
  data,
}: {
  data: { labels: string[]; values: number[] };
}) => {
  const maxValue = Math.max(...data.values, 1); // Avoid division by zero

  return (
    <View className="mt-4">
      {data.labels.length === 0 ? (
        <View className="items-center py-4">
          <Icon name="bar-chart-outline" size={50} color="#9CA3AF" />
          <Text className="text-gray-500 mt-2">No spending data available</Text>
        </View>
      ) : (
        <>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500 text-xs">Date</Text>
            <Text className="text-gray-500 text-xs">Amount</Text>
          </View>
          {data.labels.map((label, index) => (
            <View key={index} className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-800">{label}</Text>
                <Text className="font-semibold">
                  ${data.values[index].toFixed(2)}
                </Text>
              </View>
              <View className="bg-gray-200 h-4 rounded-full overflow-hidden">
                <View
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${(data.values[index] / maxValue) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const Reports = () => {
  const { user } = useUser();
  const { budgets } = useBudgetStore();
  const [selectedPeriod, setSelectedPeriod] = useState(TIME_PERIODS[1]); // Default to 30 days
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<SpendingDataResponse | null>(
    null
  );
  const isLoadingInitial = useDataStore((state) => state.isLoading);
  const hasInitialDataLoaded = useDataStore(
    (state) => state.hasInitialDataLoaded
  );

  // Use refs to track the current filter values without triggering re-renders
  const filtersRef = useRef({
    userId: user?.id,
    startDate: new Date(),
    endDate: new Date(),
    categoryId: null as string | null,
    shouldFetch: false,
  });

  // Calculate date range based on selected period
  const calculateDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - selectedPeriod.days);
    return { startDate: start, endDate: end };
  }, [selectedPeriod.days]);

  // Update filters when period or category changes
  useEffect(() => {
    const { startDate, endDate } = calculateDateRange();
    filtersRef.current = {
      ...filtersRef.current,
      startDate,
      endDate,
      categoryId: selectedCategory,
    };
  }, [selectedPeriod, selectedCategory, calculateDateRange]);

  // Update userId when user changes
  useEffect(() => {
    filtersRef.current.userId = user?.id;
  }, [user?.id]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    const { userId, startDate, endDate, categoryId } = filtersRef.current;

    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/(api)/reports/spending/${userId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${
        categoryId ? `&categoryId=${categoryId}` : ""
      }`;

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setSpendingData(data);
    } catch (err) {
      console.error(`Error fetching spending data:`, err);
      setError(
        `Failed to load spending data: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading(false);
      filtersRef.current.shouldFetch = false;
    }
  }, []);

  // Only fetch when explicitly triggered
  useEffect(() => {
    if (filtersRef.current.shouldFetch) {
      fetchData();
    }
  }, [fetchData]);

  // Handle period change
  const handlePeriodChange = (period: (typeof TIME_PERIODS)[0]) => {
    setSelectedPeriod(period);
    const { startDate, endDate } = calculateDateRange();
    filtersRef.current = {
      ...filtersRef.current,
      startDate,
      endDate,
      shouldFetch: true,
    };
    setTimeout(fetchData, 100);
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    filtersRef.current = {
      ...filtersRef.current,
      categoryId,
      shouldFetch: true,
    };
    setTimeout(fetchData, 100);
  };

  // Process data for charts
  const processChartData = () => {
    if (!spendingData?.data || spendingData.data.length === 0) {
      return {
        labels: [],
        values: [],
      };
    }

    const groupedByDate = spendingData.data.reduce(
      (acc: Record<string, number>, item: SpendingDataItem) => {
        const date = new Date(item.date).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += parseFloat(item.amount as any);
        return acc;
      },
      {} as Record<string, number>
    );

    const dates = Object.keys(groupedByDate);
    const amounts = Object.values(groupedByDate);

    let labels = dates;
    let values = amounts;
    if (dates.length > 7) {
      const step = Math.ceil(dates.length / 7);
      labels = dates.filter((_, i) => i % step === 0);
      values = labels.map((label) => groupedByDate[label]);
    }

    return {
      labels,
      values,
    };
  };

  // Process category data for the pie chart
  const processCategoryData = () => {
    if (!spendingData?.data || spendingData.data.length === 0) {
      return [] as CategoryDataItem[];
    }

    const groupedByCategory = spendingData.data.reduce(
      (acc: Record<string, number>, item: SpendingDataItem) => {
        const categoryName = item.category_name || "Uncategorized";
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName] += parseFloat(item.amount as any);
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(groupedByCategory).map(([name, amount]) => ({
      name,
      amount,
      percentage: 0,
    }));
  };

  if (isLoadingInitial && !hasInitialDataLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  const chartData = processChartData();
  const categoryData = processCategoryData();

  // Calculate percentages for category data
  const totalSpending = categoryData.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  categoryData.forEach((item) => {
    item.percentage =
      totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;
  });

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "bottom", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-blue-600 p-6 rounded-b-3xl shadow-lg">
        <Text className="text-3xl text-white font-bold mb-2">
          Spending Reports
        </Text>
        <Text className="text-blue-100">
          Track your spending patterns over time
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Time period selector */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">Time Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {TIME_PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.label}
                  onPress={() => handlePeriodChange(period)}
                  className={`px-4 py-2 rounded-full ${
                    selectedPeriod.label === period.label
                      ? "bg-blue-600"
                      : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`${
                      selectedPeriod.label === period.label
                        ? "text-white"
                        : "text-gray-800"
                    }`}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Category filter */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-2">Category Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => handleCategoryChange(null)}
                className={`px-4 py-2 rounded-full ${
                  selectedCategory === null ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`${
                    selectedCategory === null ? "text-white" : "text-gray-800"
                  }`}
                >
                  All Categories
                </Text>
              </TouchableOpacity>

              {budgets.map((budget) => (
                <TouchableOpacity
                  key={budget.id}
                  onPress={() => handleCategoryChange(budget.id)}
                  className={`px-4 py-2 rounded-full ${
                    selectedCategory === budget.id
                      ? "bg-blue-600"
                      : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`${
                      selectedCategory === budget.id
                        ? "text-white"
                        : "text-gray-800"
                    }`}
                  >
                    {budget.category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Spending over time chart */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow">
          <Text className="text-lg font-semibold mb-4">Spending Over Time</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : error ? (
            <Text className="text-red-500">{error}</Text>
          ) : (
            <SimpleBarChart data={chartData} />
          )}
        </View>

        {/* Category breakdown */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow">
          <Text className="text-lg font-semibold mb-4">Category Breakdown</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : error ? (
            <Text className="text-red-500">{error}</Text>
          ) : categoryData.length === 0 ? (
            <View className="items-center py-4">
              <Icon name="pie-chart-outline" size={50} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">
                No category data available
              </Text>
            </View>
          ) : (
            <View>
              {categoryData.map((category, index) => (
                <View key={index} className="mb-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-800">{category.name}</Text>
                    <Text className="font-semibold">
                      ${category.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View className="bg-gray-200 h-2 rounded-full overflow-hidden">
                    <View
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </View>
                  <Text className="text-xs text-gray-500 text-right mt-1">
                    {category.percentage.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Total spending summary */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow">
          <Text className="text-lg font-semibold mb-2">Total Spending</Text>
          <Text className="text-3xl font-bold text-blue-600">
            ${totalSpending ? totalSpending.toFixed(2) : "0.00"}
          </Text>
          <Text className="text-sm text-gray-500">
            {selectedPeriod.label} (
            {calculateDateRange().startDate.toLocaleDateString()} -{" "}
            {calculateDateRange().endDate.toLocaleDateString()})
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Reports;
