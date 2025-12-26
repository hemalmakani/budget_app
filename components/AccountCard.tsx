"use client"

import { View, Text, Alert, Image } from "react-native"
import { icons } from "@/constants"
import type { PlaidAccount } from "@/types/plaid"

interface AccountCardProps {
  account: PlaidAccount
  onPress?: () => void
  onRemove?: () => void
}

export default function AccountCard({ account, onPress, onRemove }: AccountCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDayChange = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }

  const hasDayChange = account.day_change_amount !== null && account.day_change_amount !== undefined
  const isPositiveChange = (account.day_change_amount ?? 0) >= 0

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
  }

  const isCreditCard = account.type === "credit"
  const showLiabilityInfo = isCreditCard && (account.next_payment_due_date || account.next_payment_amount)

  const getAccountTypeDisplay = () => {
    if (account.subtype) return account.subtype.charAt(0).toUpperCase() + account.subtype.slice(1)
    if (account.type) return account.type.charAt(0).toUpperCase() + account.type.slice(1)
    return "Account"
  }

  const getAccountTypeColor = () => {
    switch (account.type) {
      case "depository":
        return "bg-blue-500"
      case "credit":
        return "bg-violet-500"
      case "loan":
        return "bg-amber-500"
      case "investment":
        return "bg-emerald-500"
      default:
        return "bg-slate-500"
    }
  }

  const getBalanceColor = () => {
    if (account.type === "credit" || account.type === "loan") {
      return account.current_balance <= 0 ? "text-emerald-600" : "text-slate-900"
    }
    return account.current_balance >= 0 ? "text-slate-900" : "text-red-600"
  }

  const utilizationPercent = account.credit_limit ? (Math.abs(account.current_balance) / account.credit_limit) * 100 : 0

  const getUtilizationColor = () => {
    if (utilizationPercent > 70) return "bg-red-500"
    if (utilizationPercent > 50) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const handleRemovePress = () => {
    Alert.alert("Unlink Account", `Are you sure you want to unlink ${account.official_name || account.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Unlink", style: "destructive", onPress: onRemove },
    ])
  }

  return (
    <View
      className="bg-white rounded-2xl overflow-hidden mb-3 border border-slate-100"
      // Use onTouchEnd for optional press handling to avoid navigation context issues
      onTouchEnd={onPress ? () => onPress() : undefined}
    >
      {/* Header row with account info and type badge */}
      <View className="px-4 pt-4 pb-3 flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {account.official_name || account.name}
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            {[account.institution_name, account.mask ? `•••• ${account.mask}` : ""].filter(Boolean).join(" · ") ||
              "Account"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className={`${getAccountTypeColor()} px-2 py-1 rounded-md`}>
            <Text className="text-white text-[10px] font-bold uppercase tracking-wide">{getAccountTypeDisplay()}</Text>
          </View>
          {onRemove && (
            <View
              onTouchEnd={(e) => {
                e.stopPropagation()
                handleRemovePress()
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ padding: 4 }}
            >
              <Image source={icons.close} className="w-4 h-4" style={{ tintColor: "#CBD5E1" }} resizeMode="contain" />
            </View>
          )}
        </View>
      </View>

      {/* Balance section with background */}
      <View className="bg-slate-50 px-4 py-3">
        <View className="flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              {account.holdings_value ? "Holdings" : "Balance"}
            </Text>
            <Text className={`text-2xl font-bold ${getBalanceColor()}`}>
              {account.holdings_value
                ? formatCurrency(account.holdings_value)
                : formatCurrency(account.current_balance)}
            </Text>

            {/* Day change pill */}
            {hasDayChange && (
              <View className="flex-row items-center mt-2 gap-2">
                <View
                  className={`flex-row items-center px-2 py-0.5 rounded-full ${isPositiveChange ? "bg-emerald-100" : "bg-red-100"}`}
                >
                  <Text className={`text-xs font-medium ${isPositiveChange ? "text-emerald-700" : "text-red-700"}`}>
                    {isPositiveChange ? "+" : ""}
                    {formatDayChange(account.day_change_amount!)}
                    {account.day_change_percent !== null && account.day_change_percent !== undefined && (
                      <Text>
                        {" "}
                        ({isPositiveChange ? "+" : ""}
                        {account.day_change_percent.toFixed(2)}%)
                      </Text>
                    )}
                  </Text>
                </View>
                <Text className="text-xs text-slate-400">today</Text>
              </View>
            )}

            {/* Available balance */}
            {!hasDayChange &&
              account.available_balance !== null &&
              account.available_balance !== undefined &&
              account.available_balance !== account.current_balance && (
                <Text className="text-xs text-slate-500 mt-1">
                  Available: {formatCurrency(account.available_balance)}
                </Text>
              )}

            {/* Credit card payment info */}
            {showLiabilityInfo && (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {account.next_payment_due_date && (
                  <View className="bg-red-50 px-2 py-1 rounded">
                    <Text className="text-xs text-red-600 font-medium">
                      Due {formatDate(account.next_payment_due_date)}
                    </Text>
                  </View>
                )}
                {account.next_payment_amount !== null && account.next_payment_amount !== undefined && (
                  <View className="bg-slate-100 px-2 py-1 rounded">
                    <Text className="text-xs text-slate-600">Min {formatCurrency(account.next_payment_amount)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Credit utilization visual */}
          {account.credit_limit != null && account.credit_limit > 0 && (
            <View className="w-20 ml-3">
              <Text className="text-[10px] text-slate-500 text-right mb-1 font-medium">
                {utilizationPercent.toFixed(0)}% used
              </Text>
              <View className="bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <View
                  className={`h-full ${getUtilizationColor()} rounded-full`}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </View>
              <Text className="text-[10px] text-slate-400 text-right mt-1">
                of {formatCurrency(account.credit_limit)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
