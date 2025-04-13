import { create } from "zustand";
import { fetchAPI } from "@/lib/fetch";
import { useBudgetStore } from "./index";
import { useGoalStore } from "./index";
import { useTransactionStore } from "./index";

interface UserData {
  name: string;
  email: string;
}

interface DataStore {
  isLoading: boolean;
  hasInitialDataLoaded: boolean;
  userData: UserData | null;
  loadAllData: (userId: string) => Promise<void>;
}

export const useDataStore = create<DataStore>((set, get) => ({
  isLoading: false,
  hasInitialDataLoaded: false,
  userData: null,
  loadAllData: async (userId: string) => {
    if (!userId) return;

    set({ isLoading: true, userData: null });
    try {
      // Fetch all data in parallel
      const [
        budgetsResponse,
        transactionsResponse,
        userResponse,
        reportsResponse,
      ] = await Promise.all([
        // Fetch budgets
        fetchAPI(`/(api)/budgetLoad/${userId}`),
        // Fetch transactions
        fetchAPI(`/(api)/transactions/transactionFetch/${userId}`),
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
}));
