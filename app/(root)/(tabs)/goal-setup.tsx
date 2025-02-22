import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "@/components/InputField";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useBudgetStore, useGoalStore } from "@/store/index";
import { Ionicons } from "@expo/vector-icons";
import { ReactNativeModal } from "react-native-modal";
import { Budget } from "@/types/type";
import { Alert } from "react-native";  // Add this at the top with other imports

const GoalSetup = () => {
  const { user } = useUser();
  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState<"percentage" | "amount">(
    "percentage"
  );
  const { addGoal } = useGoalStore();
  const [targetAmount, setTargetAmount] = useState("");
  const [targetPercentage, setTargetPercentage] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const { budgets } = useBudgetStore();
  const [selectedCategory, setSelectedCategory] = useState<Budget | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const handleDateChange = (newDate: Date) => {
    setTargetDate(newDate);
    setShowDatePicker(false);
  };

  // GoalSetup.tsx
  const handleSubmit = async () => {
    try {
      if (!goalName.trim()) {
        Alert.alert("Error", "Please enter a goal name");
        return;
      }

      if (goalType === "amount" && !targetAmount) {
        Alert.alert("Error", "Please enter a target amount");
        return;
      }

      if (goalType === "percentage" && !targetPercentage) {
        Alert.alert("Error", "Please enter a target percentage");
        return;
      }

      const goalData = {
        clerk_id: user?.id,
        goal_name: goalName,
        goal_type: goalType.toUpperCase(),
        target_amount: goalType === "amount" ? parseFloat(targetAmount) : null,
        target_percentage:
          goalType === "percentage" ? parseFloat(targetPercentage) : null,
        start_date: new Date().toISOString(),
        target_date: targetDate?.toISOString() || null,
        status: "ACTIVE",
        category_id: selectedCategory?.id || null,
      };

      await addGoal(goalData);
      Alert.alert("Success", "Goal created successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to create goal:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create goal. Please try again."
      );
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["bottom", "left", "right"]}
    >
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-6">Set Your Budget Goal</Text>

        <InputField
          label="Goal Name"
          placeholder="Enter your goal name"
          value={goalName}
          onChangeText={setGoalName}
        />

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">Goal Type</Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => setGoalType("percentage")}
              className={`flex-1 p-4 rounded-lg border ${
                goalType === "percentage"
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  goalType === "percentage" ? "text-white" : "text-gray-700"
                }`}
              >
                Percentage
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGoalType("amount")}
              className={`flex-1 p-4 rounded-lg border ${
                goalType === "amount"
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  goalType === "amount" ? "text-white" : "text-gray-700"
                }`}
              >
                Amount
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">
            Link to Category (Optional)
          </Text>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            className="p-4 rounded-lg border border-gray-300 flex-row justify-between items-center"
          >
            <Text>
              {selectedCategory
                ? selectedCategory.category
                : "Select a category"}
            </Text>
            <Ionicons name="chevron-up" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {goalType === "amount" ? (
          <InputField
            label="Target Amount"
            placeholder="Enter target amount"
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="decimal-pad"
          />
        ) : (
          <InputField
            label="Target Percentage"
            placeholder="Enter target percentage"
            value={targetPercentage}
            onChangeText={setTargetPercentage}
            keyboardType="decimal-pad"
          />
        )}

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">
            Target Date (Optional
            {goalType === "amount" ? "" : " for percentage goals"})
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="p-4 rounded-lg border border-gray-300"
          >
            <Text>
              {targetDate ? targetDate.toLocaleDateString() : "Select Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <CustomDatePicker
          isVisible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onDateChange={handleDateChange}
          initialDate={targetDate || new Date()}
        />
      </ScrollView>

      <View className="p-3 mb-14">
        <CustomButton
          title="Create Goal"
          onPress={handleSubmit}
          className="mb-4"
        />
      </View>

      <ReactNativeModal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View className="bg-white rounded-t-3xl p-6 h-2/3 shadow-lg">
          <View className="flex-row justify-between items-center mb-4">
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

interface CustomDatePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  initialDate: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  isVisible,
  onClose,
  onDateChange,
  initialDate,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleConfirm = () => {
    onDateChange(selectedDate);
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.headerButton}>Confirm</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerContainer}>
            <ScrollPicker
              items={Array.from({ length: 31 }, (_, i) =>
                String(i + 1).padStart(2, "0")
              )}
              selectedIndex={selectedDate.getDate() - 1}
              onValueChange={(value) => {
                const newDate = new Date(selectedDate);
                newDate.setDate(parseInt(value));
                setSelectedDate(newDate);
              }}
            />
            <ScrollPicker
              items={[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ]}
              selectedIndex={selectedDate.getMonth()}
              onValueChange={(value) => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(
                  [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].indexOf(value)
                );
                setSelectedDate(newDate);
              }}
            />
            <ScrollPicker
              items={Array.from({ length: 10 }, (_, i) =>
                String(new Date().getFullYear() + i)
              )}
              selectedIndex={
                selectedDate.getFullYear() - new Date().getFullYear()
              }
              onValueChange={(value) => {
                const newDate = new Date(selectedDate);
                newDate.setFullYear(parseInt(value));
                setSelectedDate(newDate);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onValueChange: (value: string) => void;
}

const ScrollPicker: React.FC<ScrollPickerProps> = ({
  items,
  selectedIndex,
  onValueChange,
}) => {
  return (
    <ScrollView
      style={styles.scrollPicker}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item, index) => (
        <TouchableOpacity
          key={item}
          onPress={() => onValueChange(item)}
          style={[
            styles.scrollPickerItem,
            index === selectedIndex && styles.scrollPickerItemSelected,
          ]}
        >
          <Text
            style={[
              styles.scrollPickerItemText,
              index === selectedIndex && styles.scrollPickerItemTextSelected,
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerButton: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  scrollPicker: {
    height: 200,
    width: 80,
  },
  scrollPickerItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollPickerItemSelected: {
    backgroundColor: "#F0F0F0",
  },
  scrollPickerItemText: {
    fontSize: 16,
  },
  scrollPickerItemTextSelected: {
    fontWeight: "bold",
  },
});

export default GoalSetup;
