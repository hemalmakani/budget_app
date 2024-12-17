import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { Alert } from "react-native";
import { TransactionStore, BudgetStore } from "@/types/type";

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

  setTransactions: (transactions) => set({ transactions }),

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

      // Update stores with response data
      const { transaction: newTransaction, budget: updatedBudget } =
        response.data;

      // Ensure transaction_id is properly set
      const formattedTransaction = {
        ...newTransaction,
        transaction_id: newTransaction.id.toString(),
        budget_name: transaction.category_name,
        transaction_name: transaction.name,
      };

      set((state) => ({
        transactions: [...state.transactions, formattedTransaction],
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
      const response = await fetchAPI(
        `/(api)/transactions/transactionFetch/${userId}`
      );
      if (response.error) throw new Error(response.error);
      set({ transactions: response.data });
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      throw error;
    }
  },
  deleteTransaction: async (transaction_id: string) => {
    try {
      console.log("Delete transaction ID:", transaction_id);

      // Verify the transaction ID is not undefined or empty
      if (!transaction_id) {
        throw new Error("Transaction ID is required");
      }

      const response = await fetchAPI(`/(api)/transactions/${transaction_id}`, {
        method: "DELETE",
      });

      console.log("Delete API response:", response);

      if (response.error) {
        throw new Error(response.error);
      }

      const { category_id, budget } = response.data;

      // Update transactions state
      set((state) => ({
        transactions: state.transactions.filter(
          (transaction) => transaction.transaction_id !== transaction_id
        ),
      }));

      // Update budget state if the API provided necessary data
      if (category_id && budget?.balance != null) {
        useBudgetStore
          .getState()
          .updateBudgetBalance(category_id, budget.balance);
      }

      Alert.alert("Success", "Transaction deleted successfully!");
    } catch (err) {
      console.error("Failed to delete full error:", err);
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to delete the transaction."
      );
      throw err;
    }
  },
}));
