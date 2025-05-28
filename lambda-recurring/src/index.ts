import { Handler, ScheduledEvent, Context } from "aws-lambda";
import { RecurringDatabaseService } from "./database";
import { RecurringLogic } from "./recurringLogic";
import {
  ProcessingSummary,
  LambdaResponse,
  ProcessedTransaction,
} from "./types";

/**
 * AWS Lambda handler for processing recurring incomes and fixed costs
 * Triggered by EventBridge (CloudWatch Events) on a schedule
 */
export const handler: Handler<ScheduledEvent, LambdaResponse> = async (
  event: ScheduledEvent,
  context: Context
): Promise<LambdaResponse> => {
  const startTime = Date.now();

  console.log("Recurring transactions Lambda function started", {
    functionName: context.functionName,
    requestId: context.awsRequestId,
    eventSource: event.source,
    eventTime: event.time,
  });

  try {
    // Initialize database service
    const db = new RecurringDatabaseService();

    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }

    console.log("Database connection established successfully");

    // Fetch recurring incomes and active fixed costs
    const [recurringIncomes, activeFixedCosts] = await Promise.all([
      db.getRecurringIncomes(),
      db.getActiveFixedCosts(),
    ]);

    console.log(
      `Found ${recurringIncomes.length} recurring incomes and ${activeFixedCosts.length} active fixed costs`
    );

    // Determine which items need to be processed
    const currentTime = new Date();
    const incomesToProcess = RecurringLogic.filterIncomesForProcessing(
      recurringIncomes,
      currentTime
    );
    const fixedCostsToProcess = RecurringLogic.filterFixedCostsForProcessing(
      activeFixedCosts,
      currentTime
    );

    console.log(
      `Processing ${incomesToProcess.length} incomes and ${fixedCostsToProcess.length} fixed costs`
    );

    // Initialize counters
    let transactionsCreated = 0;
    let budgetUpdates = 0;
    let errors = 0;
    const processedDetails: ProcessedTransaction[] = [];

    // Process recurring incomes
    for (const income of incomesToProcess) {
      try {
        console.log(
          `Processing income: ${income.source_name} for user ${income.clerk_id}`
        );

        // Create income transaction
        await db.createIncomeTransaction(income);

        // Update the last processed date
        await db.updateIncomeLastProcessed(income.id);

        // Create processed transaction record
        const processedTransaction = RecurringLogic.createProcessedTransaction(
          income,
          "income",
          "Income",
          currentTime
        );
        processedDetails.push(processedTransaction);

        transactionsCreated++;
        console.log(`Successfully processed income ${income.id}`);
      } catch (error) {
        console.error(`Error processing income ${income.id}:`, error);
        errors++;
      }
    }

    // Process fixed costs
    for (const fixedCost of fixedCostsToProcess) {
      try {
        console.log(
          `Processing fixed cost: ${fixedCost.name} for user ${fixedCost.clerk_id}`
        );

        // Get budget category info if category_id exists
        let categoryName = "Fixed Cost";
        if (fixedCost.category_id) {
          const category = await db.getBudgetCategory(fixedCost.category_id);
          if (category) {
            categoryName = category.category;

            // Update budget balance (subtract fixed cost from budget)
            await db.updateBudgetBalance(
              fixedCost.category_id,
              fixedCost.amount
            );
            budgetUpdates++;
          }
        }

        // Create fixed cost transaction
        await db.createFixedCostTransaction(fixedCost, categoryName);

        // Create processed transaction record
        const processedTransaction = RecurringLogic.createProcessedTransaction(
          fixedCost,
          "fixed_cost",
          categoryName,
          currentTime
        );
        processedDetails.push(processedTransaction);

        transactionsCreated++;
        console.log(`Successfully processed fixed cost ${fixedCost.id}`);
      } catch (error) {
        console.error(`Error processing fixed cost ${fixedCost.id}:`, error);
        errors++;
      }
    }

    // Count by frequency
    const weeklyItems = processedDetails.filter(
      (p) => p.frequency === "weekly"
    ).length;
    const biweeklyItems = processedDetails.filter(
      (p) => p.frequency === "biweekly"
    ).length;
    const monthlyItems = processedDetails.filter(
      (p) => p.frequency === "monthly"
    ).length;

    // Create execution summary
    const executionTime = Date.now() - startTime;
    const summary: ProcessingSummary = {
      total_incomes_processed: incomesToProcess.length,
      total_fixed_costs_processed: fixedCostsToProcess.length,
      total_transactions_created: transactionsCreated,
      total_budget_updates: budgetUpdates,
      weekly_items: weeklyItems,
      biweekly_items: biweeklyItems,
      monthly_items: monthlyItems,
      errors,
      processed_details: processedDetails,
      execution_time_ms: executionTime,
    };

    console.log(
      "Recurring transactions Lambda function completed successfully",
      summary
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Recurring transactions processed successfully",
        summary,
      }),
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error("Recurring transactions Lambda function failed:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTime,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Recurring transactions processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
        execution_time_ms: executionTime,
      }),
    };
  }
};

/**
 * Optional: Handler for manual testing or direct invocation
 */
export const testHandler = async (): Promise<void> => {
  console.log("Running recurring transactions test...");

  const mockEvent = {
    version: "0",
    id: "test-event",
    "detail-type": "Scheduled Event",
    source: "aws.events",
    account: "test",
    time: new Date().toISOString(),
    region: "us-east-1",
    detail: {},
    resources: [],
  } as ScheduledEvent;

  const mockContext = {
    functionName: "recurring-transactions-test",
    awsRequestId: "test-request-id",
    getRemainingTimeInMillis: () => 30000,
  } as Context;

  const result = await handler(mockEvent, mockContext, () => {});
  console.log("Test result:", result);
};
