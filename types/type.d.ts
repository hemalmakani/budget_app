import { TextInputProps, TouchableOpacityProps } from "react-native";

// export interface Budget {
//   id: number;
//   category: string;
//   type: "weekly" | "monthly" | "savings";
//   balance: number;
//   budget: number;
//   clerk_id: string;
//   created_at: string;
// }

export interface Budget {
  balance: number;
  budget: number;
  category: string;
  created_at: string;
  type: "weekly" | "monthly" | "savings";
  id: string;
  clerk_id?: string;
  last_reset?: string;
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}

declare interface GoogleInputProps {
  icon?: string;
  initialLocation?: string;
  containerStyle?: string;
  textInputBackgroundColor?: string;
  handlePress: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driverId: number;
  rideTime: number;
}

export interface NewBudget {
  category: string;
  type: "weekly" | "monthly" | "savings";
  budget: number;
  balance: number;
  clerkId: string;
}

interface BudgetStore {
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (newBudget: NewBudget) => Promise<Budget>;
  updateBudget: (id: string, updatedBudget: Partial<Budget>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  updateBudgetBalance: (budgetId: string, newBalance: number) => void;
}

export interface APITransaction {
  id: string;
  name: string;
  category_id: string;
  amount: number;
  created_at: string;
  category_name: string;
  category_type?: string;
  clerk_id: string;
}

export interface Transaction {
  transaction_id: string;
  transaction_name: string;
  budget_id: string;
  budget_name: string;
  amount: number;
  created_at: string;
  clerk_id: string;
  category_type?: string;
  source: "manual";
}

interface GoalStore {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  fetchGoals: (clerkId: string) => Promise<Goal[]>;
  addGoal: (goal: {
    clerk_id: string;
    goal_name: string;
    goal_type: "PERCENTAGE" | "AMOUNT";
    target_amount: number | null;
    target_percentage: number | null;
    start_date: string;
    target_date: string | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    category_id: string | null;
  }) => Promise<Goal>;
  updateGoal: (id: string, updatedGoal: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (goal_id: string) => Promise<void>;
}

interface TransactionStore {
  transactions: Transaction[];
  setTransactions: (transactions: APITransaction[]) => void;
  addTransaction: (transaction: {
    name: string;
    categoryId: string;
    amount: number;
    clerk_id: string;
    category_name: string;
  }) => Promise<void>;
  deleteTransaction: (transaction_id: string) => Promise<void>;
}

export interface Goal {
  id: string;
  clerk_id: string;
  goal_name: string;
  goal_type: "PERCENTAGE" | "AMOUNT";
  target_amount: number | null;
  target_percentage: number | null;
  current_amount: number;
  start_date: string;
  target_date: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  category_id: string | null;
  created_at: string;
  updated_at: string;
}
