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
import PlaidLinkComponent from "../components/PlaidLink";
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

  // Check if bank is already connected
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

      // First, exchange the public token
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
        // Now fetch the account data
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
          <PlaidLinkComponent
            onSuccess={handlePlaidSuccess}
            onExit={handlePlaidExit}
          />
        )}

        {bankData && (
          <View style={styles.dataContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Connected Account Data</Text>
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
            </View>

            <Text style={styles.sectionHeader}>Accounts:</Text>
            {bankData.accounts.map((account, index) => (
              <View key={index} style={styles.accountItem}>
                <Text>Name: {account.name}</Text>
                <Text>Type: {account.type}</Text>
                <Text>Subtype: {account.subtype}</Text>
              </View>
            ))}

            <Text style={styles.sectionHeader}>Recent Transactions:</Text>
            {bankData.transactions.slice(0, 5).map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <Text>Description: {transaction.name}</Text>
                <Text>Amount: ${transaction.amount}</Text>
                <Text>Date: {transaction.date}</Text>
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dataContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
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
  },
  accountItem: {
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    marginBottom: 8,
  },
  transactionItem: {
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    marginBottom: 8,
  },
});

export default ConnectBankScreen;
