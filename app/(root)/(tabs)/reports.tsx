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
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useBudgetStore } from "@/store";
import { Stack } from "expo-router";
import Icon from "react-native-vector-icons/Ionicons";
import { useDataStore } from "@/store/dataStore";
import { fetchAPI } from "@/lib/fetch";
import { LineChart } from "react-native-gifted-charts";

// Define time period options
const TIME_PERIODS = [
  { label: "7 Days", days: 7, aggregation: "day" },
  { label: "30 Days", days: 30, aggregation: "day" },
  { label: "3 Months", days: 90, aggregation: "day" },
  { label: "6 Months", days: 180, aggregation: "month" },
  { label: "Yearly", days: 365, aggregation: "month" },
  { label: "YTD", days: 0, aggregation: "month" },
];

// Define types for spending data
interface SpendingDataItem {
  id: string;
  amount: number;
  date: string;
  description: string;
  category_id: string;
  category_name: string;
  type?: string;
}

interface SpendingDataResponse {
  data: SpendingDataItem[];
}

interface CategoryDataItem {
  name: string;
  amount: number;
  percentage: number;
}

const Reports = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
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

    if (selectedPeriod.label === "YTD") {
      start.setMonth(0, 1); // Set to January 1st of current year
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(end.getDate() - selectedPeriod.days);
    }

    return { startDate: start, endDate: end };
  }, [selectedPeriod]);

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
      const url = `/api/reports/spending/${userId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${
        categoryId ? `&categoryId=${categoryId}` : ""
      }`;

      const token = await getToken();
      const data = await fetchAPI(url, undefined, token);

      // Filter out transactions from savings categories and income transactions
      const savingsCategoryIds = budgets
        .filter((budget) => budget.type === "savings")
        .map((budget) => budget.id);

      data.data = data.data.filter(
        (transaction: SpendingDataItem) =>
          !savingsCategoryIds.includes(transaction.category_id)
      );

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
  }, [budgets]);

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
      return [];
    }

    const isMonthlyAggregation = selectedPeriod.aggregation === "month";

    const groupedData = spendingData.data.reduce(
      (acc: Record<string, number>, item: SpendingDataItem) => {
        let key;
        const date = new Date(item.date);
        
        if (isMonthlyAggregation) {
          // Format as "Jan", "Feb", etc.
          key = date.toLocaleDateString('en-US', { month: 'short' });
          // We need to sort correctly later, so maybe use YYYY-MM as key and format label later?
          // For now let's use a simpler approach assuming data is sorted by date or we sort it.
          // Let's use YYYY-MM for sorting and map to Month name for display
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        } else {
          key = date.toLocaleDateString();
        }

        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key] += parseFloat(item.amount as any);
        return acc;
      },
      {} as Record<string, number>
    );

    // Sort keys
    const sortedKeys = Object.keys(groupedData).sort((a, b) => {
      // For monthly YYYY-MM comparison works
      // For daily localized string might not sort correctly if format is not YYYY-MM-DD
      // But we can parse back to Date
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedKeys.map(key => {
      let label = key;
      if (isMonthlyAggregation) {
        // Convert YYYY-MM back to Month Name
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        label = date.toLocaleDateString('en-US', { month: 'short' });
      } else {
         // Simplify date label for daily view (e.g. MM/DD)
         const date = new Date(key);
         label = `${date.getMonth() + 1}/${date.getDate()}`;
      }

      return {
        value: groupedData[key],
        label: label,
        dataPointText: groupedData[key].toFixed(0),
        textColor: '#333',
        textShiftY: -10,
        textShiftX: -5,
      };
    });
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

  // Calculate income vs expenses
  const calculateIncomeVsExpenses = () => {
    if (!spendingData?.data || spendingData.data.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
      };
    }

    const totals = spendingData.data.reduce(
      (acc, item: SpendingDataItem) => {
        const amount = parseFloat(item.amount as any);
        if (item.type === "income") {
          acc.totalIncome += amount;
        } else if (item.type === "expense") {
          acc.totalExpenses += amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );

    return {
      ...totals,
      netIncome: totals.totalIncome - totals.totalExpenses,
    };
  };

  if (isLoadingInitial && !hasInitialDataLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
      </SafeAreaView>
    );
  }

  const chartData = processChartData();
  const categoryData = processCategoryData();
  const { totalIncome, totalExpenses, netIncome } = calculateIncomeVsExpenses();

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
      className="flex-1 bg-gray-200"
      edges={["top", "bottom", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-800">
          Spending Reports
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 120, // Increased padding to account for tab bar
        }}
      >
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
                      ? "bg-[#14B8A6]"
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
                  selectedCategory === null ? "bg-[#14B8A6]" : "bg-gray-200"
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
                      ? "bg-[#14B8A6]"
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
        <View className="mb-6 bg-white p-4 rounded-xl shadow overflow-hidden">
          <Text className="text-lg font-semibold mb-4 px-2">Spending Over Time</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#14B8A6" className="py-8" />
          ) : error ? (
            <Text className="text-red-500 px-2 py-4">{error}</Text>
          ) : chartData.length === 0 ? (
            <View className="items-center py-8">
              <Icon name="bar-chart-outline" size={50} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">No spending data available</Text>
            </View>
          ) : (
            <View style={{ overflow: 'hidden', paddingRight: 20 }}>
              <LineChart
                data={chartData}
                color="#14B8A6"
                thickness={3}
                dataPointsColor="#14B8A6"
                startFillColor="#14B8A6"
                endFillColor="#14B8A6"
                startOpacity={0.2}
                endOpacity={0.0}
                areaChart
                curved
                isAnimated
                animationDuration={1200}
                width={Dimensions.get("window").width - 64} // Adjust based on padding
                height={220}
                noOfSections={4}
                yAxisTextStyle={{ color: "#6B7280", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#6B7280", fontSize: 10 }}
                hideRules
                hideYAxisText={false}
                yAxisLabelPrefix="$"
                pointerConfig={{
                  pointerStripUptoDataPoint: true,
                  pointerStripColor: 'lightgray',
                  pointerStripWidth: 2,
                  strokeDashArray: [2, 5],
                  pointerColor: 'lightgray',
                  radius: 4,
                  pointerLabelWidth: 100,
                  pointerLabelHeight: 120,
                  activatePointersOnLongPress: true,
                  autoAdjustPointerLabelPosition: false,
                  pointerLabelComponent: (items: any) => {
                    const item = items[0];
                    return (
                      <View
                        style={{
                          height: 100,
                          width: 100,
                          backgroundColor: '#282C3E',
                          borderRadius: 4,
                          justifyContent:'center',
                          paddingLeft:16,
                        }}>
                        <Text style={{color: 'lightgray', fontSize:12}}>{item.label}</Text>
                        <Text style={{color: 'white', fontWeight:'bold'}}>${item.value}</Text>
                      </View>
                    );
                  },
                }}
              />
            </View>
          )}
        </View>

        {/* Category breakdown */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow">
          <Text className="text-lg font-semibold mb-4">Category Breakdown</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#14B8A6" />
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
                      className="bg-[#14B8A6] h-full rounded-full"
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

        {/* Net Income summary */}
        <View className="mb-6 bg-white p-4 rounded-xl shadow">
          <Text className="text-lg font-semibold mb-4">Financial Summary</Text>

          <View className="space-y-3">
            {/* Income */}
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Total Income</Text>
              <Text className="text-lg font-semibold text-green-600">
                +${totalIncome.toFixed(2)}
              </Text>
            </View>

            {/* Expenses */}
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Total Expenses</Text>
              <Text className="text-lg font-semibold text-red-600">
                -${totalExpenses.toFixed(2)}
              </Text>
            </View>

            {/* Divider */}
            <View className="border-t border-gray-200 my-2" />

            {/* Net Income */}
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-gray-800">
                Net Income
              </Text>
              <Text
                className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {netIncome >= 0 ? "+" : ""}${netIncome.toFixed(2)}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-gray-500 mt-3">
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
