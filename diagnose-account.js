#!/usr/bin/env node

import { LibreLinkClient as UnofficialClient } from 'libre-link-unofficial-api';
import { ConfigManager } from './dist/config.js';

/**
 * Diagnostic tool to understand LibreLink account setup
 */

async function diagnoseAccount() {
  console.log('🔍 LibreLink Account Diagnostic');
  console.log('==============================\n');

  const configManager = new ConfigManager();
  
  if (!configManager.isConfigured()) {
    console.log('❌ No credentials configured. Run: npm run configure');
    return;
  }

  const config = configManager.getConfig();
  console.log(`📧 Testing account: ${config.credentials.email}`);
  console.log(`🌍 Region: ${config.client.region}\n`);

  try {
    // Test authentication
    console.log('1. Testing authentication...');
    const client = new UnofficialClient({
      email: config.credentials.email,
      password: config.credentials.password
    });

    await client.login();
    console.log('✅ Authentication successful!\n');

    // Check user info
    console.log('2. Checking user info...');
    const user = client.me;
    console.log(`   User ID: ${user?.id || 'Unknown'}`);
    console.log(`   Email: ${user?.email || 'Unknown'}`);
    console.log(`   First Name: ${user?.firstName || 'Unknown'}`);
    console.log(`   Last Name: ${user?.lastName || 'Unknown'}\n`);

    // Check connections
    console.log('3. Checking connections...');
    try {
      const connections = await client.fetchConnections();
      console.log(`   Found ${connections?.length || 0} connection(s)`);
      
      if (!connections || connections.length === 0) {
        console.log('   ❌ No connections found');
        console.log('\n💡 This means either:');
        console.log('   a) You\'re using a LibreLinkUp account with no shared data');
        console.log('   b) You need to set up sharing from your main LibreLink app');
        console.log('   c) You should use your main LibreLink credentials instead');
      } else {
        console.log('   ✅ Connections found!');
        connections.forEach((conn, index) => {
          console.log(`   Connection ${index + 1}:`);
          console.log(`     Patient ID: ${conn.patientId || 'Unknown'}`);
          console.log(`     First Name: ${conn.firstName || 'Unknown'}`);
          console.log(`     Last Name: ${conn.lastName || 'Unknown'}`);
          console.log(`     Country: ${conn.country || 'Unknown'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error checking connections: ${error.message}`);
    }

    console.log('\n4. Testing glucose reading...');
    try {
      const reading = await client.read();
      console.log('   ✅ Glucose reading successful!');
      console.log(`   Current glucose: ${reading.value} mg/dL`);
      console.log(`   Timestamp: ${reading.timestamp}`);
      console.log(`   Trend: ${reading.trendType}`);
    } catch (error) {
      console.log(`   ❌ Error reading glucose: ${error.message}`);
      
      if (error.message.includes('No connections')) {
        console.log('\n🔧 SOLUTION NEEDED:');
        console.log('   Your account authenticated but has no glucose data connections.');
        console.log('   Options:');
        console.log('   1. Set up sharing from your main LibreLink app to this LibreLinkUp account');
        console.log('   2. Or use your main LibreLink app credentials instead');
        console.log('   3. Or check if you have the correct LibreLinkUp account');
      }
    }

  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}`);
    console.log('\n🔧 Check:');
    console.log('   1. Email and password are correct');
    console.log('   2. You\'re using the right region (US/EU)');
    console.log('   3. Account is not locked or suspended');
  }

  console.log('\n📋 Account Type Guidance:');
  console.log('   • LibreLink (main app): Your personal glucose readings');
  console.log('   • LibreLinkUp (sharing app): Shared readings from others');
  console.log('   • If you want YOUR data: use LibreLink credentials');
  console.log('   • If you want SHARED data: use LibreLinkUp credentials');
}

diagnoseAccount().catch(console.error);