import { VercelRequest, VercelResponse } from "@vercel/node";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { neon } from "@neondatabase/serverless";
import { getAuthenticatedUserId } from "../../lib/auth-server";

const sql = neon(`${process.env.DATABASE_URL}`);

const config = new Configuration({
  basePath:
    PlaidEnvironments[
      (process.env.PLAID_ENV || "sandbox") as keyof typeof PlaidEnvironments
    ],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

const plaid = new PlaidApi(config);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verify JWT and get authenticated user
    const clerkId = await getAuthenticatedUserId(req);
    if (!clerkId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { public_token } = req.body;

    if (!public_token) {
      return res
        .status(400)
        .json({ error: "public_token is required" });
    }

    // 1. Exchange public token for access token
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchange.data;

    // 2. Get institution information
    const itemResponse = await plaid.itemGet({ access_token });
    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = "Unknown Bank";
    if (institutionId) {
      try {
        const institutionResponse = await plaid.institutionsGetById({
          institution_id: institutionId,
          country_codes: ["US" as any],
        });
        institutionName = institutionResponse.data.institution.name;
      } catch (instError) {
        console.warn("Failed to get institution name:", instError);
      }
    }

    // 3. Pull accounts first to check for duplicates
    const accountsResp = await plaid.accountsGet({ access_token });

    // 4. Check if user already has accounts with same name and institution
    // Use verified clerkId instead of req.body.clerkId
    const duplicateAccounts = [];
    for (const a of accountsResp.data.accounts) {
      const existingAccount = await sql`
        SELECT 
          pa.id, 
          pa.name, 
          pa.account_id,
          pi.institution_name
        FROM plaid_accounts pa
        JOIN plaid_items pi ON pa.item_id = pi.id
        WHERE pa.clerk_id = ${clerkId}
          AND LOWER(pa.name) = LOWER(${a.name ?? ""})
          AND LOWER(pi.institution_name) = LOWER(${institutionName})
          AND pa.is_active = true
      `;

      if (existingAccount.length > 0) {
        duplicateAccounts.push({
          name: a.name,
          institution: institutionName,
          existing_account_id: existingAccount[0].account_id,
          new_account_id: a.account_id,
        });
      }
    }

    // 5. If duplicates found, return error with details
    if (duplicateAccounts.length > 0) {
      return res.status(409).json({
        error: "Duplicate accounts detected",
        message: `You already have ${duplicateAccounts.length} account(s) with the same name at ${institutionName}`,
        duplicates: duplicateAccounts,
        suggestion:
          "This institution is already connected. Please disconnect the old connection first if you want to reconnect.",
      });
    }

    // 6. No duplicates, proceed with normal flow - Check if item already exists
    const existingItems = await sql`
      SELECT id, item_id FROM plaid_items WHERE item_id = ${item_id}
    `;

    let internalItemId;
    if (existingItems.length > 0) {
      // Update existing item
      // Use verified clerkId instead of req.body.clerkId
      const updateResult = await sql`
        UPDATE plaid_items 
        SET access_token = ${access_token}, 
            clerk_id = ${clerkId}, 
            institution_name = ${institutionName}
        WHERE item_id = ${item_id}
        RETURNING id
      `;
      internalItemId = updateResult[0].id;
    } else {
      // Insert new item
      // Use verified clerkId instead of req.body.clerkId
      const insertResult = await sql`
        INSERT INTO plaid_items (user_id, access_token, item_id, institution_name, created_at, clerk_id)
        VALUES (NULL, ${access_token}, ${item_id}, ${institutionName}, NOW(), ${clerkId})
        RETURNING id
      `;
      internalItemId = insertResult[0].id;
    }

    // 7. Insert accounts (we already know no duplicates exist)
    for (const a of accountsResp.data.accounts) {
      const b = a.balances || ({} as any);

      // Check if account already exists by account_id
      const existingAccounts = await sql`
        SELECT id FROM plaid_accounts WHERE account_id = ${a.account_id}
      `;

      if (existingAccounts.length > 0) {
        // Update existing account
        await sql`
          UPDATE plaid_accounts SET
            name=${a.name ?? null},
            type=${a.type ?? null},
            mask=${a.mask ?? null},
            current_balance=${b.current ?? 0},
            available_balance=${b.available ?? null},
            credit_limit=${b.limit ?? null},
            subtype=${a.subtype ?? null},
            official_name=${a.official_name ?? null},
            last_balance_update=NOW(),
            is_active=true,
            updated_at=NOW(),
            clerk_id=${clerkId}
          WHERE account_id = ${a.account_id}
        `;
      } else {
        // Insert new account
        // Use verified clerkId instead of req.body.clerkId
        await sql`
          INSERT INTO plaid_accounts (
            item_id, account_id, name, type, mask,
            current_balance, available_balance, credit_limit,
            subtype, official_name,
            last_balance_update, is_active, created_at, updated_at,
            clerk_id, user_id
          )
          VALUES (
            ${internalItemId}, ${a.account_id}, ${a.name ?? null}, ${a.type ?? null}, ${a.mask ?? null},
            ${b.current ?? 0}, ${b.available ?? null}, ${b.limit ?? null},
            ${a.subtype ?? null}, ${a.official_name ?? null},
            NOW(), true, NOW(), NOW(),
            ${clerkId}, NULL
          )
        `;
      }
    }

    return res.status(200).json({
      item_id,
      accounts_added: accountsResp.data.accounts.length,
      institution: institutionName,
    });
  } catch (err: any) {
    console.error("Error exchanging public token:", err);
    res.status(500).json({ error: err?.response?.data || err?.message });
  }
}
