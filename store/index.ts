import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { Alert } from "react-native";
import { TransactionStore, BudgetStore, GoalStore } from "@/types/type";

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: [],

  setBudgets: (budgets) => set({ budgets }),

  addBudget: async (newBudget) => {
    try {
      const response = await fetchAPI("/(api)/budget", {
        method: "POST",
        body: JSON.stringify(newBudget),
      });

      if (response.error) throw new Error(response.error);

      // Update store with response data
      set((state) => ({
        budgets: [...state.budgets, response.data],
      }));

      Alert.alert("Success", "Budget category added successfully!");
      return response.data;
    } catch (error) {
      console.error("Failed to add budget:", error);
      throw error;
    }
  },

  deleteBudget: async (id: string) => {
    try {
      const response = await fetchAPI(`/(api)/budgetCardDelete/${id}`, {
        method: "DELETE",
      });

      if (response.error) throw new Error(response.error);

      set((state) => ({
        budgets: state.budgets.filter((budget) => budget.id !== id),
      }));

      Alert.alert("Success", "Budget category deleted successfully!");
    } catch (err) {
      console.error("Failed to delete:", err);
      Alert.alert("Error", "Failed to delete the budget category.");
      throw err;
    }
  },

  updateBudgetBalance: (budgetId: string, newBalance: number) =>
    set((state) => ({
      budgets: state.budgets.map((budget) =>
        budget.id === budgetId ? { ...budget, balance: newBalance } : budget
      ),
    })),
}));

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],

  setTransactions: (transactions) => {
    // Format transactions to match expected structure
    const formattedTransactions = transactions.map((t) => ({
      ...t,
      transaction_id: t.id.toString(),
      transaction_name: t.name,
      budget_id: t.category_id,
      budget_name: t.category_name,
      source: "manual" as const,
    }));
    set({ transactions: formattedTransactions });
  },

  addTransaction: async (transaction) => {
    try {
      const response = await fetchAPI("/(api)/transactions/transaction", {
        method: "POST",
        body: JSON.stringify({
          name: transaction.name,
          categoryId: transaction.categoryId,
          amount: transaction.amount,
          clerkId: transaction.clerk_id,
          category_name: transaction.category_name,
        }),
      });

      if (response.error) throw new Error(response.error);

      const { transaction: newTransaction, budget: updatedBudget } =
        response.data;

      const formattedTransaction = {
        ...newTransaction,
        transaction_id: newTransaction.id.toString(),
        transaction_name: newTransaction.name,
        budget_id: newTransaction.category_id,
        budget_name: transaction.category_name,
        source: "manual" as const,
      };

      set((state) => ({
        transactions: [...state.transactions, formattedTransaction],
      }));

      if (transaction.categoryId && updatedBudget?.balance != null) {
        const budgetStore = useBudgetStore.getState();
        const updatedBudgets = budgetStore.budgets.map((b) =>
          b.id === transaction.categoryId
            ? { ...b, balance: updatedBudget.balance }
            : b
        );
        budgetStore.setBudgets(updatedBudgets);
      }
    } catch (error) {
      console.error("Failed to add transaction:", error);
      throw error;
    }
  },

  deleteTransaction: async (transaction_id: string) => {
    try {
      if (!transaction_id) {
        throw new Error("Transaction ID is required");
      }

      const response = await fetchAPI(`/(api)/transactions/${transaction_id}`, {
        method: "DELETE",
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const { transaction, budget } = response.data;
      const category_id = transaction.category_id;

      set((state) => ({
        transactions: state.transactions.filter(
          (t) => t.transaction_id !== transaction_id
        ),
      }));

      if (category_id && budget?.balance != null) {
        const budgetStore = useBudgetStore.getState();
        const updatedBudgets = budgetStore.budgets.map((b) =>
          b.id === category_id.toString()
            ? { ...b, balance: budget.balance }
            : b
        );
        budgetStore.setBudgets(updatedBudgets);
      }

      Alert.alert("Success", "Transaction deleted successfully!");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete the transaction."
      );
      throw err;
    }
  },
}));

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],

  setGoals: (goals) => set({ goals }),

  addGoal: async (newGoal) => {
    try {
      const response = await fetchAPI("/(api)/goals/add/add-goal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newGoal),
      });

      if (!response.data) {
        throw new Error(response.error || "Failed to create goal");
      }

      const goal = response.data;

      set((state) => ({
        goals: [...state.goals, goal],
      }));

      return goal;
    } catch (error) {
      console.error("Failed to add goal:", error);
      throw error;
    }
  },

  deleteGoal: async (id: string) => {
    try {
      const response = await fetchAPI(`/(api)/goals/${id}`, {
        method: "DELETE",
      });

      if (response.error) throw new Error(response.error);

      set((state) => ({
        goals: state.goals.filter((goal) => goal.id !== id),
      }));

      Alert.alert("Success", "Goal deleted successfully!");
    } catch (error) {
      console.error("Failed to delete goal:", error);
      Alert.alert("Error", "Failed to delete the goal.");
      throw error;
    }
  },
}));
