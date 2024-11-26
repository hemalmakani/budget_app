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
}));

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],

  addTransaction: async (transaction) => {
    try {
      const response = await fetchAPI("/api/transactions", {
        method: "POST",
        body: JSON.stringify(transaction),
      });

      if (response.error) throw new Error(response.error);

      // Update both the transaction list and the budget balance
      const { transaction_id, budget_balance } = response.data;

      // Update the transactions list
      set((state) => ({
        transactions: [
          ...state.transactions,
          { ...transaction, id: transaction_id },
        ],
      }));

      // Update the budget balance in the budget store
      useBudgetStore
        .getState()
        .updateBudgetBalance(transaction.budget_id, budget_balance);
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
