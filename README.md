# LibreLink MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

A local [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides Claude Desktop with secure access to your FreeStyle LibreLink continuous glucose monitoring (CGM) data.

![LibreLink MCP Demo](https://img.shields.io/badge/Demo-Working%20with%20Real%20Data-green)

## 🌟 Features

- **Real-time glucose monitoring** - Get current readings with trend arrows
- **Historical data analysis** - Retrieve glucose history over customizable periods
- **Comprehensive analytics** - Time-in-range, GMI, variability metrics
- **Pattern recognition** - Dawn phenomenon, meal responses, stability analysis
- **Privacy-first design** - All data stays local on your machine
- **Secure credential management** - Local encrypted storage
- **Cross-platform health integration** - Works alongside other health MCP servers

## 📋 Prerequisites

- **LibreLink Account**: Active FreeStyle LibreLink account with glucose data
- **Compatible Sensor**: FreeStyle Libre 2 or 3 with data sharing enabled
- **Node.js**: Version 18.0.0 or higher
- **Claude Desktop**: For MCP integration

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/librelink-mcp-server.git
cd librelink-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Configuration

```bash
# Configure your LibreLink credentials
npm run configure
```

You'll be prompted for:
- **Email**: Your LibreLink account email
- **Password**: Your LibreLink account password
- **Region**: US or EU (based on your location)
- **Target ranges**: Glucose target ranges (default: 70-180 mg/dL)

### 3. Test Connection

```bash
# Test your LibreLink connection
node test-real-connection.js
```

### 4. Claude Desktop Integration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "librelink": {
      "command": "node",
      "args": ["/path/to/librelink-mcp-server/dist/index.js"]
    }
  }
}
```

### 5. Restart Claude Desktop

Restart Claude Desktop to load the new MCP server.

## 🩸 Usage Examples

Once integrated with Claude Desktop, you can ask:

### Basic Glucose Queries
- *"What's my current glucose level?"*
- *"Show me my glucose readings from the past 6 hours"*
- *"What's my average glucose today?"*

### Analytics & Insights
- *"Calculate my time in range for this week"*
- *"Analyze my glucose patterns and trends"*
- *"Do I have dawn phenomenon?"*
- *"How stable are my overnight glucose levels?"*

### Health Correlations
When combined with other health MCP servers:
- *"How does my sleep quality affect my glucose control?"*
- *"Compare my glucose variability with my stress levels"*
- *"Show the impact of my supplements on glucose stability"*

## 🛠 Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_current_glucose` | Real-time glucose reading with trend | None |
| `get_glucose_history` | Historical glucose data | `hours` (default: 24) |
| `get_glucose_stats` | Statistics and time-in-range | `days` (default: 7) |
| `get_glucose_trends` | Pattern analysis | `period` (daily/weekly/monthly) |
| `get_sensor_info` | Sensor status and info | None |
| `configure_credentials` | Update LibreLink credentials | `email`, `password`, `region` |
| `configure_ranges` | Set target glucose ranges | `target_low`, `target_high` |
| `validate_connection` | Test LibreLink connection | None |

## 📊 Sample Output

### Current Glucose Reading
```json
{
  "current_glucose": 105,
  "timestamp": "2025-07-14T21:19:24.000Z",
  "trend": "Flat",
  "status": "Normal",
  "color": "green"
}
```

### Glucose Statistics
```json
{
  "analysis_period_days": 7,
  "average_glucose": 93.46,
  "glucose_management_indicator": 5.55,
  "time_in_range": {
    "target_70_180": 100.0,
    "below_70": 0.0,
    "above_180": 0.0
  },
  "variability": {
    "standard_deviation": 7.52,
    "coefficient_of_variation": 8.04
  }
}
```

### Trend Analysis
```json
{
  "period": "daily",
  "patterns": [
    "Good postprandial glucose control",
    "Excellent overnight glucose stability"
  ],
  "dawn_phenomenon": false,
  "meal_response_average": 0,
  "overnight_stability": 2.08
}
```

## 🔧 Development

### Running Tests

```bash
# Run all tests
npm test

# Test MCP protocol
npm run test:mcp

# Test analytics with mock data
npm run test:analytics

# Test with real LibreLink data (requires configuration)
node test-real-data.js
```

### Building

```bash
# Build TypeScript
npm run build

# Type checking
npm run typecheck

# Development mode
npm run dev
```

### Project Structure

```
librelink-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── librelink-client.ts   # LibreLink API wrapper
│   ├── glucose-analytics.ts  # Analytics and statistics
│   ├── config.ts             # Configuration management
│   ├── configure.ts          # CLI configuration tool
│   └── types.ts              # TypeScript definitions
├── config/
│   └── default.json          # Default configuration
├── test-*.js                 # Test suites
├── package.json
└── README.md
```

## 🔒 Security & Privacy

### Data Privacy
- **Local processing only** - No data sent to external servers
- **Your data stays on your machine** - Complete privacy control
- **No analytics or tracking** - Zero telemetry

### Credential Security
- **Local storage** - Credentials stored in `~/.librelink-mcp/config.json`
- **File permissions** - Automatically set to user-only access (600)
- **No cloud storage** - Never uploaded or shared

### Security Best Practices
```bash
# Verify file permissions
ls -la ~/.librelink-mcp/config.json
# Should show: -rw------- (user read/write only)

# Optional: Encrypt config directory
# (Implementation details in documentation)
```

## ⚠️ Important Notes

### LibreLink API Usage
- This project uses an **unofficial API** through reverse engineering
- **Not affiliated with Abbott** or FreeStyle Libre
- **Use at your own discretion** and ensure compliance with LibreLink terms
- **API may change** - community maintained compatibility

### Data Sharing Requirements
- Ensure your **LibreLink app has data sharing enabled**
- Your **sensor must be active** and transmitting data
- **LibreLink account** (not LibreLinkUp) credentials required

### Sensor Compatibility
- ✅ **FreeStyle Libre 2**
- ✅ **FreeStyle Libre 3**
- ❓ **FreeStyle Libre 1** (may work, not tested)

## 🐛 Troubleshooting

### Common Issues

**"No connections found"**
- Verify you're using LibreLink (not LibreLinkUp) credentials
- Check that data sharing is enabled in your LibreLink app
- Ensure your sensor is active and connected

**"Authentication failed"**
- Double-check email and password
- Verify correct region (US/EU)
- Try logging into LibreLink app to confirm credentials

**"Connection timeout"**
- Check internet connection
- Verify LibreLink service status
- Try again after a few minutes

### Getting Help

1. **Run diagnostics**:
   ```bash
   node diagnose-account.js
   ```

2. **Check logs**: Look for error messages in the console output

3. **Test connection**:
   ```bash
   node test-real-connection.js
   ```

4. **Open an issue**: Include diagnostic output and error messages

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with tests
4. **Follow the existing code style**
5. **Submit a pull request**

### Development Guidelines
- **TypeScript required** - Maintain type safety
- **Test coverage** - Add tests for new features
- **Documentation** - Update README for new functionality
- **Security first** - Never commit credentials or sensitive data

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **libre-link-unofficial-api** - Community-maintained LibreLink API client
- **MCP Protocol** - Anthropic's Model Context Protocol
- **FreeStyle Libre Community** - Inspiration and reverse engineering efforts
- **Open Source Diabetes Projects** - Nightscout, OpenAPS, and others

## ⭐ Support

If this project helps you manage your diabetes with AI assistance, please:
- ⭐ **Star the repository**
- 🐛 **Report issues** you encounter
- 💡 **Suggest improvements**
- 🤝 **Contribute** to the project

---

**Disclaimer**: This is an unofficial project not affiliated with Abbott or FreeStyle Libre. Use responsibly and in compliance with applicable terms of service. Always consult healthcare professionals for medical decisions.