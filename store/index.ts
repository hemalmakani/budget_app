import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { Alert } from "react-native";
import { TransactionStore } from "@/types/type";

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: [],

  setBudgets: (budgets) => set({ budgets }),

  addBudget: (newBudget) =>
    set((state) => ({
      budgets: [...state.budgets, newBudget],
    })),

  deleteBudget: async (id: number) => {
    try {
      await fetchAPI(`/(api)/budgetCardDelete/${id}`, { method: "DELETE" });

      set((state) => ({
        budgets: state.budgets.filter((budget) => budget.id !== id),
      }));

      Alert.alert("Success", "Budget category deleted successfully!");
    } catch (err) {
      console.error("Failed to delete:", err);
      Alert.alert("Error", "Failed to delete the budget category.");
      throw err; // Re-throw to handle in component if needed
    }
  },
  updateBudgetBalance: (budgetId: string, newBalance: number) =>
    set((state) => ({
      budgets: state.budgets.map((budget) =>
        budget.id === budgetId ? { ...budget, balance: newBalance } : budget
      ),
    })),
}));

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],

  addTransaction: async (transaction) => {
    try {
      const response = await fetchAPI("/(api)/transactions/transaction", {
        method: "POST",
        body: JSON.stringify({
          name: transaction.name,
          categoryId: transaction.categoryId,
          amount: transaction.amount,
          clerkId: transaction.clerk_id,
        }),
      });

      if (response.error) throw new Error(response.error);

      // Update stores with response data
      const { transaction: newTransaction, budget: updatedBudget } =
        response.data;

      set((state) => ({
        transactions: [...state.transactions, newTransaction],
      }));

      // Update budget store
      useBudgetStore
        .getState()
        .updateBudgetBalance(transaction.categoryId, updatedBudget.balance);
    } catch (error) {
      console.error("Failed to add transaction:", error);
      throw error;
    }
  },

  fetchTransactions: async (userId) => {
    try {
      const response = await fetchAPI(`/(api)/transactions/${userId}`);
      if (response.error) throw new Error(response.error);
      set({ transactions: response.data });
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      throw error;
    }
  },
}));
