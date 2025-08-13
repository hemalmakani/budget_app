import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { getApiUrl } from "../lib/config";

interface TransactionSyncProps {
  onSyncComplete?: (summary: any) => void;
  autoSync?: boolean;
  syncInterval?: number; // in minutes
}

export const TransactionSync: React.FC<TransactionSyncProps> = ({
  onSyncComplete,
  autoSync = false,
  syncInterval = 30,
}) => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("idle");

  useEffect(() => {
    if (autoSync) {
      const interval = setInterval(
        () => {
          syncTransactions();
        },
        syncInterval * 60 * 1000
      );

      return () => clearInterval(interval);
    }
  }, [autoSync, syncInterval]);

  const syncTransactions = async (startDate?: string, endDate?: string) => {
    try {
      setIsLoading(true);
      setSyncStatus("syncing");

      const response = await fetch(
        getApiUrl("/(api)/plaid/sync-transactions"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkId: userId,
            startDate,
            endDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync transactions");
      }

      setLastSync(new Date());
      setSyncStatus("success");

      if (data.summary.new_transactions_added > 0) {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${data.summary.new_transactions_added} new transactions`,
          [{ text: "OK" }]
        );
      }

      onSyncComplete?.(data.summary);
    } catch (error: any) {
      console.error("Error syncing transactions:", error);
      setSyncStatus("error");
      Alert.alert("Sync Error", error.message || "Failed to sync transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return "Never";
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Last sync: {formatLastSync()}</Text>
        {syncStatus === "syncing" && (
          <ActivityIndicator size="small" color="#007AFF" />
        )}
      </View>

      <TouchableOpacity
        style={[styles.syncButton, { opacity: isLoading ? 0.6 : 1 }]}
        onPress={() => syncTransactions()}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.syncButtonText}>Sync Transactions</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginVertical: 8,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: "#6c757d",
  },
  syncButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  syncButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
