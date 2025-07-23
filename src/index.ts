#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { LibreLinkClient } from './librelink-client.js';
import { GlucoseAnalytics } from './glucose-analytics.js';
import { ConfigManager } from './config.js';
import { MCPError } from './types.js';

const server = new Server(
  {
    name: 'librelink-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const configManager = new ConfigManager();
let client: LibreLinkClient | null = null;
let analytics: GlucoseAnalytics | null = null;

// Initialize client if configured
function initializeClient(): void {
  const config = configManager.getConfig();
  if (configManager.isConfigured()) {
    client = new LibreLinkClient(config);
    analytics = new GlucoseAnalytics(config);
  }
}

// Error handler
function handleError(error: any): any {
  console.error('LibreLink MCP Error:', error);
  
  if (error instanceof Error && 'code' in error) {
    const mcpError = error as MCPError;
    return {
      content: [{
        type: 'text',
        text: `Error [${mcpError.code}]: ${mcpError.message}`
      }]
    };
  }

  return {
    content: [{
      type: 'text',
      text: `Error: ${error.message || 'Unknown error occurred'}`
    }]
  };
}

// Tool definitions
const tools: Tool[] = [
  {
    name: 'get_current_glucose',
    description: 'Get the most recent glucose reading from your FreeStyle Libre sensor. Returns current glucose value in mg/dL, trend direction (rising/falling/stable), and whether the value is in target range. Use this for real-time glucose monitoring.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_glucose_history',
    description: 'Retrieve historical glucose readings for analysis. Returns an array of timestamped glucose values. Useful for reviewing past glucose levels, identifying patterns, or checking overnight values. Default retrieves 24 hours of data.',
    inputSchema: {
      type: 'object',
      properties: {
        hours: {
          type: 'number',
          description: 'Number of hours of history to retrieve (1-720). Default: 24. Examples: 1 for last hour, 8 for overnight, 168 for one week'
        }
      },
      required: []
    }
  },
  {
    name: 'get_glucose_stats',
    description: 'Calculate comprehensive glucose statistics including average glucose, GMI (estimated A1C), time-in-range percentages, and variability metrics. Essential for diabetes management insights and identifying areas for improvement.',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze (1-90). Default: 7. Common periods: 7 (weekly report), 14 (two weeks), 30 (monthly), 90 (quarterly)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_glucose_trends',
    description: 'Analyze glucose patterns including dawn phenomenon (early morning rise), meal responses, and overnight stability. Helps identify recurring patterns that may need attention or treatment adjustments.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Analysis period for pattern detection. Default: weekly. Use daily for detailed patterns, weekly for typical patterns, monthly for long-term trends'
        }
      },
      required: []
    }
  },
  {
    name: 'get_sensor_info',
    description: 'Get information about your active FreeStyle Libre sensor including activation date, remaining lifetime, and connection status. Use this to check if sensor is working properly or needs replacement.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'configure_credentials',
    description: 'Set up or update your LibreLink account credentials for data access. Required before using any glucose reading tools. Credentials are stored securely on your local machine only.',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Your LibreLink account email address (same as used in the LibreLink app)'
        },
        password: {
          type: 'string',
          description: 'Your LibreLink account password'
        },
        region: {
          type: 'string',
          enum: ['US', 'EU'],
          description: 'Your LibreLink account region. US for United States, EU for Europe. Default: US'
        }
      },
      required: ['email', 'password']
    }
  },
  {
    name: 'configure_ranges',
    description: 'Customize your target glucose range for personalized time-in-range calculations. Standard range is 70-180 mg/dL, but your healthcare provider may recommend different targets based on your individual needs.',
    inputSchema: {
      type: 'object',
      properties: {
        target_low: {
          type: 'number',
          description: 'Lower bound of target range in mg/dL. Common values: 70 (standard), 80 (tighter control), 60 (athletic)'
        },
        target_high: {
          type: 'number',
          description: 'Upper bound of target range in mg/dL. Common values: 180 (standard), 140 (tighter control), 200 (relaxed)'
        }
      },
      required: ['target_low', 'target_high']
    }
  },
  {
    name: 'validate_connection',
    description: 'Test the connection to LibreLink servers and verify your credentials are working. Use this if you encounter errors or after updating credentials. Returns success/failure status.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_current_glucose': {
        if (!client) {
          throw new Error('LibreLink not configured. Use configure_credentials first.');
        }

        const reading = await client.getCurrentGlucose();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              current_glucose: reading.value,
              timestamp: reading.timestamp,
              trend: reading.trend,
              status: reading.isHigh ? 'High' : reading.isLow ? 'Low' : 'Normal',
              color: reading.color
            }, null, 2)
          }]
        };
      }

      case 'get_glucose_history': {
        if (!client) {
          throw new Error('LibreLink not configured. Use configure_credentials first.');
        }

        const hours = (args?.hours as number) || 24;
        const history = await client.getGlucoseHistory(hours);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              period_hours: hours,
              total_readings: history.length,
              readings: history
            }, null, 2)
          }]
        };
      }

      case 'get_glucose_stats': {
        if (!client || !analytics) {
          throw new Error('LibreLink not configured. Use configure_credentials first.');
        }

        const days = (args?.days as number) || 7;
        const readings = await client.getGlucoseHistory(days * 24);
        const stats = analytics.calculateGlucoseStats(readings);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              analysis_period_days: days,
              average_glucose: stats.average,
              glucose_management_indicator: stats.gmi,
              time_in_range: {
                target_70_180: stats.timeInRange,
                below_70: stats.timeBelowRange,
                above_180: stats.timeAboveRange
              },
              variability: {
                standard_deviation: stats.standardDeviation,
                coefficient_of_variation: stats.coefficientOfVariation
              }
            }, null, 2)
          }]
        };
      }

      case 'get_glucose_trends': {
        if (!client || !analytics) {
          throw new Error('LibreLink not configured. Use configure_credentials first.');
        }

        const period = (args?.period as 'daily' | 'weekly' | 'monthly') || 'weekly';
        const daysToAnalyze = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
        const readings = await client.getGlucoseHistory(daysToAnalyze * 24);
        const trends = analytics.analyzeTrends(readings, period);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              period: period,
              patterns: trends.patterns,
              dawn_phenomenon: trends.dawnPhenomenon,
              meal_response_average: trends.mealResponse,
              overnight_stability: trends.overnightStability
            }, null, 2)
          }]
        };
      }

      case 'get_sensor_info': {
        if (!client) {
          throw new Error('LibreLink not configured. Use configure_credentials first.');
        }

        const sensors = await client.getSensorInfo();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              active_sensors: sensors,
              sensor_count: sensors.length
            }, null, 2)
          }]
        };
      }

      case 'configure_credentials': {
        const { email, password, region } = args as { 
          email: string; 
          password: string; 
          region?: 'US' | 'EU' 
        };

        configManager.updateCredentials(email, password);
        if (region) {
          configManager.updateRegion(region);
        }

        // Reinitialize client with new credentials
        initializeClient();

        return {
          content: [{
            type: 'text',
            text: 'LibreLink credentials configured successfully. Use validate_connection to test.'
          }]
        };
      }

      case 'configure_ranges': {
        const { target_low, target_high } = args as { 
          target_low: number; 
          target_high: number 
        };

        configManager.updateRanges(target_low, target_high);
        
        // Reinitialize client with new ranges
        initializeClient();

        return {
          content: [{
            type: 'text',
            text: `Target glucose ranges updated: ${target_low}-${target_high} mg/dL`
          }]
        };
      }

      case 'validate_connection': {
        if (!client) {
          throw new Error('LibreLink not configured. Use configure_credentials first.');
        }

        const isValid = await client.validateConnection();
        return {
          content: [{
            type: 'text',
            text: isValid 
              ? 'LibreLink connection validated successfully!'
              : 'LibreLink connection failed. Check credentials and sensor status.'
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return handleError(error);
  }
});

// Initialize and start server
async function main() {
  initializeClient();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('LibreLink MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}