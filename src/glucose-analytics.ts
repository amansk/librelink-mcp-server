import { GlucoseReading, GlucoseStats, TrendAnalysis, LibreLinkConfig } from './types.js';

export class GlucoseAnalytics {
  private config: LibreLinkConfig;

  constructor(config: LibreLinkConfig) {
    this.config = config;
  }

  calculateGlucoseStats(readings: GlucoseReading[]): GlucoseStats {
    if (!readings || readings.length === 0) {
      throw new Error('No glucose readings provided for analysis');
    }

    const values = readings.map(r => r.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate coefficient of variation
    const coefficientOfVariation = (standardDeviation / average) * 100;

    // Calculate Glucose Management Indicator (GMI)
    // GMI = 3.31 + 0.02392 * average_glucose_mg_dl
    const gmi = 3.31 + (0.02392 * average);

    // Calculate time in range percentages
    const inRange = readings.filter(r => 
      r.value >= this.config.ranges.target_low && r.value <= this.config.ranges.target_high
    ).length;
    const belowRange = readings.filter(r => r.value < this.config.ranges.target_low).length;
    const aboveRange = readings.filter(r => r.value > this.config.ranges.target_high).length;

    const timeInRange = (inRange / readings.length) * 100;
    const timeBelowRange = (belowRange / readings.length) * 100;
    const timeAboveRange = (aboveRange / readings.length) * 100;

    return {
      average: Math.round(average * 100) / 100,
      gmi: Math.round(gmi * 100) / 100,
      timeInRange: Math.round(timeInRange * 100) / 100,
      timeBelowRange: Math.round(timeBelowRange * 100) / 100,
      timeAboveRange: Math.round(timeAboveRange * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100
    };
  }

  analyzeTrends(readings: GlucoseReading[], period: 'daily' | 'weekly' | 'monthly' = 'weekly'): TrendAnalysis {
    if (!readings || readings.length === 0) {
      throw new Error('No glucose readings provided for trend analysis');
    }

    const patterns: string[] = [];
    
    // Analyze dawn phenomenon (early morning glucose rise)
    const dawnPhenomenon = this.detectDawnPhenomenon(readings);
    if (dawnPhenomenon) {
      patterns.push('Dawn phenomenon detected - glucose rises in early morning hours');
    }

    // Analyze meal response patterns
    const mealResponse = this.calculateMealResponse(readings);
    if (mealResponse > 50) {
      patterns.push('High postprandial glucose response detected');
    } else if (mealResponse < 20) {
      patterns.push('Good postprandial glucose control');
    }

    // Analyze overnight stability
    const overnightStability = this.calculateOvernightStability(readings);
    if (overnightStability < 10) {
      patterns.push('Excellent overnight glucose stability');
    } else if (overnightStability > 30) {
      patterns.push('High overnight glucose variability');
    }

    // Detect hypoglycemic episodes
    const hypoEpisodes = this.detectHypoglycemicEpisodes(readings);
    if (hypoEpisodes > 0) {
      patterns.push(`${hypoEpisodes} hypoglycemic episode(s) detected`);
    }

    // Detect hyperglycemic periods
    const hyperPeriods = this.detectHyperglycemicPeriods(readings);
    if (hyperPeriods > 0) {
      patterns.push(`${hyperPeriods} extended hyperglycemic period(s) detected`);
    }

    return {
      patterns,
      dawnPhenomenon,
      mealResponse: Math.round(mealResponse * 100) / 100,
      overnightStability: Math.round(overnightStability * 100) / 100
    };
  }

  private detectDawnPhenomenon(readings: GlucoseReading[]): boolean {
    // Group readings by hour of day
    const hourlyReadings = new Map<number, number[]>();
    
    readings.forEach(reading => {
      const hour = reading.timestamp.getHours();
      if (!hourlyReadings.has(hour)) {
        hourlyReadings.set(hour, []);
      }
      hourlyReadings.get(hour)!.push(reading.value);
    });

    // Calculate average glucose for each hour
    const hourlyAverages = new Map<number, number>();
    hourlyReadings.forEach((values, hour) => {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      hourlyAverages.set(hour, average);
    });

    // Check if glucose rises significantly between 4-8 AM
    const dawn4AM = hourlyAverages.get(4) || 0;
    const dawn6AM = hourlyAverages.get(6) || 0;
    const dawn8AM = hourlyAverages.get(8) || 0;

    // Dawn phenomenon: significant rise (>20 mg/dL) in early morning
    return (dawn8AM - dawn4AM) > 20 || (dawn6AM - dawn4AM) > 15;
  }

  private calculateMealResponse(readings: GlucoseReading[]): number {
    // Simplified meal response calculation
    // Look for glucose spikes that might indicate postprandial responses
    let totalSpikes = 0;
    let spikeCount = 0;

    for (let i = 1; i < readings.length - 1; i++) {
      const current = readings[i].value;
      const previous = readings[i - 1].value;
      const next = readings[i + 1].value;

      // Detect significant glucose rise (potential meal response)
      if (current > previous + 30 && current > next + 15) {
        totalSpikes += current - previous;
        spikeCount++;
      }
    }

    return spikeCount > 0 ? totalSpikes / spikeCount : 0;
  }

  private calculateOvernightStability(readings: GlucoseReading[]): number {
    // Filter readings between 11 PM and 6 AM
    const overnightReadings = readings.filter(reading => {
      const hour = reading.timestamp.getHours();
      return hour >= 23 || hour <= 6;
    });

    if (overnightReadings.length < 2) {
      return 0;
    }

    const values = overnightReadings.map(r => r.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private detectHypoglycemicEpisodes(readings: GlucoseReading[]): number {
    let episodes = 0;
    let inEpisode = false;

    readings.forEach(reading => {
      if (reading.value < this.config.ranges.target_low) {
        if (!inEpisode) {
          episodes++;
          inEpisode = true;
        }
      } else if (reading.value > this.config.ranges.target_low + 10) {
        inEpisode = false;
      }
    });

    return episodes;
  }

  private detectHyperglycemicPeriods(readings: GlucoseReading[]): number {
    let periods = 0;
    let consecutiveHigh = 0;

    readings.forEach(reading => {
      if (reading.value > this.config.ranges.target_high) {
        consecutiveHigh++;
      } else {
        if (consecutiveHigh >= 6) { // 6+ consecutive high readings (~1 hour)
          periods++;
        }
        consecutiveHigh = 0;
      }
    });

    // Check if the last sequence was a hyperglycemic period
    if (consecutiveHigh >= 6) {
      periods++;
    }

    return periods;
  }

  generateInsights(readings: GlucoseReading[]): string[] {
    const stats = this.calculateGlucoseStats(readings);
    const trends = this.analyzeTrends(readings);
    const insights: string[] = [];

    // Time in range insights
    if (stats.timeInRange >= 70) {
      insights.push('Excellent glucose control - time in range above 70%');
    } else if (stats.timeInRange >= 50) {
      insights.push('Good glucose control - consider optimizing to reach 70% time in range');
    } else {
      insights.push('Glucose control needs improvement - focus on reducing time above/below range');
    }

    // Variability insights
    if (stats.coefficientOfVariation <= 33) {
      insights.push('Low glucose variability - excellent stability');
    } else if (stats.coefficientOfVariation <= 36) {
      insights.push('Moderate glucose variability - room for improvement');
    } else {
      insights.push('High glucose variability - consider strategies to improve stability');
    }

    // GMI insights
    if (stats.gmi < 7.0) {
      insights.push('GMI indicates excellent glucose management');
    } else if (stats.gmi < 8.0) {
      insights.push('GMI indicates good glucose management with room for improvement');
    } else {
      insights.push('GMI suggests glucose management needs significant improvement');
    }

    return insights;
  }
}