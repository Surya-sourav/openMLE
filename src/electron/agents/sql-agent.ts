import { databaseQueryWorkflow } from "./workflows/database-query.workflow.js";
/**
 * Process a user request through the SQL Agent workflow
 * This executes the database query workflow which:
 * 1. Introspects the database schema
 * 2. Generates SQL from natural language
 * 3. Executes the query
 */
export async function processRequest(userQuery: string , llmId : number , connectionId : number): Promise<string> {
    try {

        if (!databaseQueryWorkflow) {
            throw new Error('Database query workflow not found');
        }

        // Create a workflow run
        const run = await databaseQueryWorkflow.createRunAsync();

        // Start the workflow with the user's natural language query
        const result = await run.start({
            inputData: {
                naturalLanguageQuery: userQuery,
                llmId : llmId,
                connectionId : connectionId,
            }
        });

        // Format and return the response directly
        return formatWorkflowResponse(result);

    } catch (error) {
        console.error('Error processing request through workflow:', error);
        throw error;
    }
}

/**
 * Format the workflow response into a user-friendly message
 */
function formatWorkflowResponse(workflowResult: any): string {
    try {
        // Extract the relevant data from the workflow result
        const { result, steps } = workflowResult;

        if (!result) {
            return 'Query processed but no results returned.';
        }

        let response = '';

        // Add SQL query information if available
        const generateStep = steps?.['generate-sql'];
        if (generateStep?.output?.generatedSQL) {
            const { sql, explanation, confidence } = generateStep.output.generatedSQL;
            response += ` **Generated SQL Query:**\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;
            response += ` **Explanation:** ${explanation}\n\n`;
            response += ` **Confidence:** ${(confidence * 100).toFixed(0)}%\n\n`;
        }

        // Add execution results
        if (result.success) {
            response += ` **Query executed successfully**\n\n`;
            response += ` **Results:**\n`;
            
            if (result.queryResult && Array.isArray(result.queryResult)) {
                response += `Found ${result.rowCount || result.queryResult.length} row(s)\n\n`;
                // Format results as JSON for now (can be enhanced later)
                response += `\`\`\`json\n${JSON.stringify(result.queryResult, null, 2)}\n\`\`\``;
            } else {
                response += 'No data returned.';
            }
        } else {
            response += ` **Query execution failed**\n`;
            response += `Error: ${result.error || 'Unknown error'}`;
        }

        return response;

    } catch (error) {
        console.error('Error formatting workflow response:', error);
        return `Error formatting results: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}
