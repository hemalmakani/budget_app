import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { useBudgetStore } from "./index";
import { useGoalStore } from "./index";
import { useTransactionStore } from "./index";
import { useIncomeStore } from "./index";

interface UserData {
  name: string;
  email: string;
}

interface DataStore {
  isLoading: boolean;
  hasInitialDataLoaded: boolean;
  userData: UserData | null;
  totalIncome: number | null;
  loadAllData: (userId: string) => Promise<void>;
  clearData: () => void;
  setTotalIncome: (total: number | null) => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  isLoading: false,
  hasInitialDataLoaded: false,
  userData: null,
  totalIncome: null,
  loadAllData: async (userId: string) => {
    if (!userId) return;

    set({ isLoading: true, userData: null });
    try {
      // Fetch all data in parallel
      const [
        budgetsResponse,
        transactionsResponse,
        incomesResponse,
        userResponse,
        reportsResponse,
      ] = await Promise.all([
        // Fetch budgets
        fetchAPI(`/(api)/budgetLoad/${userId}`),
        // Fetch transactions
        fetchAPI(`/(api)/transactions/transactionFetch/${userId}`),
        // Fetch incomes
        fetchAPI(`/(api)/incomes/${userId}`),
        // Fetch user data from custom endpoint
        fetchAPI(`/(api)/user/${userId}`),
        // Fetch reports data (last 30 days by default)
        fetchAPI(
          `/(api)/reports/spending/${userId}?startDate=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}&endDate=${new Date().toISOString()}`
        ),
      ]);

      // Update stores with fetched data
      useBudgetStore.getState().setBudgets(budgetsResponse.data);
      useTransactionStore.getState().setTransactions(transactionsResponse.data);
      useIncomeStore.getState().setIncomes(incomesResponse.data);
      useGoalStore.getState().fetchGoals(userId);

      // Store the fetched user data
      set({ userData: userResponse.data, hasInitialDataLoaded: true });
    } catch (error) {
      console.error("Error loading initial data:", error);
      set({ hasInitialDataLoaded: false });
    } finally {
      set({ isLoading: false });
    }
  },
  clearData: () => {
    set({
      isLoading: false,
      hasInitialDataLoaded: false,
      userData: null,
      totalIncome: null,
    });
    // Clear other stores
    useBudgetStore.getState().setBudgets([]);
    useTransactionStore.getState().setTransactions([]);
    useIncomeStore.getState().setIncomes([]);
    useGoalStore.getState().setGoals([]);
  },
  setTotalIncome: (total: number | null) => set({ totalIncome: total }),
}));
