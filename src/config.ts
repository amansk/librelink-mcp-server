import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { LibreLinkConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.librelink-mcp');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export const DEFAULT_CONFIG: LibreLinkConfig = {
  credentials: {
    email: '',
    password: ''
  },
  client: {
    version: '4.12.0',
    region: 'US'
  },
  cache: {
    enabled: true,
    ttl_minutes: 5
  },
  ranges: {
    target_low: 70,
    target_high: 180
  }
};

export class ConfigManager {
  private config: LibreLinkConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): LibreLinkConfig {
    if (!existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const configData = readFileSync(CONFIG_FILE, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_CONFIG,
        ...parsedConfig,
        credentials: {
          ...DEFAULT_CONFIG.credentials,
          ...parsedConfig.credentials
        },
        client: {
          ...DEFAULT_CONFIG.client,
          ...parsedConfig.client
        },
        cache: {
          ...DEFAULT_CONFIG.cache,
          ...parsedConfig.cache
        },
        ranges: {
          ...DEFAULT_CONFIG.ranges,
          ...parsedConfig.ranges
        }
      };
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config: LibreLinkConfig): void {
    try {
      // Ensure config directory exists
      mkdirSync(CONFIG_DIR, { recursive: true });

      writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  getConfig(): LibreLinkConfig {
    return { ...this.config };
  }

  updateCredentials(email: string, password: string): void {
    const updatedConfig = {
      ...this.config,
      credentials: { email, password }
    };
    this.saveConfig(updatedConfig);
  }

  updateRanges(targetLow: number, targetHigh: number): void {
    const updatedConfig = {
      ...this.config,
      ranges: {
        target_low: targetLow,
        target_high: targetHigh
      }
    };
    this.saveConfig(updatedConfig);
  }

  updateRegion(region: 'US' | 'EU'): void {
    const updatedConfig = {
      ...this.config,
      client: {
        ...this.config.client,
        region
      }
    };
    this.saveConfig(updatedConfig);
  }

  isConfigured(): boolean {
    return !!(this.config.credentials.email && this.config.credentials.password);
  }

  validateConfig(): string[] {
    const errors: string[] = [];

    if (!this.config.credentials.email) {
      errors.push('Email is required');
    }

    if (!this.config.credentials.password) {
      errors.push('Password is required');
    }

    if (this.config.ranges.target_low >= this.config.ranges.target_high) {
      errors.push('Target low must be less than target high');
    }

    if (this.config.ranges.target_low < 50 || this.config.ranges.target_low > 150) {
      errors.push('Target low should be between 50-150 mg/dL');
    }

    if (this.config.ranges.target_high < 100 || this.config.ranges.target_high > 300) {
      errors.push('Target high should be between 100-300 mg/dL');
    }

    return errors;
  }
}