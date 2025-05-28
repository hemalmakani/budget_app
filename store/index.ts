import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { Alert } from "react-native";
import {
  TransactionStore,
  BudgetStore,
  GoalStore,
  Goal,
  Budget,
  FixedCost,
  FixedCostStore,
} from "@/types/type";

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
  fetchIncomes: (clerkId: string) => Promise<Income[]>;
  addIncome: (
    newIncome: Omit<Income, "id" | "created_at"> & { clerk_id: string }
  ) => Promise<Income>;
  deleteIncome: (
    incomeId: string,
    clerkId: string,
    onTotalIncomeUpdate?: (total: number) => void
  ) => Promise<void>;
}

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

      // Don't show alert here - let component handle success feedback
      return response.data;
    } catch (error) {
      console.error("Failed to add budget:", error);
      throw error;
    }
  },

  updateBudget: async (id: string, updatedBudget: Partial<Budget>) => {
    try {
      console.log("Updating budget with data:", { id, ...updatedBudget });

      const response = await fetchAPI(`/(api)/budgetUpdate/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedBudget),
      });

      console.log("Update response:", response);

      if (response.error) throw new Error(response.error);

      set((state) => ({
        budgets: state.budgets.map((budget) =>
          budget.id === id ? response.data : budget
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

  deleteBudget: async (id: string) => {
    try {
      const response = await fetchAPI(`/(api)/budgetCardDelete/${id}`, {
        method: "DELETE",
      });

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

  fetchGoals: async (clerkId: string) => {
    try {
      const response = await fetchAPI(`/(api)/goals/${clerkId}`);

      if (response.error) throw new Error(response.error);

      set({ goals: response.data });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      throw error;
    }
  },

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

  updateGoal: async (id: string, updatedGoal: Partial<Goal>) => {
    try {
      const response = await fetchAPI(`/(api)/goals/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedGoal),
      });

      if (response.error) throw new Error(response.error);

      const updatedGoalData = response.data;

      set((state) => ({
        goals: state.goals.map((goal) =>
          goal.id === id ? updatedGoalData : goal
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

export const useFixedCostStore = create<FixedCostStore>((set) => ({
  fixedCosts: [],

  setFixedCosts: (fixedCosts) => set({ fixedCosts }),

  fetchFixedCosts: async (clerkId: string) => {
    try {
      const response = await fetchAPI(`/(api)/fixed-costs/fetch/${clerkId}`);
      if (response.error) throw new Error(response.error);
      set({ fixedCosts: response.data });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch fixed costs:", error);
      throw error;
    }
  },

  addFixedCost: async (newFixedCost) => {
    try {
      const response = await fetchAPI("/(api)/fixed-costs/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newFixedCost),
      });
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

  updateFixedCost: async (id, updatedFixedCost) => {
    try {
      const response = await fetchAPI(`/(api)/fixed-costs/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFixedCost),
      });
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

  deleteFixedCost: async (id) => {
    try {
      // Get the fixed cost to get its clerk_id
      const fixedCost = useFixedCostStore
        .getState()
        .fixedCosts.find((fc) => fc.id === id);
      if (!fixedCost) {
        throw new Error("Fixed cost not found");
      }

      const response = await fetchAPI(
        `/(api)/fixed-costs/delete/${id}?clerk_id=${fixedCost.clerk_id}`,
        {
          method: "DELETE",
        }
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

  fetchIncomes: async (clerkId: string) => {
    try {
      const response = await fetchAPI(`/(api)/incomes/${clerkId}`);
      if (response.error) throw new Error(response.error);
      set({ incomes: response.data });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch incomes:", error);
      throw error;
    }
  },

  addIncome: async (newIncome) => {
    try {
      const response = await fetchAPI("/(api)/incomes/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newIncome),
      });
      if (response.error) throw new Error(response.error);
      const income = response.data;
      set((state) => ({
        incomes: [...state.incomes, income],
      }));
      return income;
    } catch (error) {
      console.error("Failed to add income:", error);
      throw error;
    }
  },

  deleteIncome: async (
    incomeId: string,
    clerkId: string,
    onTotalIncomeUpdate?: (total: number) => void
  ) => {
    try {
      const response = await fetchAPI(`/(api)/incomes/delete/${incomeId}`, {
        method: "DELETE",
      });
      if (response.error) throw new Error(response.error);

      // Update the incomes state
      set((state) => ({
        incomes: state.incomes.filter((income) => income.id !== incomeId),
      }));

      // Fetch updated total income for the current year
      if (clerkId && onTotalIncomeUpdate) {
        const totalResponse = await fetchAPI(`/(api)/incomes/total/${clerkId}`);
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
