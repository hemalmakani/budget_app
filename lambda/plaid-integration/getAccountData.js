const { plaidClient } = require("./config");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

// Category mapping from Plaid to budget categories
const categoryMapping = {
  // Income categories
  INCOME: "Income",
  TRANSFER_IN: "Income",

  // Housing & Utilities
  RENT_AND_UTILITIES: "Housing",
  RENT: "Housing",
  MORTGAGE: "Housing",
  UTILITIES: "Utilities",

  // Food & Dining
  FOOD_AND_DRINK: "Food",
  RESTAURANTS: "Food",
  GROCERIES: "Groceries",

  // Transportation
  TRANSPORTATION: "Transportation",
  TRAVEL: "Transportation",
  TAXI: "Transportation",
  PARKING: "Transportation",

  // Shopping
  SHOPPING: "Shopping",
  GENERAL_MERCHANDISE: "Shopping",

  // Entertainment
  ENTERTAINMENT: "Entertainment",
  RECREATION: "Entertainment",

  // Health
  MEDICAL: "Healthcare",
  HEALTHCARE: "Healthcare",
  PHARMACY: "Healthcare",

  // Bills & Utilities
  BILLS: "Bills",
  SUBSCRIPTION: "Subscriptions",

  // Other
  GENERAL: "Miscellaneous",
  OTHER: "Miscellaneous",
};

// Helper function to find best matching budget category
const findMatchingBudgetCategory = (transaction, budgetCategories) => {
  // Get Plaid's category
  const plaidCategory =
    transaction.personal_finance_category?.primary?.toUpperCase();

  // Try to match using the mapping first
  if (plaidCategory && categoryMapping[plaidCategory]) {
    const mappedCategory = categoryMapping[plaidCategory];
    const category = budgetCategories.find(
      (cat) => cat.category.toLowerCase() === mappedCategory.toLowerCase(),
    );
    if (category) return category;
  }

  // Try direct match with Plaid's category
  if (plaidCategory) {
    const category = budgetCategories.find(
      (cat) => cat.category.toLowerCase() === plaidCategory.toLowerCase(),
    );
    if (category) return category;
  }

  // Try fuzzy match with transaction name
  const category = budgetCategories.find((cat) => {
    const categoryWords = cat.category.toLowerCase().split(" ");
    const transactionWords = transaction.name.toLowerCase().split(" ");
    return categoryWords.some((word) =>
      transactionWords.some(
        (tWord) => tWord.includes(word) || word.includes(tWord),
      ),
    );
  });
  if (category) return category;

  // Find "Uncategorized" category if it exists
  const uncategorized = budgetCategories.find(
    (cat) => cat.category.toLowerCase() === "uncategorized",
  );
  if (uncategorized) return uncategorized;

  // Default to first category if no match found
  return budgetCategories[0] || null;
};

exports.handler = async (event) => {
  try {
    const { clerkId } = event.queryStringParameters || {};

    if (!clerkId) {
      throw new Error("Missing clerkId in query parameters");
    }

    console.log("Getting access tokens for clerkId:", clerkId);

    // Get all access tokens for the user
    const tokens = await sql`
      SELECT access_token, institution_id, institution_name 
      FROM plaid_tokens 
      WHERE clerk_id = ${clerkId}
    `;

    if (tokens.length === 0) {
      throw new Error("No access tokens found for user");
    }

    // Get user's budget categories
    const budgetCategories = await sql`
      SELECT * FROM budget_categories 
      WHERE clerk_id = ${clerkId}
      ORDER BY created_at ASC
    `;

    console.log("Found budget categories:", budgetCategories.length);

    let allAccounts = [];
    let allTransactions = [];
    let allBalances = [];

    // Process each bank connection
    for (const token of tokens) {
      try {
        console.log("Processing institution:", token.institution_name);

        // Get accounts
        const accountsResponse = await plaidClient.accountsGet({
          access_token: token.access_token,
        });

        // Add institution info to accounts
        const accounts = accountsResponse.data.accounts.map((account) => ({
          ...account,
          institution_id: token.institution_id,
          institution_name: token.institution_name,
        }));

        allAccounts.push(...accounts);

        // Get transactions
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: token.access_token,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          options: {
            include_personal_finance_category: true,
            include_original_description: true,
          },
        });

        // Add institution info to transactions
        const transactions = transactionsResponse.data.transactions.map(
          (transaction) => ({
            ...transaction,
            institution_id: token.institution_id,
            institution_name: token.institution_name,
          }),
        );

        allTransactions.push(...transactions);

        // Store transactions in database
        for (const transaction of transactions) {
          const matchingCategory = findMatchingBudgetCategory(
            transaction,
            budgetCategories,
          );

          try {
            const result = await sql`
              INSERT INTO plaid_transactions (
                clerk_id,
                plaid_transaction_id,
                account_id,
                institution_id,
                name,
                amount,
                date,
                category,
                category_id,
                budget_category_id,
                created_at
              )
              VALUES (
                ${clerkId},
                ${transaction.transaction_id},
                ${transaction.account_id},
                ${token.institution_id},
                ${transaction.name},
                ${transaction.amount},
                ${transaction.date},
                ${transaction.personal_finance_category?.primary || null},
                ${transaction.personal_finance_category?.detailed || null},
                ${matchingCategory?.budget_id || null},
                NOW()
              )
              ON CONFLICT (plaid_transaction_id) 
              DO UPDATE SET
                name = EXCLUDED.name,
                amount = EXCLUDED.amount,
                category = EXCLUDED.category,
                category_id = EXCLUDED.category_id,
                budget_category_id = EXCLUDED.budget_category_id,
                updated_at = NOW()
              RETURNING id
            `;

            // Update budget balance if category matched
            if (matchingCategory) {
              await sql`
                UPDATE budget_categories 
                SET balance = CASE 
                  WHEN type = 'savings' THEN balance + ${transaction.amount}
                  ELSE balance - ${transaction.amount}
                END
                WHERE budget_id = ${matchingCategory.budget_id}
              `;
            }
          } catch (error) {
            console.error(
              "Error storing transaction:",
              transaction.transaction_id,
              error.message || error,
            );
          }
        }

        // Get balances
        const balanceResponse = await plaidClient.accountsBalanceGet({
          access_token: token.access_token,
        });

        // Add institution info to balances
        const balances = balanceResponse.data.accounts.map((account) => ({
          ...account,
          institution_id: token.institution_id,
          institution_name: token.institution_name,
        }));

        allBalances.push(...balances);
      } catch (error) {
        console.error(
          "Error processing institution:",
          token.institution_name,
          error,
        );
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        accounts: allAccounts,
        transactions: allTransactions,
        balances: allBalances,
      }),
    };
  } catch (error) {
    console.error("Error getting account data:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
