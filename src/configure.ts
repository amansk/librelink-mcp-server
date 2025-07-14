#!/usr/bin/env node

import * as readline from 'readline';
import { ConfigManager } from './config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('LibreLink MCP Server Configuration');
  console.log('==================================\n');

  const configManager = new ConfigManager();
  const currentConfig = configManager.getConfig();

  // Configure credentials
  const email = await question(`LibreLink email (current: ${currentConfig.credentials.email || 'not set'}): `);
  const password = await question('LibreLink password (current: hidden): ');
  
  // Configure region
  console.log('\nAvailable regions:');
  console.log('1. US (United States)');
  console.log('2. EU (Europe)');
  const regionChoice = await question(`Choose region (1 or 2, current: ${currentConfig.client.region}): `);
  const region = regionChoice === '2' ? 'EU' : 'US';

  // Configure target ranges
  const targetLow = await question(`Target glucose low (mg/dL, current: ${currentConfig.ranges.target_low}): `);
  const targetHigh = await question(`Target glucose high (mg/dL, current: ${currentConfig.ranges.target_high}): `);

  // Update configuration
  if (email.trim()) {
    configManager.updateCredentials(email.trim(), password);
  }
  
  configManager.updateRegion(region as 'US' | 'EU');
  
  if (targetLow.trim() && targetHigh.trim()) {
    const low = parseInt(targetLow);
    const high = parseInt(targetHigh);
    if (!isNaN(low) && !isNaN(high)) {
      configManager.updateRanges(low, high);
    }
  }

  // Validate configuration
  const errors = configManager.validateConfig();
  if (errors.length > 0) {
    console.log('\n❌ Configuration errors:');
    errors.forEach(error => console.log(`  - ${error}`));
    rl.close();
    process.exit(1);
  }

  console.log('\n✅ Configuration saved successfully!');
  console.log('\nNext steps:');
  console.log('1. Add this server to your Claude Desktop configuration');
  console.log('2. Restart Claude Desktop');
  console.log('3. Test the connection using the validate_connection tool');

  rl.close();
}

main().catch(console.error);