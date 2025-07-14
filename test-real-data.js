#!/usr/bin/env node

import { spawn } from 'child_process';

/**
 * Test all MCP tools with real LibreLink data
 */

class RealDataTester {
  constructor() {
    this.server = null;
  }

  log(message) {
    console.log(`[TEST] ${message}`);
  }

  async startServer() {
    this.log('Starting MCP server...');
    
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message.includes('LibreLink MCP Server running')) {
        this.log('✅ Server started successfully');
      } else if (message && !message.includes('Error')) {
        this.log(`Server: ${message}`);
      }
    });

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
      }, 10000);

      this.server.stdin.write(JSON.stringify(message) + '\n');
    });
  }

  async testCurrentGlucose() {
    this.log('🩸 Testing current glucose...');
    
    const message = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_current_glucose',
        arguments: {}
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result?.content) {
        const glucose = JSON.parse(response.result.content[0].text);
        this.log(`✅ Current glucose: ${glucose.current_glucose} mg/dL`);
        this.log(`   Trend: ${glucose.trend}`);
        this.log(`   Status: ${glucose.status}`);
        this.log(`   Time: ${new Date(glucose.timestamp).toLocaleTimeString()}`);
        return true;
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async testGlucoseHistory() {
    this.log('📊 Testing glucose history (6 hours)...');
    
    const message = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_glucose_history',
        arguments: { hours: 6 }
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result?.content) {
        const history = JSON.parse(response.result.content[0].text);
        this.log(`✅ Got ${history.total_readings} readings over ${history.period_hours} hours`);
        
        if (history.readings && history.readings.length > 0) {
          const latest = history.readings[history.readings.length - 1];
          const oldest = history.readings[0];
          this.log(`   Range: ${oldest.value} - ${latest.value} mg/dL`);
          this.log(`   Latest: ${latest.value} mg/dL at ${new Date(latest.timestamp).toLocaleTimeString()}`);
        }
        return true;
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async testGlucoseStats() {
    this.log('📈 Testing glucose statistics...');
    
    const message = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_glucose_stats',
        arguments: { days: 1 }
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result?.content) {
        const stats = JSON.parse(response.result.content[0].text);
        this.log(`✅ Statistics for ${stats.analysis_period_days} day(s):`);
        this.log(`   Average glucose: ${stats.average_glucose} mg/dL`);
        this.log(`   GMI: ${stats.glucose_management_indicator}%`);
        this.log(`   Time in range: ${stats.time_in_range.target_70_180}%`);
        this.log(`   CV: ${stats.variability.coefficient_of_variation}%`);
        return true;
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async testGlucoseTrends() {
    this.log('📉 Testing trend analysis...');
    
    const message = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_glucose_trends',
        arguments: { period: 'daily' }
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result?.content) {
        const trends = JSON.parse(response.result.content[0].text);
        this.log(`✅ Trend analysis (${trends.period}):`);
        this.log(`   Dawn phenomenon: ${trends.dawn_phenomenon}`);
        this.log(`   Meal response: ${trends.meal_response_average} mg/dL`);
        this.log(`   Overnight stability: ${trends.overnight_stability} mg/dL`);
        if (trends.patterns.length > 0) {
          this.log(`   Patterns: ${trends.patterns.length} detected`);
          trends.patterns.forEach((pattern, i) => {
            this.log(`     ${i+1}. ${pattern}`);
          });
        }
        return true;
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async testSensorInfo() {
    this.log('🔗 Testing sensor info...');
    
    const message = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_sensor_info',
        arguments: {}
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result?.content) {
        const sensorInfo = JSON.parse(response.result.content[0].text);
        this.log(`✅ Found ${sensorInfo.sensor_count} sensor(s):`);
        sensorInfo.active_sensors.forEach((sensor, i) => {
          this.log(`   Sensor ${i+1}: ${sensor.deviceType} (${sensor.state})`);
        });
        return true;
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async testValidateConnection() {
    this.log('✅ Testing connection validation...');
    
    const message = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'validate_connection',
        arguments: {}
      }
    };

    try {
      const response = await this.sendMCPMessage(message);
      
      if (response.result?.content) {
        const result = response.result.content[0].text;
        this.log(`✅ Connection status: ${result}`);
        return result.includes('validated successfully');
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async stopServer() {
    if (this.server) {
      this.server.kill('SIGTERM');
      await new Promise(resolve => {
        this.server.on('exit', resolve);
        setTimeout(resolve, 2000);
      });
    }
  }

  async runAllTests() {
    console.log('🩸 Real LibreLink Data Test Suite');
    console.log('=================================\n');

    let passed = 0;
    let total = 0;

    try {
      const serverStarted = await this.startServer();
      if (!serverStarted) {
        this.log('❌ Failed to start server');
        return;
      }

      const tests = [
        { name: 'Connection Validation', fn: this.testValidateConnection.bind(this) },
        { name: 'Current Glucose', fn: this.testCurrentGlucose.bind(this) },
        { name: 'Glucose History', fn: this.testGlucoseHistory.bind(this) },
        { name: 'Glucose Statistics', fn: this.testGlucoseStats.bind(this) },
        { name: 'Trend Analysis', fn: this.testGlucoseTrends.bind(this) },
        { name: 'Sensor Info', fn: this.testSensorInfo.bind(this) }
      ];

      for (const test of tests) {
        total++;
        console.log(`\n--- ${test.name} ---`);
        const result = await test.fn();
        if (result) passed++;
      }

    } catch (error) {
      this.log(`❌ Test suite error: ${error.message}`);
    } finally {
      await this.stopServer();
    }

    console.log('\n📊 Real Data Test Results');
    console.log('=========================');
    console.log(`Passed: ${passed}/${total}`);
    console.log(`Success Rate: ${Math.round((passed/total) * 100)}%`);
    
    if (passed === total) {
      console.log('\n🎉 Perfect! All MCP tools work with your real LibreLink data!');
      console.log('\n🚀 Ready for Claude Desktop integration:');
      console.log('1. Add the server to Claude Desktop config');
      console.log('2. Ask Claude: "What\'s my current glucose?"');
      console.log('3. Ask Claude: "Analyze my glucose trends"');
    } else {
      console.log('\n⚠️  Some tests need attention. Check the output above.');
    }
  }
}

const tester = new RealDataTester();
tester.runAllTests().catch(console.error);