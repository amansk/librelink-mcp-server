# LibreLink MCP Server Design Document

## Overview
This document outlines the design for a local MCP (Model Context Protocol) server that provides Claude Desktop access to FreeStyle LibreLink continuous glucose monitoring (CGM) data.

## Architecture

### **Local MCP Server Pattern**
- **Local Process**: Runs on user's machine, not a remote server
- **Direct API Access**: Connects directly to LibreLink Up API using personal credentials
- **Privacy-First**: All glucose data stays on user's machine
- **No OAuth Required**: Uses simple API key/credential authentication

### **Integration with Existing Health Data**
- Operates alongside the existing remote Health App MCP server
- Claude can correlate LibreLink glucose data with biomarkers, supplements, and interventions
- Enables powerful cross-analysis: *"How do my supplements affect glucose variability?"*

## LibreLink API Research

### **Available APIs**

#### 1. **Official LibreLink Up API** (Recommended)
- **Base URL**: `https://api-eu.libreview.io` (Europe) or `https://api.libreview.io` (Global)
- **Authentication**: JWT tokens via email/password login
- **Coverage**: FreeStyle Libre 2 and 3 sensors
- **Data Access**: Real-time and historical glucose readings

#### 2. **Community Libraries**
- **@diakem/libre-link-up-api-client** - Well-maintained Node.js client
- **libre-link-unofficial-api** - Alternative unofficial wrapper
- **Proven in Production**: Multiple GitHub repositories with active usage

### **Authentication Flow**

```typescript
// Step 1: Login with LibreLink Up credentials
POST /llu/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
// Response: JWT token (valid ~6 months)

// Step 2: Get user connections
GET /llu/connections
Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
// Response: Patient IDs and connection details

// Step 3: Fetch glucose data
GET /llu/connections/{patientId}/graph
Headers: { "Authorization": "Bearer <JWT_TOKEN>" }
// Response: Current + historical glucose readings
```

### **Required Headers**
```typescript
{
  'product': 'llu.android',
  'version': '4.12.0',
  'Authorization': 'Bearer [JWT_TOKEN]',
  'Account-Id': '[SHA256_USER_ID]'
}
```

## Data Structures

### **Glucose Reading**
```typescript
interface GlucoseReading {
  value: number;           // mg/dL glucose value
  timestamp: Date;         // Reading timestamp
  trend: TrendType;        // Arrow direction (up/down/stable)
  isHigh: boolean;         // Above target range
  isLow: boolean;          // Below target range
  color: string;           // UI color indicator
}

enum TrendType {
  FLAT = "Flat",
  FORTY_FIVE_UP = "FortyFiveUp", 
  SINGLE_UP = "SingleUp",
  DOUBLE_UP = "DoubleUp",
  FORTY_FIVE_DOWN = "FortyFiveDown",
  SINGLE_DOWN = "SingleDown", 
  DOUBLE_DOWN = "DoubleDown"
}
```

### **Historical Data**
```typescript
interface HistoricalData {
  graphData: GlucoseReading[];    // Array of historical readings
  glucoseMeasurement: GlucoseReading; // Latest reading
  activeSensors: SensorInfo[];     // Sensor status/info
}
```

### **Sensor Information**
```typescript
interface SensorInfo {
  deviceId: string;
  serialNumber: string;
  activationTime: Date;
  state: string;           // "Active", "Expired", etc.
  deviceType: string;      // "FreeStyle Libre 3", etc.
}
```

## MCP Tools Design

### **Core Tools**

#### 1. `get_current_glucose`
```typescript
server.tool(
  'get_current_glucose',
  'Get the current glucose reading from LibreLink',
  {},
  async () => {
    const reading = await client.read();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          current_glucose: reading.value,
          timestamp: reading.timestamp,
          trend: reading.trend,
          status: reading.isHigh ? 'High' : reading.isLow ? 'Low' : 'Normal'
        }, null, 2)
      }]
    };
  }
);
```

#### 2. `get_glucose_history`
```typescript
server.tool(
  'get_glucose_history', 
  'Get historical glucose readings',
  {
    hours: { type: 'number', description: 'Hours of history to retrieve (default: 24)' }
  },
  async (args) => {
    const hours = args.hours || 24;
    const history = await client.history(hours);
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
);
```

#### 3. `get_glucose_stats`
```typescript
server.tool(
  'get_glucose_stats',
  'Get glucose statistics and time-in-range analysis',
  {
    days: { type: 'number', description: 'Days to analyze (default: 7)' }
  },
  async (args) => {
    const days = args.days || 7;
    const readings = await client.history(days * 24);
    
    const stats = calculateGlucoseStats(readings);
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
);
```

#### 4. `get_glucose_trends`
```typescript
server.tool(
  'get_glucose_trends',
  'Analyze glucose trends and patterns',
  {
    period: { type: 'string', description: 'Analysis period: daily, weekly, monthly' }
  },
  async (args) => {
    const period = args.period || 'weekly';
    const trends = await analyzeTrends(period);
    
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
);
```

#### 5. `stream_glucose`
```typescript
server.tool(
  'stream_glucose',
  'Start streaming real-time glucose readings',
  {
    interval_minutes: { type: 'number', description: 'Update interval in minutes (default: 5)' }
  },
  async (args) => {
    const interval = args.interval_minutes || 5;
    
    // Start streaming (implementation depends on MCP streaming capabilities)
    client.stream((reading) => {
      // Stream glucose readings to Claude
      console.log(`Glucose: ${reading.value} mg/dL, Trend: ${reading.trend}`);
    }, interval * 60 * 1000);
    
    return {
      content: [{
        type: 'text',
        text: `Started glucose streaming every ${interval} minutes`
      }]
    };
  }
);
```

### **Advanced Analysis Tools**

#### 6. `get_sensor_info`
```typescript
server.tool(
  'get_sensor_info',
  'Get current sensor status and information',
  {},
  async () => {
    const connections = await client.fetchConnections();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          active_sensors: connections.activeSensors,
          sensor_count: connections.activeSensors.length
        }, null, 2)
      }]
    };
  }
);
```

## Implementation Structure

### **Project Structure**
```
librelink-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main MCP server
│   ├── librelink-client.ts   # LibreLink API wrapper
│   ├── glucose-analytics.ts  # Statistics and trend analysis
│   ├── types.ts              # TypeScript interfaces
│   └── config.ts             # Configuration management
├── config/
│   └── default.json          # Default configuration
└── README.md
```

### **Dependencies**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@diakem/libre-link-up-api-client": "latest",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### **Configuration**
```typescript
interface LibreLinkConfig {
  credentials: {
    email: string;
    password: string;
  };
  client: {
    version: string;         // LibreLink client version
    region: 'US' | 'EU';     // API region
  };
  cache: {
    enabled: boolean;
    ttl_minutes: number;     // Cache time-to-live
  };
  ranges: {
    target_low: number;      // Target range low (default: 70)
    target_high: number;     // Target range high (default: 180)
  };
}
```

## Security Considerations

### **Credential Management**
- Store LibreLink credentials in local config file (not environment variables)
- Use file permissions to protect config file (600)
- Consider credential encryption for added security

### **Data Privacy**
- All glucose data stays local - never sent to external servers
- Claude context includes glucose data but doesn't persist it
- No data sharing or analytics tracking

### **API Rate Limiting**
- Respect LibreLink API rate limits
- Implement exponential backoff for failed requests
- Cache readings to minimize API calls

## Installation & Setup

### **User Setup Process**
1. **Install the MCP server**:
   ```bash
   npm install -g librelink-mcp-server
   ```

2. **Configure credentials**:
   ```bash
   librelink-mcp configure
   # Prompts for LibreLink email/password
   ```

3. **Add to Claude Desktop**:
   ```json
   {
     "mcpServers": {
       "librelink": {
         "command": "librelink-mcp-server"
       }
     }
   }
   ```

### **Prerequisites**
- Active LibreLink Up account
- FreeStyle Libre 2 or 3 sensor with sharing enabled
- Node.js 18+ installed locally

## Error Handling

### **Common Error Scenarios**
1. **Authentication Failure**: Invalid credentials or expired token
2. **No Active Sensor**: Sensor expired or not connected
3. **API Rate Limiting**: Too many requests to LibreLink
4. **Network Issues**: API unavailable or connectivity problems

### **Error Response Format**
```typescript
{
  content: [{
    type: 'text',
    text: 'Error: No active LibreLink sensor found. Please check your sensor status.'
  }]
}
```

## Cross-Platform Correlation Examples

### **With Health App MCP Server**
- *"Compare my glucose variability with my magnesium supplement timing"*
- *"Show glucose response to meals and my digestive enzyme protocol"*
- *"Correlate my morning cortisol levels with dawn phenomenon glucose spikes"*

### **With Oura MCP Server**
- *"How does my sleep quality affect next-day glucose control?"*
- *"Compare glucose stability on high vs low HRV days"*
- *"Show correlation between deep sleep and morning glucose readings"*

## Future Enhancements

### **Phase 2 Features**
- **Meal logging integration** with glucose response tracking
- **Exercise correlation** with glucose patterns
- **Predictive analytics** for glucose trends
- **Alert system** for high/low glucose events

### **Phase 3 Features**
- **Machine learning models** for glucose prediction
- **Integration with insulin pumps** (if API available)
- **Advanced pattern recognition** for lifestyle factors
- **Export capabilities** for healthcare providers

## Conclusion

The LibreLink MCP server provides Claude Desktop with comprehensive access to continuous glucose monitoring data while maintaining user privacy through local processing. Combined with the existing Health App MCP server and planned Oura integration, this creates a powerful platform for holistic health analysis and optimization.

The implementation leverages proven community libraries and follows established MCP patterns for reliability and maintainability.