import { Handler, ScheduledEvent, Context } from "aws-lambda";
import { DatabaseService } from "./database";
import { BudgetResetLogic } from "./resetLogic";
import { ResetSummary, LambdaResponse } from "./types";

/**
 * AWS Lambda handler for budget category resets
 * Triggered by EventBridge (CloudWatch Events) on a schedule
 */
export const handler: Handler<ScheduledEvent, LambdaResponse> = async (
  event: ScheduledEvent,
  context: Context
): Promise<LambdaResponse> => {
  const startTime = Date.now();

  console.log("Budget reset Lambda function started", {
    functionName: context.functionName,
    requestId: context.awsRequestId,
    eventSource: event.source,
    eventTime: event.time,
  });

  try {
    // Initialize database service
    const db = new DatabaseService();

    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }

    console.log("Database connection established successfully");

    // Fetch all budget categories that could potentially be reset
    const budgetCategories = await db.getBudgetCategoriesForReset();
    console.log(`Found ${budgetCategories.length} budget categories to check`);

    // Determine which budgets need to be reset
    const currentTime = new Date();
    const resetOperations = BudgetResetLogic.createResetOperations(
      budgetCategories,
      currentTime
    );

    console.log(`${resetOperations.length} budget categories need to be reset`);

    // Perform the resets
    let weeklyResets = 0;
    let monthlyResets = 0;
    let errors = 0;

    if (resetOperations.length > 0) {
      try {
        await db.resetMultipleBudgetCategories(resetOperations);

        // Count resets by type
        const resetResults = BudgetResetLogic.createResetResults(
          budgetCategories,
          resetOperations,
          currentTime
        );
        weeklyResets = resetResults.filter((r) => r.type === "weekly").length;
        monthlyResets = resetResults.filter((r) => r.type === "monthly").length;

        console.log("Reset summary:", {
          total: resetOperations.length,
          weekly: weeklyResets,
          monthly: monthlyResets,
        });
      } catch (error) {
        console.error("Error during budget resets:", error);
        errors = resetOperations.length;
      }
    }

    // Create execution summary
    const executionTime = Date.now() - startTime;
    const summary: ResetSummary = {
      total_processed: budgetCategories.length,
      weekly_resets: weeklyResets,
      monthly_resets: monthlyResets,
      skipped: budgetCategories.length - resetOperations.length,
      errors,
      reset_details:
        resetOperations.length > 0
          ? BudgetResetLogic.createResetResults(
              budgetCategories,
              resetOperations,
              currentTime
            )
          : [],
      execution_time_ms: executionTime,
    };

    console.log("Budget reset Lambda function completed successfully", summary);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Budget reset completed successfully",
        summary,
      }),
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error("Budget reset Lambda function failed:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTime,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Budget reset failed",
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
  console.log("Running budget reset test...");

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
    functionName: "budget-reset-test",
    awsRequestId: "test-request-id",
    getRemainingTimeInMillis: () => 30000,
  } as Context;

  const result = await handler(mockEvent, mockContext, () => {});
  console.log("Test result:", result);
};
