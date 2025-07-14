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
    description: 'Get the current glucose reading from LibreLink',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_glucose_history',
    description: 'Get historical glucose readings',
    inputSchema: {
      type: 'object',
      properties: {
        hours: {
          type: 'number',
          description: 'Hours of history to retrieve (default: 24)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_glucose_stats',
    description: 'Get glucose statistics and time-in-range analysis',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Days to analyze (default: 7)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_glucose_trends',
    description: 'Analyze glucose trends and patterns',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Analysis period (default: weekly)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_sensor_info',
    description: 'Get current sensor status and information',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'configure_credentials',
    description: 'Configure LibreLink credentials',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'LibreLink email address'
        },
        password: {
          type: 'string',
          description: 'LibreLink password'
        },
        region: {
          type: 'string',
          enum: ['US', 'EU'],
          description: 'LibreLink region (default: US)'
        }
      },
      required: ['email', 'password']
    }
  },
  {
    name: 'configure_ranges',
    description: 'Configure target glucose ranges',
    inputSchema: {
      type: 'object',
      properties: {
        target_low: {
          type: 'number',
          description: 'Target range low value in mg/dL (default: 70)'
        },
        target_high: {
          type: 'number',
          description: 'Target range high value in mg/dL (default: 180)'
        }
      },
      required: ['target_low', 'target_high']
    }
  },
  {
    name: 'validate_connection',
    description: 'Test connection to LibreLink and validate credentials',
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