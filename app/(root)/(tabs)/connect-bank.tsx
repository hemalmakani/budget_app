import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import PlaidLinkComponent from "@/components/PlaidLink";
import { Ionicons } from "@expo/vector-icons";

export const ConnectBankScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useUser();
  const [bankData, setBankData] = useState<{
    accounts: any[];
    transactions: any[];
    balances: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        if (!user?.id) return;

        const response = await fetch(
          `https://6mo7phodkb.execute-api.us-east-2.amazonaws.com/dev/plaid/accounts?clerkId=${user.id}`
        );
        const data = await response.json();

        if (!data.error) {
          setBankData(data);
        }
      } catch (error) {
        console.error("Error checking bank connection:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingConnection();
  }, [user?.id]);

  const handleRefreshTransactions = async () => {
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      setIsRefreshing(true);
      const response = await fetch(
        `https://6mo7phodkb.execute-api.us-east-2.amazonaws.com/dev/plaid/accounts?clerkId=${user.id}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setBankData(data);
      Alert.alert("Success", "Transactions refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing transactions:", error);
      Alert.alert("Error", "Failed to refresh transactions");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePlaidSuccess = async (publicToken: string) => {
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const exchangeResponse = await fetch(
        "https://6mo7phodkb.execute-api.us-east-2.amazonaws.com/dev/plaid/exchange-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_token: publicToken,
            userId: "test-user-123",
            clerkId: user.id,
          }),
        }
      );

      const exchangeData = await exchangeResponse.json();
      if (exchangeData.success) {
        const accountDataResponse = await fetch(
          `https://6mo7phodkb.execute-api.us-east-2.amazonaws.com/dev/plaid/accounts?clerkId=${user.id}`
        );

        const accountData = await accountDataResponse.json();
        if (accountData.error) {
          throw new Error(accountData.error);
        }

        setBankData(accountData);
        Alert.alert("Success", "Bank account connected successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        throw new Error(exchangeData.error || "Failed to connect bank account");
      }
    } catch (error) {
      console.error("Error exchanging token:", error);
      Alert.alert("Error", "Failed to connect bank account");
    }
  };

  const handlePlaidExit = () => {
    console.log("Plaid Link exit");
    router.back();
  };

  const handleReconnect = () => {
    setBankData(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Bank Account</Text>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Bank Account</Text>
        <Text style={styles.subtitle}>
          {bankData
            ? "Your connected bank account"
            : "Securely connect your bank account using Plaid"}
        </Text>
      </View>
      <ScrollView style={styles.content}>
        {!bankData && (
          <View style={styles.plaidContainer}>
            <Ionicons name="link" size={64} color="#4CAF50" />
            <Text style={styles.plaidText}>Connect with Plaid</Text>
            <PlaidLinkComponent
              onSuccess={handlePlaidSuccess}
              onExit={handlePlaidExit}
            />
          </View>
        )}

        {bankData && (
          <View style={styles.dataContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Connected Account Data</Text>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.refreshButton,
                  isRefreshing && styles.buttonDisabled,
                ]}
                onPress={handleRefreshTransactions}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="white" />
                    <Text style={styles.refreshText}>Refresh</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reconnectButton}
                onPress={handleReconnect}
              >
                <Text style={styles.reconnectText}>Reconnect</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>Accounts:</Text>
            {bankData.accounts.map((account, index) => (
              <View key={index} style={styles.accountItem}>
                <View style={styles.accountIcon}>
                  <Ionicons name="wallet" size={24} color="#4CAF50" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountType}>{account.type}</Text>
                  <Text style={styles.accountSubtype}>{account.subtype}</Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionHeader}>Recent Transactions:</Text>
            {bankData.transactions.slice(0, 5).map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Ionicons name="cart" size={24} color="#4CAF50" />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionName}>{transaction.name}</Text>
                  <Text style={styles.transactionAmount}>
                    ${transaction.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "#4CAF50",
    borderBottomWidth: 1,
    borderBottomColor: "#43A047",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "white",
  },
  subtitle: {
    fontSize: 16,
    color: "#E8F5E9",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  plaidContainer: {
    alignItems: "center",
    marginTop: 40,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plaidText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4CAF50",
    marginTop: 16,
    marginBottom: 24,
  },
  dataContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  refreshText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  reconnectButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reconnectText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#4CAF50",
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    marginBottom: 8,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  accountType: {
    fontSize: 14,
    color: "#666",
  },
  accountSubtype: {
    fontSize: 14,
    color: "#999",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  transactionDate: {
    fontSize: 14,
    color: "#999",
  },
});

export default ConnectBankScreen;
