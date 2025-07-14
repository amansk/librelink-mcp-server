#!/usr/bin/env node

import { GlucoseAnalytics } from './dist/glucose-analytics.js';
import { TrendType } from './dist/types.js';

/**
 * Test glucose analytics with mock data
 */

// Mock configuration
const mockConfig = {
  credentials: { email: '', password: '' },
  client: { version: '4.12.0', region: 'US' },
  cache: { enabled: true, ttl_minutes: 5 },
  ranges: { target_low: 70, target_high: 180 }
};

// Generate mock glucose readings
function generateMockReadings(count = 100) {
  const readings = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 15 * 60 * 1000); // 15 min intervals
    
    // Simulate realistic glucose patterns
    let value = 100; // Base glucose
    
    // Add daily pattern (higher in morning, lower at night)
    const hour = timestamp.getHours();
    if (hour >= 6 && hour <= 8) { // Dawn phenomenon
      value += 20;
    } else if (hour >= 12 && hour <= 13) { // Lunch spike
      value += 30;
    } else if (hour >= 18 && hour <= 19) { // Dinner spike
      value += 25;
    } else if (hour >= 22 || hour <= 6) { // Night time
      value -= 10;
    }
    
    // Add some randomness
    value += (Math.random() - 0.5) * 40;
    
    // Ensure realistic bounds
    value = Math.max(50, Math.min(300, value));
    
    readings.push({
      value: Math.round(value),
      timestamp,
      trend: Object.values(TrendType)[Math.floor(Math.random() * Object.values(TrendType).length)],
      isHigh: value > mockConfig.ranges.target_high,
      isLow: value < mockConfig.ranges.target_low,
      color: value > mockConfig.ranges.target_high ? 'red' : value < mockConfig.ranges.target_low ? 'orange' : 'green'
    });
  }
  
  return readings;
}

async function testGlucoseAnalytics() {
  console.log('🧪 Glucose Analytics Test Suite');
  console.log('================================\n');

  const analytics = new GlucoseAnalytics(mockConfig);
  const mockReadings = generateMockReadings(100);
  
  console.log(`📊 Generated ${mockReadings.length} mock glucose readings`);
  console.log(`Time range: ${mockReadings[0].timestamp.toLocaleString()} to ${mockReadings[mockReadings.length-1].timestamp.toLocaleString()}\n`);

  // Test basic statistics
  console.log('1. Testing calculateGlucoseStats...');
  try {
    const stats = analytics.calculateGlucoseStats(mockReadings);
    
    console.log('✅ Glucose Statistics:');
    console.log(`   Average glucose: ${stats.average} mg/dL`);
    console.log(`   GMI: ${stats.gmi}%`);
    console.log(`   Time in range: ${stats.timeInRange}%`);
    console.log(`   Time below range: ${stats.timeBelowRange}%`);
    console.log(`   Time above range: ${stats.timeAboveRange}%`);
    console.log(`   Standard deviation: ${stats.standardDeviation} mg/dL`);
    console.log(`   Coefficient of variation: ${stats.coefficientOfVariation}%`);
    
    // Validate statistics
    const totalPercentage = stats.timeInRange + stats.timeBelowRange + stats.timeAboveRange;
    if (Math.abs(totalPercentage - 100) < 0.1) {
      console.log('✅ Time percentages sum to 100%');
    } else {
      console.log(`❌ Time percentages don't sum to 100%: ${totalPercentage}%`);
    }
    
  } catch (error) {
    console.log(`❌ Error in calculateGlucoseStats: ${error.message}`);
  }

  console.log('\n2. Testing analyzeTrends...');
  try {
    const trends = analytics.analyzeTrends(mockReadings, 'weekly');
    
    console.log('✅ Trend Analysis:');
    console.log(`   Dawn phenomenon detected: ${trends.dawnPhenomenon}`);
    console.log(`   Meal response average: ${trends.mealResponse} mg/dL`);
    console.log(`   Overnight stability: ${trends.overnightStability} mg/dL`);
    console.log(`   Patterns detected: ${trends.patterns.length}`);
    
    if (trends.patterns.length > 0) {
      console.log('   Detected patterns:');
      trends.patterns.forEach((pattern, index) => {
        console.log(`     ${index + 1}. ${pattern}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error in analyzeTrends: ${error.message}`);
  }

  console.log('\n3. Testing generateInsights...');
  try {
    const insights = analytics.generateInsights(mockReadings);
    
    console.log('✅ Generated Insights:');
    insights.forEach((insight, index) => {
      console.log(`   ${index + 1}. ${insight}`);
    });
    
  } catch (error) {
    console.log(`❌ Error in generateInsights: ${error.message}`);
  }

  // Test edge cases
  console.log('\n4. Testing edge cases...');
  
  // Test with empty array
  try {
    analytics.calculateGlucoseStats([]);
    console.log('❌ Should have thrown error for empty array');
  } catch (error) {
    console.log('✅ Correctly handled empty array');
  }
  
  // Test with single reading
  try {
    const stats = analytics.calculateGlucoseStats([mockReadings[0]]);
    console.log('✅ Single reading handled correctly');
  } catch (error) {
    console.log(`❌ Error with single reading: ${error.message}`);
  }

  // Test with extreme values
  const extremeReadings = [
    { ...mockReadings[0], value: 40 },  // Very low
    { ...mockReadings[0], value: 400 }, // Very high
    { ...mockReadings[0], value: 100 }  // Normal
  ];
  
  try {
    const stats = analytics.calculateGlucoseStats(extremeReadings);
    console.log('✅ Extreme values handled correctly');
    console.log(`   Time below range: ${stats.timeBelowRange}%`);
    console.log(`   Time above range: ${stats.timeAboveRange}%`);
  } catch (error) {
    console.log(`❌ Error with extreme values: ${error.message}`);
  }

  console.log('\n🎉 Analytics testing completed!');
  console.log('\nSample glucose data visualization:');
  
  // Create a simple ASCII chart of the last 24 readings
  const recent = mockReadings.slice(-24);
  const maxVal = Math.max(...recent.map(r => r.value));
  const minVal = Math.min(...recent.map(r => r.value));
  const range = maxVal - minVal;
  
  console.log(`\nGlucose values (${minVal}-${maxVal} mg/dL):`);
  recent.forEach((reading, i) => {
    const normalized = Math.round(((reading.value - minVal) / range) * 20);
    const bar = '█'.repeat(normalized) + '░'.repeat(20 - normalized);
    const time = reading.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const color = reading.isHigh ? '🔴' : reading.isLow ? '🟠' : '🟢';
    console.log(`${time} ${color} ${bar} ${reading.value}`);
  });
}

testGlucoseAnalytics().catch(console.error);