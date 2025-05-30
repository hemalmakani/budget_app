import { PlaidApi, Configuration, PlaidEnvironments } from "plaid";
import { PLAID_CONFIG } from "./config";

// Initialize Plaid client
const configuration = new Configuration({
  basePath:
    PlaidEnvironments[PLAID_CONFIG.ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": PLAID_CONFIG.CLIENT_ID,
      "PLAID-SECRET": PLAID_CONFIG.SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Plaid API wrapper functions
export class PlaidService {
  // Create Link Token for Plaid Link
  static async createLinkToken(
    userId: string,
    clientName: string = "Budget App"
  ) {
    try {
      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: clientName,
        products: PLAID_CONFIG.PRODUCTS as any[],
        country_codes: PLAID_CONFIG.COUNTRY_CODES as any[],
        language: "en",
        webhook: PLAID_CONFIG.WEBHOOK_URL,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating link token:", error);
      throw error;
    }
  }

  // Exchange public token for access token
  static async exchangePublicToken(publicToken: string) {
    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return response.data;
    } catch (error) {
      console.error("Error exchanging public token:", error);
      throw error;
    }
  }

  // Get accounts for an item
  static async getAccounts(accessToken: string) {
    try {
      const response = await plaidClient.accountsGet({
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting accounts:", error);
      throw error;
    }
  }

  // Get account balances
  static async getAccountBalances(accessToken: string) {
    try {
      const response = await plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting account balances:", error);
      throw error;
    }
  }

  // Get transactions
  static async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    count: number = 500,
    offset: number = 0
  ) {
    try {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count,
          offset,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error getting transactions:", error);
      throw error;
    }
  }

  // Get item information
  static async getItem(accessToken: string) {
    try {
      const response = await plaidClient.itemGet({
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }

  // Remove item (disconnect bank)
  static async removeItem(accessToken: string) {
    try {
      const response = await plaidClient.itemRemove({
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error("Error removing item:", error);
      throw error;
    }
  }

  // Create a new link token for update mode (re-authentication)
  static async createUpdateLinkToken(accessToken: string, userId: string) {
    try {
      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: "Budget App",
        country_codes: PLAID_CONFIG.COUNTRY_CODES as any[],
        language: "en",
        access_token: accessToken,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating update link token:", error);
      throw error;
    }
  }

  // Get institution information
  static async getInstitutionById(institutionId: string) {
    try {
      const response = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: PLAID_CONFIG.COUNTRY_CODES as any[],
      });
      return response.data;
    } catch (error) {
      console.error("Error getting institution:", error);
      throw error;
    }
  }
}

// Helper functions for data transformation
export class PlaidDataTransformer {
  // Transform Plaid account to our database format
  static transformAccount(plaidAccount: any, itemId: number, clerkId: string) {
    return {
      item_id: itemId,
      account_id: plaidAccount.account_id,
      name: plaidAccount.name,
      official_name: plaidAccount.official_name,
      type: plaidAccount.type,
      subtype: plaidAccount.subtype,
      mask: plaidAccount.mask,
      current_balance: plaidAccount.balances.current,
      available_balance: plaidAccount.balances.available,
      credit_limit: plaidAccount.balances.limit,
      iso_currency_code: plaidAccount.balances.iso_currency_code || "USD",
      clerk_id: clerkId,
      last_balance_update: new Date(),
      is_active: true,
    };
  }

  // Transform Plaid transaction to our database format
  static transformTransaction(
    plaidTransaction: any,
    accountId: number,
    clerkId: string
  ) {
    return {
      transaction_id: plaidTransaction.transaction_id,
      account_id: accountId,
      name: plaidTransaction.name,
      merchant_name: plaidTransaction.merchant_name,
      amount: plaidTransaction.amount,
      date: plaidTransaction.date,
      category: plaidTransaction.category?.[0] || "Other",
      subcategory: plaidTransaction.category?.[1],
      plaid_category_id: plaidTransaction.category_id,
      transaction_type: plaidTransaction.transaction_type,
      pending: plaidTransaction.pending,
      iso_currency_code: plaidTransaction.iso_currency_code || "USD",
      location: plaidTransaction.location
        ? JSON.stringify(plaidTransaction.location)
        : null,
      clerk_id: clerkId,
      is_synced_to_transactions: false,
    };
  }

  // Map Plaid categories to budget categories
  static mapToLocalCategory(
    plaidCategory: string,
    subcategory?: string
  ): string {
    const categoryMappings: { [key: string]: string } = {
      "Food and Drink": "Food",
      Restaurants: "Food",
      Groceries: "Food",
      Transportation: "Transportation",
      "Gas Stations": "Transportation",
      "Public Transportation": "Transportation",
      Shopping: "Shopping",
      "General Merchandise": "Shopping",
      "Clothing and Accessories": "Shopping",
      Entertainment: "Entertainment",
      "Gyms and Fitness Centers": "Health",
      Healthcare: "Health",
      Travel: "Travel",
      Hotels: "Travel",
      Airlines: "Travel",
      Bills: "Bills",
      Utilities: "Bills",
      "Internet and Cable": "Bills",
      Phone: "Bills",
      Insurance: "Bills",
      Rent: "Housing",
      Mortgage: "Housing",
      "Home Improvement": "Housing",
    };

    return (
      categoryMappings[plaidCategory] ||
      categoryMappings[subcategory || ""] ||
      "Other"
    );
  }
}
