// Regression test suite

import { ConfigService } from '../main/config.service';
import { Config } from '../main/config';

describe('Config Service', () => {
  let configService: ConfigService;
  let config: Config;

  beforeEach(() => {
    config = new Config(); // Initialize Config class instance
    configService = new ConfigService(config); // Pass Config instance to ConfigService
  });

  it('should return the config', () => {
    expect(configService.getConfig()).toBeDefined();
    expect(configService.getConfig()).toEqual(config); // Ensure config is properly set
  });

  it('should return the correct config value', () => {
    expect(configService.getConfig().someValue).toBe('someValue');
    expect(configService.getConfig().someOtherValue).toBe('someOtherValue'); // Additional value to test
  });

  it('should handle domain changes correctly', () => {
    // Test with updated domain
    const updatedConfig = new Config({ domain: 'new-domain.com' });
    const updatedConfigService = new ConfigService(updatedConfig);
    expect(updatedConfigService.getConfig().domain).toBe('new-domain.com');
  });
});