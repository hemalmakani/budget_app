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

interface BudgetStore {
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (newBudget: Budget) => void;
  deleteBudget: (id: string) => Promise<void>;
  updateBudgetBalance: (budgetId: string, newBalance: number) => void;
}

export interface Transaction {
  transaction_id: string;
  budget_id: string;
  budget_name: string;
  transaction_name: string;
  amount: number;
  created_at: string;
  clerk_id: string;
}

interface TransactionStore {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (
    transaction: Omit<Transaction, "transaction_id" | "created_at">
  ) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  deleteTransaction: (transaction_id: string) => Promise<void>;
}
