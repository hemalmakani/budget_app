"use client"

import { useState, useEffect, useCallback } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { useAuthenticatedFetch } from "@/lib/fetch"
import PlaidTransactionCard from "@/components/PlaidTransactionCard"
import AccountCard from "@/components/AccountCard"
import type { PlaidTransaction, PlaidAccount } from "@/types/plaid"
import { useBudgetStore, useTransactionStore } from "@/store"
import { create, open } from "react-native-plaid-link-sdk"

type TabType = "transactions" | "accounts"

export default function Bank() {
  const { userId, getToken } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()
  const { user } = useUser()

  const [activeTab, setActiveTab] = useState<TabType>("transactions")
  const [syncing, setSyncing] = useState(false)
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [exchanging, setExchanging] = useState(false)
  const [accounts, setAccounts] = useState<PlaidAccount[]>([])
  const [summary, setSummary] = useState({
    total_accounts: 0,
    total_assets: 0,
    total_liabilities: 0,
    net_worth: 0,
  })
  const [fetchingAccounts, setFetchingAccounts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingPlaid, setLoadingPlaid] = useState(false)
  const [syncingInvestments, setSyncingInvestments] = useState(false)

  const budgets = useBudgetStore((state) => state.budgets)
  const addTransaction = useTransactionStore((state) => state.addTransaction)

  useEffect(() => {
    if (userId) {
      fetchTransactions()
      fetchAccounts()
    }
  }, [userId])

  const fetchTransactions = useCallback(async () => {
    if (!userId) return
    try {
      setLoading(true)
      const data = await authenticatedFetch(`/api/plaid/transactions?clerkId=${userId}`)
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  const handleApproveTransaction = async (transactionId: string) => {
    const transaction = transactions.find((t) => t.id === transactionId)
    if (!transaction) return

    const category = transaction.editable_category || transaction.classified_category
    const transactionName = transaction.editable_name || transaction.merchant_name || transaction.name

    if (!category) {
      Alert.alert("Error", "Please select a category first")
      return
    }

    const budget = budgets.find((b) => b.category === category)
    if (!budget) {
      Alert.alert("Error", "Budget category not found")
      return
    }

    try {
      await addTransaction({
        name: transactionName,
        categoryId: budget.id,
        amount: Math.abs(transaction.amount),
        clerk_id: userId!,
        category_name: budget.category,
      })

      await authenticatedFetch("/api/plaid/mark-synced", {
        method: "POST",
        body: JSON.stringify({ transactionId: transaction.transaction_id, clerkId: userId }),
      })

      setTransactions((prev) => prev.filter((t) => t.id !== transactionId))
      Alert.alert("Success", "Transaction added to your budget!")
    } catch (error) {
      console.error("Error approving transaction:", error)
      Alert.alert("Error", "Failed to add transaction")
    }
  }

  const handleManualEdit = (transactionId: string, newName: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, editable_name: newName, editable_category: newCategory } : t)),
    )
  }

  const fetchAccounts = useCallback(async () => {
    if (!userId) return
    try {
      setFetchingAccounts(true)
      const data = await authenticatedFetch(`/api/plaid/fetch-accounts?clerkId=${userId}`, { method: "GET" })
      if (data.error) throw new Error(data.error || "Failed to fetch accounts")
      setAccounts(data.accounts)
      setSummary(data.summary)
    } catch (err: any) {
      console.error("Error fetching accounts:", err)
      if (accounts.length > 0) Alert.alert("Error", err.message ?? "Failed to fetch accounts")
    } finally {
      setFetchingAccounts(false)
      setRefreshing(false)
    }
  }, [userId, accounts.length])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (activeTab === "accounts") fetchAccounts()
    else fetchTransactions()
  }, [activeTab, fetchAccounts, fetchTransactions])

  const getLinkToken = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "Please sign in to connect your bank account")
        return
      }
      setLoadingPlaid(true)
      const data = await authenticatedFetch("/api/plaid/link-token", {
        method: "POST",
        body: JSON.stringify({ clerkId: userId }),
      })
      if (data.error) throw new Error(data.error || "Failed to create link token")
      if (!data.link_token) throw new Error("No link_token in response")
      create({ token: data.link_token, noLoadingState: false })
      setReady(true)
    } catch (err: any) {
      console.error("Error creating link token:", err)
      Alert.alert("Error", err.message ?? "Failed to create link token")
    } finally {
      setLoadingPlaid(false)
    }
  }

  const exchangePublicToken = async (publicToken: string) => {
    try {
      if (!userId) throw new Error("User not authenticated")
      setExchanging(true)
      const data = await authenticatedFetch("/api/plaid/exchange-public-token", {
        method: "POST",
        body: JSON.stringify({ public_token: publicToken, clerkId: userId }),
      })
      if (data.error) throw new Error(data.error || "Failed to exchange token")
      Alert.alert("Success", "Bank account connected successfully!")
      await fetchAccounts()
      return data.item_id
    } catch (err: any) {
      console.error("Error exchanging token:", err)
      throw err
    } finally {
      setExchanging(false)
    }
  }

  const openLink = () => {
    open({
      onSuccess: async (success) => {
        try {
          await exchangePublicToken(success.publicToken)
        } catch (err: any) {
          Alert.alert("Error", err.message ?? "Failed to connect bank account")
        } finally {
          setReady(false)
        }
      },
      onExit: (linkExit) => {
        setReady(false)
        const hasRealError = linkExit.error?.errorCode?.trim() !== "" && linkExit.error?.errorMessage?.trim() !== ""
        if (hasRealError) {
          Alert.alert("Connection Error", `Error: ${linkExit.error.errorCode} - ${linkExit.error.errorMessage}`)
        }
      },
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const handleSync = async () => {
    if (!userId) {
      Alert.alert("Error", "Please sign in to sync accounts")
      return
    }
    try {
      setSyncing(true)
      setSyncingInvestments(true)

      const results = await Promise.allSettled([
        authenticatedFetch("/api/plaid/transactions-sync", {
          method: "POST",
          body: JSON.stringify({ clerkId: userId }),
        }),
        authenticatedFetch("/api/plaid/investments-sync", {
          method: "POST",
          body: JSON.stringify({ clerkId: userId }),
        }),
        authenticatedFetch("/api/plaid/liabilities-sync", {
          method: "POST",
          body: JSON.stringify({ clerkId: userId }),
        }),
      ])

      const [txResult, invResult, liabResult] = results
      let msg = "Sync complete!\n"

      if (txResult.status === "fulfilled" && !txResult.value.error) msg += "✓ Transactions\n"
      if (invResult.status === "fulfilled" && !invResult.value.error) {
        msg += `✓ Investments (${invResult.value.accounts_updated || 0} updated)\n`
      }
      if (liabResult.status === "fulfilled" && !liabResult.value.error) {
        msg += `✓ Credit Cards (${liabResult.value.accounts_updated || 0} updated)`
      }

      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error))
      if (failed.length > 0) msg += "\n\nNote: Some items failed to sync."

      Alert.alert("Sync Status", msg)
      fetchAccounts()
      fetchTransactions()
    } catch (error: any) {
      console.error("Error syncing:", error)
      Alert.alert("Error", error.message || "Failed to sync accounts")
    } finally {
      setSyncing(false)
      setSyncingInvestments(false)
    }
  }

  const handleRemoveAccount = async (accountId: number) => {
    try {
      const data = await authenticatedFetch(`/api/plaid/accounts/delete/${accountId}?clerkId=${userId}`, {
        method: "DELETE",
      })
      if (!data.error) {
        Alert.alert("Success", "Account unlinked successfully")
        fetchAccounts()
      } else {
        Alert.alert("Error", data.error || "Failed to remove account")
      }
    } catch (error: any) {
      console.error("Error removing account:", error)
      Alert.alert("Error", error.message || "Failed to remove account")
    }
  }

  if (!userId || !user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Text className="text-lg text-slate-600 text-center">Please sign in to connect your bank accounts</Text>
      </SafeAreaView>
    )
  }

  const renderTransactionsTab = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
    >
      {/* Header section */}
      <View className="px-5 pt-4 pb-5">
        <Text className="text-2xl font-bold text-slate-900">Transactions</Text>
        <Text className="text-sm text-slate-500 mt-1">Review and categorize your spending</Text>

        {/* Sync button */}
        <TouchableOpacity
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.8}
          className={`mt-4 bg-teal-600 rounded-xl py-3.5 flex-row items-center justify-center ${syncing ? "opacity-60" : ""}`}
        >
          {syncing ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold ml-2">Syncing...</Text>
            </>
          ) : (
            <Text className="text-white font-semibold">Sync All Accounts</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Transactions list */}
      <View className="px-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-slate-900">Pending</Text>
          <Text className="text-sm text-slate-400">{transactions.length} items</Text>
        </View>

        {loading && !refreshing ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#0d9488" />
            <Text className="text-slate-500 mt-3">Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View className="py-12 items-center bg-white rounded-2xl border border-slate-100">
            <Text className="text-3xl mb-2">📭</Text>
            <Text className="text-slate-900 font-semibold mb-1">All caught up!</Text>
            <Text className="text-slate-500 text-center text-sm px-6">Sync your accounts to see new transactions</Text>
          </View>
        ) : (
          <View className="gap-2">
            {transactions.map((transaction) => (
              <PlaidTransactionCard
                key={transaction.id}
                transaction={transaction}
                onApprove={handleApproveTransaction}
                onEdit={handleManualEdit}
                showActions={true}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )

  const renderAccountsTab = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
    >
      {/* Header with action buttons */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-900">Accounts</Text>
            <Text className="text-sm text-slate-500 mt-0.5">{accounts.length} connected</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleSync}
              disabled={syncingInvestments}
              activeOpacity={0.7}
              className={`bg-slate-100 rounded-lg px-3.5 py-2.5 ${syncingInvestments ? "opacity-50" : ""}`}
            >
              {syncingInvestments ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Text className="text-slate-700 font-semibold text-sm">Sync</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={ready ? openLink : getLinkToken}
              disabled={loadingPlaid || exchanging}
              activeOpacity={0.7}
              className={`bg-teal-600 rounded-lg px-3.5 py-2.5 ${loadingPlaid || exchanging ? "opacity-50" : ""}`}
            >
              {loadingPlaid || exchanging ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold text-sm">+ Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Net Worth Card */}
      {accounts.length > 0 && (
        <View className="px-5 py-4">
          <View className="bg-slate-900 rounded-2xl p-5 overflow-hidden">
            <Text className="text-slate-400 text-xs uppercase tracking-wider mb-1">Net Worth</Text>
            <Text className={`text-3xl font-bold ${summary.net_worth >= 0 ? "text-white" : "text-red-400"}`}>
              {formatCurrency(summary.net_worth)}
            </Text>

            <View className="flex-row mt-5 gap-3">
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <View className="flex-row items-center mb-1">
                  <View className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5" />
                  <Text className="text-slate-400 text-xs uppercase">Assets</Text>
                </View>
                <Text className="text-emerald-400 text-lg font-bold">{formatCurrency(summary.total_assets)}</Text>
              </View>
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <View className="flex-row items-center mb-1">
                  <View className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1.5" />
                  <Text className="text-slate-400 text-xs uppercase">Liabilities</Text>
                </View>
                <Text className="text-red-400 text-lg font-bold">{formatCurrency(summary.total_liabilities)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Accounts List */}
      <View className="px-5">
        {fetchingAccounts && accounts.length === 0 ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#0d9488" />
            <Text className="text-slate-500 mt-3">Loading accounts...</Text>
          </View>
        ) : accounts.length === 0 ? (
          <View className="py-12 items-center bg-white rounded-2xl border border-slate-100">
            <Text className="text-4xl mb-3">🏦</Text>
            <Text className="text-xl font-bold text-slate-900 mb-1">No Accounts Yet</Text>
            <Text className="text-slate-500 text-center text-sm px-8 mb-5">
              Connect your bank to track your finances
            </Text>
            <TouchableOpacity
              onPress={ready ? openLink : getLinkToken}
              disabled={loadingPlaid || exchanging}
              activeOpacity={0.8}
              className={`bg-teal-600 rounded-xl px-5 py-3 ${loadingPlaid || exchanging ? "opacity-50" : ""}`}
            >
              <Text className="text-white font-semibold">Connect Bank</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-lg font-semibold text-slate-900 mb-3">All Accounts</Text>
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} onRemove={() => handleRemoveAccount(account.id)} />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  )

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row bg-slate-100 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setActiveTab("transactions")}
            activeOpacity={0.7}
            className={`flex-1 py-2.5 rounded-lg ${activeTab === "transactions" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`text-center font-semibold text-sm ${activeTab === "transactions" ? "text-slate-900" : "text-slate-500"}`}
            >
              Transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("accounts")}
            activeOpacity={0.7}
            className={`flex-1 py-2.5 rounded-lg ${activeTab === "accounts" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`text-center font-semibold text-sm ${activeTab === "accounts" ? "text-slate-900" : "text-slate-500"}`}
            >
              Accounts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "transactions" ? renderTransactionsTab() : renderAccountsTab()}
    </SafeAreaView>
  )
}
