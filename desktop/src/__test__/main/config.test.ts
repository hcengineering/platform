// Regression test suite

import { ConfigService } from '../main/config.service';
import { Config } from '../main/config'; // Added import for Config class

describe('Config Service', () => {
  let configService: ConfigService;
  let config: Config; // Added variable for Config class instance

  beforeEach(() => {
    config = new Config(); // Initialize Config class instance
    configService = new ConfigService(config); // Pass Config instance to ConfigService
  });

  it('should return the config', () => {
    expect(configService.getConfig()).toBeDefined();
  });

  it('should return the correct config value', () => {
    expect(configService.getConfig().someValue).toBe('someValue');
  });
});