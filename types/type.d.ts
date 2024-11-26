import { TextInputProps, TouchableOpacityProps } from "react-native";

declare interface Driver {
  driver_id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
}

declare interface MarkerData {
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  first_name: string;
  last_name: string;
  time?: number;
  price?: string;
}

declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

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
  balance: string;
  budget: string;
  category: string;
  created_at: string;
  type: "weekly" | "monthly" | "savings";
  budget_id: string;
  clerk_id?: string;
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
  addBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => Promise<void>;
}

declare interface Transaction {
  transaction_id: string;
  budget_id: string;
  transaction_name: string;
  amount: number;
  created_at: string;
  clerk_id: string;
}

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, "id" | "created_at">
  ) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
}
