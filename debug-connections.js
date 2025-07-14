#!/usr/bin/env node

import { LibreLinkClient as UnofficialClient } from 'libre-link-unofficial-api';
import { ConfigManager } from './dist/config.js';

/**
 * Deep debug for connection issues
 */

async function debugConnections() {
  console.log('🔍 Deep LibreLink Connection Debug');
  console.log('==================================\n');

  const configManager = new ConfigManager();
  const config = configManager.getConfig();
  
  console.log(`📧 Account: ${config.credentials.email}`);
  console.log(`🌍 Region: ${config.client.region}\n`);

  try {
    const client = new UnofficialClient({
      email: config.credentials.email,
      password: config.credentials.password
    });

    await client.login();
    console.log('✅ Authentication successful!\n');

    // Try to get raw connections data
    console.log('🔍 Investigating connections...');
    
    try {
      // Let's try to access the raw connection data
      const connections = await client.fetchConnections();
      
      console.log('Raw connections result:', typeof connections, connections);
      
      if (connections === null || connections === undefined) {
        console.log('❌ Connections returned null/undefined');
      } else if (Array.isArray(connections)) {
        console.log(`📊 Connections array length: ${connections.length}`);
        if (connections.length === 0) {
          console.log('❌ Empty connections array');
        }
      } else {
        console.log(`🤔 Unexpected connections type: ${typeof connections}`);
        console.log('🔍 Connections structure:', JSON.stringify(connections, null, 2));
      }

    } catch (connError) {
      console.log(`❌ fetchConnections error: ${connError.message}`);
      console.log('📋 Full error:', connError);
    }

    // Try alternative approaches
    console.log('\n🔍 Trying alternative data access...');
    
    try {
      // Check if there's a different way to access patient data
      const user = client.me;
      console.log('👤 User object keys:', Object.keys(user || {}));
      
      // Try to see if we can access glucose data directly
      console.log('\n🩸 Attempting direct glucose read...');
      const reading = await client.read();
      console.log('✅ Direct glucose read worked!');
      console.log('📊 Reading:', {
        value: reading.value,
        timestamp: reading.timestamp,
        trend: reading.trendType
      });
      
    } catch (readError) {
      console.log(`❌ Direct read error: ${readError.message}`);
      
      // Let's see what the exact error structure is
      console.log('🔍 Full read error details:');
      console.log('   Name:', readError.name);
      console.log('   Message:', readError.message);
      console.log('   Stack:', readError.stack?.split('\n')[0]);
    }

    // Check if there are any other methods we can try
    console.log('\n🔍 Available client methods:');
    const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      .filter(name => typeof client[name] === 'function' && !name.startsWith('_'));
    console.log('📋 Client methods:', clientMethods);

  } catch (error) {
    console.log(`❌ Setup error: ${error.message}`);
  }

  console.log('\n💡 Troubleshooting Questions:');
  console.log('1. In your LibreLink app, do you see current glucose readings?');
  console.log('2. Is your sensor currently active and connected?');
  console.log('3. Are you in the US or EU region?');
  console.log('4. Do you have any sharing setup in your LibreLink app?');
  console.log('5. Have you used any other apps to access your LibreLink data?');
}

debugConnections().catch(console.error);