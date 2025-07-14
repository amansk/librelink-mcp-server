export interface GlucoseReading {
  value: number;           // mg/dL glucose value
  timestamp: Date;         // Reading timestamp
  trend: TrendType;        // Arrow direction (up/down/stable)
  isHigh: boolean;         // Above target range
  isLow: boolean;          // Below target range
  color: string;           // UI color indicator
}

export enum TrendType {
  FLAT = "Flat",
  FORTY_FIVE_UP = "FortyFiveUp", 
  SINGLE_UP = "SingleUp",
  DOUBLE_UP = "DoubleUp",
  FORTY_FIVE_DOWN = "FortyFiveDown",
  SINGLE_DOWN = "SingleDown", 
  DOUBLE_DOWN = "DoubleDown"
}

export interface HistoricalData {
  graphData: GlucoseReading[];    // Array of historical readings
  glucoseMeasurement: GlucoseReading; // Latest reading
  activeSensors: SensorInfo[];     // Sensor status/info
}

export interface SensorInfo {
  deviceId: string;
  serialNumber: string;
  activationTime: Date;
  state: string;           // "Active", "Expired", etc.
  deviceType: string;      // "FreeStyle Libre 3", etc.
}

export interface LibreLinkConfig {
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

export interface GlucoseStats {
  average: number;
  gmi: number;                    // Glucose Management Indicator
  timeInRange: number;           // Percentage in target range
  timeBelowRange: number;        // Percentage below target
  timeAboveRange: number;        // Percentage above target
  standardDeviation: number;
  coefficientOfVariation: number;
}

export interface TrendAnalysis {
  patterns: string[];
  dawnPhenomenon: boolean;
  mealResponse: number;
  overnightStability: number;
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}