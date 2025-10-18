import { View, Text, TouchableOpacity } from "react-native";
import type { PlaidAccount } from "@/types/plaid";

interface AccountCardProps {
  account: PlaidAccount;
  onPress?: () => void;
}

export default function AccountCard({ account, onPress }: AccountCardProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get account type display name
  const getAccountTypeDisplay = () => {
    if (account.subtype) {
      return account.subtype.charAt(0).toUpperCase() + account.subtype.slice(1);
    }
    if (account.type) {
      return account.type.charAt(0).toUpperCase() + account.type.slice(1);
    }
    return "Account";
  };

  const getAccountTypeColor = () => {
    switch (account.type) {
      case "depository":
        return "bg-blue-500";
      case "credit":
        return "bg-purple-500";
      case "loan":
        return "bg-orange-500";
      case "investment":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Determine if balance is positive or negative for styling
  const getBalanceColor = () => {
    if (account.type === "credit" || account.type === "loan") {
      return account.current_balance <= 0 ? "text-green-600" : "text-gray-900";
    }
    return account.current_balance >= 0 ? "text-gray-900" : "text-red-600";
  };

  const utilizationPercent = account.credit_limit
    ? (Math.abs(account.current_balance) / account.credit_limit) * 100
    : 0;

  const getUtilizationColor = () => {
    if (utilizationPercent > 70) return "bg-red-500";
    if (utilizationPercent > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const CardContent = (
    <View className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-200">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
            {account.official_name || account.name}
          </Text>
          <Text className="text-xs text-gray-400">
            {[
              account.institution_name,
              account.mask ? `•••• ${account.mask}` : "",
            ]
              .filter(Boolean)
              .join(" ") || "Account"}
          </Text>
        </View>
        <View className={`${getAccountTypeColor()} px-2 py-1 rounded-md`}>
          <Text className="text-white text-[10px] font-bold uppercase">
            {getAccountTypeDisplay()}
          </Text>
        </View>
      </View>

      <View className="flex-row items-end justify-between">
        <View className="flex-1">
          <Text className={`text-xl font-bold ${getBalanceColor()}`}>
            {formatCurrency(account.current_balance)}
          </Text>
          {account.available_balance !== null &&
            account.available_balance !== undefined &&
            account.available_balance !== account.current_balance && (
              <Text className="text-xs text-gray-500">{`Avail: ${formatCurrency(account.available_balance)}`}</Text>
            )}
        </View>

        {account.credit_limit && account.credit_limit > 0 && (
          <View className="flex-1 max-w-[45%]">
            <Text className="text-[10px] text-gray-500 text-right mb-1">
              {`${utilizationPercent.toFixed(0)}% of ${formatCurrency(account.credit_limit)}`}
            </Text>
            <View className="bg-gray-200 h-1 rounded-full overflow-hidden">
              <View
                className={`h-full ${getUtilizationColor()}`}
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="w-full"
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}
