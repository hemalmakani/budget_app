import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useBudgetStore } from "@/store";
import { useAuth } from "@clerk/clerk-expo";
import { Budget } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const EditBudget = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EditBudgetContent />
    </>
  );
};

const EditBudgetContent = () => {
  const router = useRouter();
  const { getToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { budgets, updateBudget } = useBudgetStore();

  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [type, setType] = useState<"weekly" | "monthly" | "savings">("monthly");
  const [loading, setLoading] = useState(false);
  const [initialBudget, setInitialBudget] = useState<Budget | null>(null);

  useEffect(() => {
    if (id && budgets.length > 0) {
      const budgetToEdit = budgets.find((b) => b.id === id);
      if (budgetToEdit) {
        setCategory(budgetToEdit.category);
        setBudget(budgetToEdit.budget.toString());
        setType(budgetToEdit.type);
        setInitialBudget(budgetToEdit);
        console.log("Budget type loaded:", budgetToEdit.type); // Debug log
      } else {
        Alert.alert("Error", "Budget not found");
        router.back();
      }
    }
  }, [id, budgets]);

  const handleSubmit = async () => {
    // Prevent double submission
    if (loading) return;

    if (!category.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    if (!budget.trim() || isNaN(Number(budget)) || Number(budget) <= 0) {
      Alert.alert("Error", "Please enter a valid budget amount");
      return;
    }

    if (!id || !initialBudget) {
      Alert.alert("Error", "Budget ID is missing");
      return;
    }

    console.log("Submitting with type:", type); // Debug log

    const updateData = {
      category,
      budget: Number(budget),
      type,
    };

    console.log("Update data being sent:", updateData);

    try {
      setLoading(true);
      const token = await getToken();
      await updateBudget(id, updateData, token);
      router.back();
    } catch (error) {
      console.error("Failed to update budget:", error);
      Alert.alert("Error", "Failed to update budget");
    } finally {
      setLoading(false);
    }
  };

  if (!initialBudget) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom", "left", "right"]}
      >
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={["top", "bottom", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Budget</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g., Groceries, Rent, Entertainment"
            />

            <Text style={styles.label}>Budget Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={budget}
                onChangeText={setBudget}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Budget Type</Text>
            <View style={styles.typeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "monthly" && styles.typeButtonActive,
                ]}
                onPress={() => setType("monthly")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "monthly" && styles.typeButtonTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "weekly" && styles.typeButtonActive,
                ]}
                onPress={() => setType("weekly")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "weekly" && styles.typeButtonTextActive,
                  ]}
                >
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "savings" && styles.typeButtonActive,
                ]}
                onPress={() => setType("savings")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "savings" && styles.typeButtonTextActive,
                  ]}
                >
                  Savings
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Updating..." : "Update Budget"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  currencySymbol: {
    paddingLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  amountInput: {
    flex: 1,
    padding: 12,
  },
  typeButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  typeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  typeButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditBudget;
