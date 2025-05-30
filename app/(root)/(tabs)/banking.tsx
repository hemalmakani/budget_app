import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { PlaidLinkWebView } from "../../../components/PlaidLinkWebView";
import { AccountsOverview } from "../../../components/AccountsOverview";

export default function BankingScreen() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAccountsConnected = (accounts: any[]) => {
    console.log("Successfully connected accounts:", accounts);
    // Trigger a refresh of the accounts overview
    setRefreshKey((prev) => prev + 1);
  };

  const handleConnectionExit = () => {
    console.log("User exited bank connection flow");
  };

  const HeaderComponent = () => (
    <>
      {/* Header */}
      <View style={{ padding: 20, backgroundColor: "white", marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#333",
            marginBottom: 8,
          }}
        >
          Banking
        </Text>
        <Text style={{ fontSize: 16, color: "#666" }}>
          Connect your bank accounts to automatically track your finances
        </Text>
      </View>

      {/* Connect Bank Section */}
      <View
        style={{
          backgroundColor: "white",
          margin: 16,
          padding: 20,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: "#333",
            marginBottom: 12,
          }}
        >
          Connect Bank Account
        </Text>
        <Text style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
          Securely connect your bank accounts using Plaid to automatically sync
          transactions and balances.
        </Text>

        <PlaidLinkWebView
          onSuccess={handleAccountsConnected}
          onExit={handleConnectionExit}
          buttonText="🏦 Connect Your Bank"
        />
      </View>

      {/* Features Section */}
      <View
        style={{
          backgroundColor: "white",
          margin: 16,
          padding: 20,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#333",
            marginBottom: 16,
          }}
        >
          What you'll get:
        </Text>

        {[
          {
            icon: "💰",
            title: "Real-time Balances",
            desc: "See your account balances updated automatically",
          },
          {
            icon: "📊",
            title: "Transaction History",
            desc: "All your transactions synced and categorized",
          },
          {
            icon: "🎯",
            title: "Net Worth Tracking",
            desc: "Track your total assets and liabilities",
          },
          {
            icon: "🔄",
            title: "Automatic Updates",
            desc: "Stay current with real-time bank data",
          },
          {
            icon: "🔒",
            title: "Bank-level Security",
            desc: "Powered by Plaid's secure infrastructure",
          },
        ].map((feature, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              marginBottom: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 24, marginRight: 12 }}>
              {feature.icon}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>
                {feature.title}
              </Text>
              <Text style={{ fontSize: 14, color: "#666" }}>
                {feature.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Security Notice */}
      <View
        style={{
          backgroundColor: "#E8F5E8",
          margin: 16,
          padding: 16,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: "#4CAF50",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#2E7D32",
            marginBottom: 8,
          }}
        >
          🔒 Your data is secure
        </Text>
        <Text style={{ fontSize: 14, color: "#388E3C" }}>
          We use Plaid's bank-level security and never store your banking
          credentials. Your connection is encrypted and you can disconnect at
          any time.
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={{ flex: 1 }}>
        <FlatList
          data={[]} // Empty data since we just want to use the header
          renderItem={() => null}
          ListHeaderComponent={<HeaderComponent />}
          ListFooterComponent={
            <View key={refreshKey}>
              <AccountsOverview />
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
