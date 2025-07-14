#!/usr/bin/env node

import { spawn } from 'child_process';

/**
 * Test script for real LibreLink connection
 * User runs this after configuring their credentials
 */

class RealConnectionTester {
  constructor() {
    this.server = null;
  }

  log(message) {
    console.log(`[TEST] ${message}`);
  }

  async startServer() {
    this.log('Starting MCP server with your credentials...');
    
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message.includes('LibreLink MCP Server running')) {
        this.log('✅ Server started successfully');
      } else if (message) {
        this.log(`Server stderr: ${message}`);
      }
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.server.pid ? true : false;
  }

  async sendMCPMessage(message) {
    return new Promise((resolve, reject) => {
      let response = '';
      let timeoutId;

      const onData = (data) => {
        response += data.toString();
        try {
          const lines = response.split('\n');
          for (const line of lines) {
            if (line.trim() && line.startsWith('{')) {
              const parsed = JSON.parse(line);
              clearTimeout(timeoutId);
              this.server.stdout.off('data', onData);
              resolve(parsed);
              return;
            }
          }
        } catch (e) {
          // Continue accumulating response
        }
      };

      this.server.stdout.on('data', onData);

      timeoutId = setTimeout(() => {
        this.server.stdout.off('data', onData);
        reject(new Error(`Timeout waiting for response`));
      }, 10000); // Longer timeout for real API calls

      this.server.stdin.write(JSON.stringify(message) + '\n');
    });
  }

  async testValidateConnection() {
    this.log('Testing connection to LibreLink with your credentials...');
    
    const message = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'validate_connection',
        arguments: {}
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        this.log(`Response: ${content}`);
        
        if (content.includes('validated successfully')) {
          this.log('🎉 SUCCESS! Your LibreLink connection is working!');
          return true;
        } else {
          this.log('❌ Connection failed - check your credentials or sensor status');
          return false;
        }
      } else {
        this.log('❌ Unexpected response format');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing connection: ${error.message}`);
      return false;
    }
  }

  async testCurrentGlucose() {
    this.log('Testing current glucose reading...');
    
    const message = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_current_glucose',
        arguments: {}
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        
        try {
          const glucose = JSON.parse(content);
          this.log('🎉 SUCCESS! Got glucose reading:');
          this.log(`   Current glucose: ${glucose.current_glucose} mg/dL`);
          this.log(`   Trend: ${glucose.trend}`);
          this.log(`   Status: ${glucose.status}`);
          this.log(`   Timestamp: ${glucose.timestamp}`);
          return true;
        } catch (e) {
          this.log(`❌ Error parsing glucose data: ${content}`);
          return false;
        }
      } else {
        this.log('❌ No glucose data received');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error getting glucose: ${error.message}`);
      return false;
    }
  }

  async stopServer() {
    if (this.server) {
      this.log('Stopping server...');
      this.server.kill('SIGTERM');
      await new Promise(resolve => {
        this.server.on('exit', resolve);
        setTimeout(resolve, 2000);
      });
    }
  }

  async runTest() {
    console.log('🩸 LibreLink Real Connection Test');
    console.log('=================================\n');

    try {
      const serverStarted = await this.startServer();
      if (!serverStarted) {
        this.log('❌ Failed to start server');
        return;
      }

      // Test connection first
      const connectionValid = await this.testValidateConnection();
      if (!connectionValid) {
        this.log('\n⚠️  Connection test failed. Please check:');
        this.log('   1. Your LibreLink credentials are correct');
        this.log('   2. Your sensor is active and connected');
        this.log('   3. LibreLinkUp sharing is enabled');
        await this.stopServer();
        return;
      }

      console.log(''); // Add spacing

      // Test glucose reading
      const glucoseSuccess = await this.testCurrentGlucose();
      
      if (glucoseSuccess) {
        console.log('\n🎉 All tests passed! Your LibreLink integration is working perfectly!');
        console.log('\nNext step: Integrate with Claude Desktop');
      }

    } catch (error) {
      this.log(`❌ Test error: ${error.message}`);
    } finally {
      await this.stopServer();
    }
  }
}

console.log('⚠️  IMPORTANT: Make sure you have configured your credentials first!');
console.log('   Run: npm run configure\n');

const tester = new RealConnectionTester();
tester.runTest().catch(console.error);