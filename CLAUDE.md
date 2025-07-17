# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- **Build TypeScript**: `npm run build`
- **Type checking**: `npm run typecheck` 
- **Development mode**: `npm run dev` (runs with ts-node)

### Testing
- **Run all tests**: `npm test`
- **MCP protocol tests**: `npm run test:mcp`
- **Analytics module tests**: `npm run test:analytics`
- **Test real LibreLink connection**: `node test-real-connection.js`
- **Test with real glucose data**: `node test-real-data.js`

### Configuration
- **Configure LibreLink credentials**: `npm run configure`
- **Debug LibreLink connections**: `node debug-connections.js`
- **Diagnose account issues**: `node diagnose-account.js`

## Architecture Overview

### Core Components

1. **MCP Server** (`src/index.ts`): Main entry point implementing 8 MCP tools for glucose monitoring:
   - `get_current_glucose` - Real-time glucose readings
   - `get_glucose_history` - Historical data retrieval
   - `get_glucose_stats` - Time-in-range and statistics
   - `get_glucose_trends` - Pattern analysis (dawn phenomenon, meal response)
   - `get_sensor_info` - Sensor status information
   - `configure_credentials` - LibreLink authentication setup
   - `configure_ranges` - Target glucose range configuration
   - `validate_connection` - Connection testing

2. **LibreLink Client** (`src/librelink-client.ts`): Wrapper around the unofficial LibreLink API with:
   - Singleton pattern for client management
   - Caching system with configurable TTL (default 5 minutes)
   - Support for both US and EU regions
   - Error handling for authentication and rate limiting

3. **Glucose Analytics** (`src/glucose-analytics.ts`): Advanced analytics calculations including:
   - GMI (Glucose Management Indicator) calculation
   - Time-in-range analysis (target, below, above)
   - Coefficient of variation (CV%) for variability
   - Dawn phenomenon detection
   - Postprandial response analysis
   - Overnight glucose stability metrics

4. **Configuration Management** (`src/config.ts`): Handles secure credential storage:
   - Stores config in `~/.librelink-mcp/config.json`
   - Automatically sets file permissions to 600 (user-only)
   - Supports credential updates and range configuration

### Key Design Patterns

- **Privacy-First**: All data processing happens locally, no external servers
- **Error Handling**: Custom error types for authentication, sensor, and API issues
- **Caching**: Respects API rate limits with intelligent caching
- **Type Safety**: Full TypeScript with strict mode enabled

### Integration Points

This MCP server is designed to work alongside other health MCP servers in Claude Desktop:
- Runs as local MCP server via stdio transport
- Provides glucose data for correlation with other health metrics
- No cloud dependencies - all processing happens locally

## Important Notes

- **No linting setup**: Currently no ESLint/Prettier configuration
- **ES Modules**: Project uses ES modules (`"type": "module"` in package.json)
- **Node 18+ required**: Uses modern Node.js features
- **Unofficial API**: Uses `libre-link-unofficial-api` community package