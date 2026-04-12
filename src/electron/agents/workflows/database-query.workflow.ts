import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { databaseIntrospectionTool } from '../tools/database-instrospection.tool.js';
import { sqlGenerationTool } from '../tools/sql-generation.tool.js';
import { ConnectionService } from '../../services/connection.sevice.js';
import { RuntimeContext } from '@mastra/core/di';

// Step 1: Introspect the database

const introspectDatabaseStep = createStep({
  id: 'introspect-database',
  inputSchema: z.object({
    naturalLanguageQuery: z.string(),
    connectionId : z.number(),
    llmId : z.number(),
  }),
 
  outputSchema: z.object({
    schema: z.any(),
    schemaPresentation: z.string(),
    naturalLanguageQuery: z.string(),
    llmId : z.number(),
  }),
  execute: async ({ inputData }) => {
       try {
      // Use the database introspection tool
      if (!databaseIntrospectionTool.execute) {
        throw new Error('Database introspection tool is not available');
      }

      const schemaData = await databaseIntrospectionTool.execute({
        context: {connectionId : inputData.connectionId},
        runtimeContext: new RuntimeContext(),
      });

      // Type guard to ensure we have schema data
      if (!schemaData || typeof schemaData !== 'object') {
        throw new Error('Invalid schema data returned from introspection');
      }

      // Create a human-readable presentation
      const schemaPresentation = createSchemaPresentation(schemaData);

      return {
        schema: schemaData,
        schemaPresentation,
        naturalLanguageQuery: inputData.naturalLanguageQuery,
        llmId : inputData.llmId,
      };
    } catch (error) {
      throw new Error(`Failed to introspect database: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Step 2: Get natural language query and generate SQL
const generateSQLStep = createStep({
  id: 'generate-sql',
  inputSchema: z.object({
    schema: z.any(),
    schemaPresentation: z.string(),
    naturalLanguageQuery: z.string(),
    llmId : z.number(),
  }),
  outputSchema: z.object({
    naturalLanguageQuery: z.string(),
    generatedSQL: z.object({
      sql: z.string(),
      explanation: z.string(),
      confidence: z.number(),
      assumptions: z.array(z.string()),
      tables_used: z.array(z.string()),
    }),
    schemaPresentation: z.string(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { schema, schemaPresentation, naturalLanguageQuery , llmId } = inputData;

    try {
      // Generate SQL from natural language query
      if (!sqlGenerationTool.execute) {
        throw new Error('SQL generation tool is not available');
      }

      const generatedSQL = await sqlGenerationTool.execute({
        context: {
          naturalLanguageQuery,
          databaseSchema: schema,
          llmId
        },
        runtimeContext: runtimeContext || new RuntimeContext(),
      });

      // Type guard for generated SQL
      if (!generatedSQL || typeof generatedSQL !== 'object') {
        throw new Error('Invalid SQL generation result');
      }

      return {
        naturalLanguageQuery,
        generatedSQL: generatedSQL as any,
        schemaPresentation,
      };
    } catch (error) {
      throw new Error(`Failed to generate SQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Step 3: Auto-approve and execute query ( No Auto Execute Query Needed as of now )
// const reviewAndExecuteStep = createStep({
//   id: 'review-and-execute',
//   inputSchema: z.object({
//     naturalLanguageQuery: z.string(),
//     connectionId : z.number(),
//     generatedSQL: z.object({
//       sql: z.string(),
//       explanation: z.string(),
//       confidence: z.number(),
//       assumptions: z.array(z.string()),
//       tables_used: z.array(z.string()),
//     }),
//     schemaPresentation: z.string(),
//   }),
//   outputSchema: z.object({
//     success: z.boolean(),
//     finalSQL: z.string(),
//     queryResult: z.any(),
//     modifications: z.string().optional(),
//     rowCount: z.number().optional(),
//     error: z.string().optional(),
//   }),
//   execute: async ({ inputData }) => {
//     const { generatedSQL , connectionId} = inputData;
//     const finalSQL = generatedSQL.sql;

//     try {
//       // Get the singleton instance
//       const connser = await ConnectionService.getInstance(connectionId);
      
//       // Execute the SQL query directly (auto-approved for SELECT queries)
//       const result = await connser.executeQuery(finalSQL);

//       // executeQuery returns rows directly
//       if (!result) {
//         throw new Error('No result returned from query execution');
//       }

//       return {
//         success: true,
//         finalSQL,
//         queryResult: result,
//         rowCount: Array.isArray(result) ? result.length : 0,
//       };
//     } catch (error) {
//       return {
//         success: false,
//         finalSQL,
//         queryResult: null,
//         error: `Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}`,
//       };
//     }
//   },
// });

// Define the main database query workflow
export const databaseQueryWorkflow = createWorkflow({
  id: 'database-query-workflow',
  inputSchema: z.object({
    naturalLanguageQuery: z.string(),
    llmId : z.number(),
    connectionId : z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    finalSQL: z.string(),
    queryResult: z.any(),
    modifications: z.string().optional(),
    rowCount: z.number().optional(),
  }),
  steps: [ introspectDatabaseStep, generateSQLStep],
});

databaseQueryWorkflow
  .then(introspectDatabaseStep)
  .then(generateSQLStep)
  // .then(reviewAndExecuteStep)
  .commit();

// Helper function to create human-readable schema presentation
function createSchemaPresentation(schema: any): string {
  let presentation = '# Database Schema Overview\n\n';

  presentation += `## Summary\n`;
  presentation += `- **Tables**: ${schema.summary.total_tables}\n`;
  presentation += `- **Columns**: ${schema.summary.total_columns}\n`;
  presentation += `- **Relationships**: ${schema.summary.total_relationships}\n`;
  presentation += `- **Indexes**: ${schema.summary.total_indexes}\n\n`;

  // Group columns by table
  const tableColumns = new Map<string, any[]>();
  schema.columns.forEach((column: any) => {
    const tableKey = `${column.table_schema}.${column.table_name}`;
    if (!tableColumns.has(tableKey)) {
      tableColumns.set(tableKey, []);
    }
    tableColumns.get(tableKey)?.push(column);
  });

  presentation += `## Tables and Columns\n\n`;

  schema.tables.forEach((table: any) => {
    const tableKey = `${table.schema_name}.${table.table_name}`;
    const columns = tableColumns.get(tableKey) || [];
    const rowCount = schema.rowCounts.find(
      (rc: any) => rc.schema_name === table.schema_name && rc.table_name === table.table_name,
    );

    presentation += `### ${table.table_name}`;
    if (rowCount) {
      presentation += ` (${rowCount.row_count.toLocaleString()} rows)`;
    }
    presentation += `\n\n`;

    presentation += `| Column | Type | Nullable | Key | Default |\n`;
    presentation += `|--------|------|----------|-----|----------|\n`;

    columns.forEach((column: any) => {
      const type = column.character_maximum_length
        ? `${column.data_type}(${column.character_maximum_length})`
        : column.data_type;
      const nullable = column.is_nullable === 'YES' ? '✓' : '✗';
      const key = column.is_primary_key ? 'PK' : '';
      const defaultValue = column.column_default || '';

      presentation += `| ${column.column_name} | ${type} | ${nullable} | ${key} | ${defaultValue} |\n`;
    });

    presentation += `\n`;
  });

  if (schema.relationships.length > 0) {
    presentation += `## Relationships\n\n`;
    schema.relationships.forEach((rel: any) => {
      presentation += `- **${rel.table_name}.${rel.column_name}** → **${rel.foreign_table_name}.${rel.foreign_column_name}**\n`;
    });
    presentation += `\n`;
  }

  if (schema.indexes.length > 0) {
    presentation += `## Indexes\n\n`;
    schema.indexes.forEach((index: any) => {
      presentation += `- **${index.table_name}**: ${index.index_name}\n`;
    });
    presentation += `\n`;
  }

  presentation += `---\n\n`;
  presentation += `**Database schema introspection complete!**\n`;
  presentation += `You can now use this information to:\n`;
  presentation += `- Generate SQL queries based on natural language\n`;
  presentation += `- Understand table relationships and structure\n`;
  presentation += `- Analyze data distribution and patterns\n`;

  return presentation;
}
