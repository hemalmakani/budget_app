import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { Alert } from "react-native";
import {
  TransactionStore,
  BudgetStore,
  GoalStore,
  Goal,
  Budget,
  FixedCostStore,
} from "@/types/type";
import { useDataStore } from "@/store/dataStore";

interface Income {
  id: string;
  source_name: string;
  amount: number;
  received_on: string;
  recurring: boolean;
  frequency: string;
  created_at: string;
}

interface IncomeStore {
  incomes: Income[];
  setIncomes: (incomes: Income[]) => void;
  fetchIncomes: (clerkId: string, token?: string | null) => Promise<Income[]>;
  addIncome: (
    newIncome: Omit<Income, "id" | "created_at"> & { clerk_id: string },
    token?: string | null
  ) => Promise<Income>;
  deleteIncome: (
    incomeId: string,
    clerkId: string,
    onTotalIncomeUpdate?: (total: number) => void,
    token?: string | null
  ) => Promise<void>;
}

interface PlaidTransactionData {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  subcategory?: string;
  transaction_type: string;
  pending: boolean;
  transaction_id: string;
  merchant_name?: string;
  iso_currency_code: string;
  location?: any;
  plaid_category_id?: string;
  is_synced_to_transactions: boolean;
  created_at: string;
  updated_at?: string;
  account_name?: string;
  account_type?: string;
  account_subtype?: string;
  account_mask?: string;
}

interface PlaidTransactionStore {
  plaidTransactions: PlaidTransactionData[];
  setPlaidTransactions: (transactions: PlaidTransactionData[]) => void;
  fetchPlaidTransactions: (clerkId: string, token?: string | null) => Promise<PlaidTransactionData[]>;
}

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: [],

  setBudgets: (budgets) => set({ budgets }),

  addBudget: async (newBudget, token?: string | null) => {
    try {
      const response = await fetchAPI(
        "/api/budget",
        {
          method: "POST",
          body: JSON.stringify(newBudget),
        },
        token,
      );

      if (response.error) throw new Error(response.error);

      // Update store with response data
      set((state) => ({
        budgets: [...state.budgets, response.data],
      }));

      // Don't show alert here - let component handle success feedback
      return response.data;
    } catch (error) {
      console.error("Failed to add budget:", error);
      throw error;
    }
  },

  updateBudget: async (
    id: string,
    updatedBudget: Partial<Budget>,
    token?: string | null,
  ) => {
    try {
      console.log("Updating budget with data:", { id, ...updatedBudget });

      const response = await fetchAPI(
        `/api/budgetUpdate/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(updatedBudget),
        },
        token,
      );

      console.log("Update response:", response);

      if (response.error) throw new Error(response.error);

      set((state) => ({
        budgets: state.budgets.map((budget) =>
          budget.id === id ? response.data : budget,
        ),
      }));

      // Don't show alert here - let component handle success feedback
      return response.data;
    } catch (error) {
      console.error("Failed to update budget:", error);
      Alert.alert("Error", "Failed to update the budget category.");
      throw error;
    }
  },

  deleteBudget: async (id: string, token?: string | null) => {
    try {
      const response = await fetchAPI(
        `/api/budgetCardDelete/${id}`,
        {
          method: "DELETE",
        },
        token,
      );

      if (response.error) throw new Error(response.error);

      set((state) => ({
        budgets: state.budgets.filter((budget) => budget.id !== id),
      }));

      // Don't show alert here - let component handle success feedback
    } catch (err) {
      console.error("Failed to delete:", err);
      Alert.alert("Error", "Failed to delete the budget category.");
      throw err;
    }
  },

  updateBudgetBalance: (budgetId: string, newBalance: number) =>
    set((state) => ({
      budgets: state.budgets.map((budget) =>
        budget.id === budgetId ? { ...budget, balance: newBalance } : budget,
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

  addTransaction: async (transaction, token?: string | null) => {
    try {
      const response = await fetchAPI(
        "/api/transactions/transaction",
        {
          method: "POST",
          body: JSON.stringify({
            name: transaction.name,
            categoryId: transaction.categoryId,
            amount: transaction.amount,
            clerkId: transaction.clerk_id,
            category_name: transaction.category_name,
          }),
        },
        token,
      );

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
            : b,
        );
        budgetStore.setBudgets(updatedBudgets);
      }
    } catch (error) {
      console.error("Failed to add transaction:", error);
      throw error;
    }
  },

  updateTransaction: async (
    transaction_id: string,
    updates: {
      name: string;
      amount: number;
      category_id?: string;
      category_name?: string;
    },
    token?: string | null,
  ) => {
    try {
      if (!transaction_id) {
        throw new Error("Transaction ID is required");
      }

      const response = await fetchAPI(
        `/api/transactions/update/${transaction_id}`,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        },
        token,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const { transaction: updatedTransaction, budget } = response.data;

      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.transaction_id === transaction_id
            ? {
                ...t,
                transaction_name: updatedTransaction.name,
                amount: updatedTransaction.amount,
                budget_id: updatedTransaction.category_id,
                budget_name: updatedTransaction.category_name || t.budget_name,
              }
            : t,
        ),
      }));

      // Update budget balance if it changed
      if (budget?.balance != null) {
        const budgetStore = useBudgetStore.getState();
        const updatedBudgets = budgetStore.budgets.map((b) =>
          b.id === budget.budget_id?.toString()
            ? { ...b, balance: budget.balance }
            : b,
        );
        budgetStore.setBudgets(updatedBudgets);
      }

      Alert.alert("Success", "Transaction updated successfully!");
    } catch (err) {
      console.error("Failed to update transaction:", err);
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : "Failed to update the transaction.",
      );
      throw err;
    }
  },

  deleteTransaction: async (transaction_id: string, token?: string | null) => {
    try {
      if (!transaction_id) {
        throw new Error("Transaction ID is required");
      }

      const response = await fetchAPI(
        `/api/transactions/${transaction_id}`,
        {
          method: "DELETE",
        },
        token,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const { transaction, budget } = response.data;
      const category_id = transaction.category_id;

      set((state) => ({
        transactions: state.transactions.filter(
          (t) => t.transaction_id !== transaction_id,
        ),
      }));

      if (category_id && budget?.balance != null) {
        const budgetStore = useBudgetStore.getState();
        const updatedBudgets = budgetStore.budgets.map((b) =>
          b.id === category_id.toString()
            ? { ...b, balance: budget.balance }
            : b,
        );
        budgetStore.setBudgets(updatedBudgets);
      }

      // If it was an income transaction, update the total income
      if (transaction.type === "income" && transaction.clerk_id) {
        try {
          const totalResponse = await fetchAPI(
            `/api/incomes/total/${transaction.clerk_id}`,
            undefined,
            token,
          );
          if (totalResponse.data) {
            const dataStore = useDataStore.getState();
            dataStore.setTotalIncome(Number(totalResponse.data.total) || 0);
          }
        } catch (error) {
          console.error(
            "Failed to refresh total income after deleting income transaction:",
            error,
          );
        }
      }

      Alert.alert("Success", "Transaction deleted successfully!");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : "Failed to delete the transaction.",
      );
      throw err;
    }
  },
}));

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],

  setGoals: (goals) => set({ goals }),

  fetchGoals: async (clerkId: string, token?: string | null) => {
    try {
      const response = await fetchAPI(
        `/api/goals/${clerkId}`,
        undefined,
        token,
      );

      if (response.error) throw new Error(response.error);

      set({ goals: response.data });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      throw error;
    }
  },

  addGoal: async (newGoal, token?: string | null) => {
    try {
      const response = await fetchAPI(
        "/api/goals/add/add-goal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newGoal),
        },
        token,
      );

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

  updateGoal: async (
    id: string,
    updatedGoal: Partial<Goal>,
    token?: string | null,
  ) => {
    try {
      const response = await fetchAPI(
        `/api/goals/update/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedGoal),
        },
        token,
      );

      if (response.error) throw new Error(response.error);

      const updatedGoalData = response.data;

      set((state) => ({
        goals: state.goals.map((goal) =>
          goal.id === id ? updatedGoalData : goal,
        ),
      }));

      Alert.alert("Success", "Goal updated successfully!");
      return updatedGoalData;
    } catch (error) {
      console.error("Failed to update goal:", error);
      Alert.alert("Error", "Failed to update the goal.");
      throw error;
    }
  },

  deleteGoal: async (id: string, token?: string | null) => {
    try {
      const response = await fetchAPI(
        `/api/goals/${id}`,
        {
          method: "DELETE",
        },
        token,
      );

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

export const useFixedCostStore = create<FixedCostStore>((set) => ({
  fixedCosts: [],

  setFixedCosts: (fixedCosts) => set({ fixedCosts }),

  fetchFixedCosts: async (clerkId: string, token?: string | null) => {
    try {
      const response = await fetchAPI(
        `/api/fixed-costs/fetch/${clerkId}`,
        undefined,
        token,
      );
      if (response.error) throw new Error(response.error);
      set({ fixedCosts: response.data });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch fixed costs:", error);
      throw error;
    }
  },

  addFixedCost: async (newFixedCost, token?: string | null) => {
    try {
      const response = await fetchAPI(
        "/api/fixed-costs/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newFixedCost),
        },
        token,
      );
      if (!response.data) {
        throw new Error(response.error || "Failed to create fixed cost");
      }
      const fixedCost = response.data;
      set((state) => ({
        fixedCosts: [...state.fixedCosts, fixedCost],
      }));
      return fixedCost;
    } catch (error) {
      console.error("Failed to add fixed cost:", error);
      throw error;
    }
  },

  updateFixedCost: async (id, updatedFixedCost, token?: string | null) => {
    try {
      const response = await fetchAPI(
        `/api/fixed-costs/update/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedFixedCost),
        },
        token,
      );
      if (response.error) throw new Error(response.error);
      const updated = response.data;
      set((state) => ({
        fixedCosts: state.fixedCosts.map((fc) => (fc.id === id ? updated : fc)),
      }));
      return updated;
    } catch (error) {
      console.error("Failed to update fixed cost:", error);
      throw error;
    }
  },

  deleteFixedCost: async (id, token?: string | null) => {
    try {
      // Get the fixed cost to get its clerk_id
      const fixedCost = useFixedCostStore
        .getState()
        .fixedCosts.find((fc) => fc.id === id);
      if (!fixedCost) {
        throw new Error("Fixed cost not found");
      }

      const response = await fetchAPI(
        `/api/fixed-costs/delete/${id}?clerk_id=${fixedCost.clerk_id}`,
        {
          method: "DELETE",
        },
        token,
      );
      if (response.error) throw new Error(response.error);
      set((state) => ({
        fixedCosts: state.fixedCosts.filter((fc) => fc.id !== id),
      }));
      Alert.alert("Success", "Fixed cost deleted successfully!");
    } catch (error) {
      console.error("Failed to delete fixed cost:", error);
      Alert.alert("Error", "Failed to delete fixed cost");
      throw error;
    }
  },
}));

export const useIncomeStore = create<IncomeStore>((set) => ({
  incomes: [],

  setIncomes: (incomes) => set({ incomes }),

  fetchIncomes: async (clerkId: string, token?: string | null) => {
    try {
      const response = await fetchAPI(
        `/api/incomes/${clerkId}`,
        undefined,
        token,
      );
      if (response.error) throw new Error(response.error);
      set({ incomes: response.data });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch incomes:", error);
      throw error;
    }
  },

  addIncome: async (newIncome, token?: string | null) => {
    try {
      const response = await fetchAPI(
        "/api/incomes/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newIncome),
        },
        token,
      );
      if (response.error) throw new Error(response.error);
      const income = response.data;

      // Only add to incomes state if it's recurring
      // One-time incomes go to transactions table and shouldn't appear in incomes list
      if (newIncome.recurring) {
        set((state) => ({
          incomes: [...state.incomes, income],
        }));
      } else {
        // For one-time incomes, refresh the transactions list since they're stored there
        try {
          const transactionsResponse = await fetchAPI(
            `/api/transactions/transactionFetch/${newIncome.clerk_id}`,
            undefined,
            token,
          );
          if (!transactionsResponse.error) {
            useTransactionStore
              .getState()
              .setTransactions(transactionsResponse.data);
          }
        } catch (error) {
          console.error(
            "Failed to refresh transactions after adding one-time income:",
            error,
          );
        }
      }

      return income;
    } catch (error) {
      console.error("Failed to add income:", error);
      throw error;
    }
  },

  deleteIncome: async (
    incomeId: string,
    clerkId: string,
    onTotalIncomeUpdate?: (total: number) => void,
    token?: string | null,
  ) => {
    try {
      const response = await fetchAPI(
        `/api/incomes/delete/${incomeId}`,
        {
          method: "DELETE",
        },
        token,
      );
      if (response.error) throw new Error(response.error);

      // Update the incomes state
      set((state) => ({
        incomes: state.incomes.filter((income) => income.id !== incomeId),
      }));

      // Fetch updated total income for the current year
      if (clerkId && onTotalIncomeUpdate) {
        const totalResponse = await fetchAPI(
          `/api/incomes/total/${clerkId}`,
          undefined,
          token,
        );
        if (totalResponse.error) throw new Error(totalResponse.error);

        // Call the callback to update the total income
        onTotalIncomeUpdate(Number(totalResponse.data.total) || 0);
      }

      Alert.alert("Success", "Income deleted successfully!");
    } catch (error) {
      console.error("Failed to delete income:", error);
      Alert.alert("Error", "Failed to delete income");
      throw error;
    }
  },
}));

export const usePlaidTransactionStore = create<PlaidTransactionStore>(
  (set) => ({
    plaidTransactions: [],

    setPlaidTransactions: (transactions) =>
      set({ plaidTransactions: transactions }),

    fetchPlaidTransactions: async (clerkId: string, token?: string | null) => {
      try {
        const response = await fetchAPI(
          `/api/plaid/fetch-transactions?id=${clerkId}`,
          undefined,
          token,
        );
        if (response.error) throw new Error(response.error);

        set({ plaidTransactions: response.data });
        return response.data;
      } catch (error) {
        console.error("Failed to fetch Plaid transactions:", error);
        throw error;
      }
    },
  }),
);
