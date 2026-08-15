// Regression test suite

import { ConfigService } from '../main/config.service';

describe('Config Service', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
  });

  it('should return the config', () => {
    expect(configService.getConfig()).toBeDefined();
  });

  it('should return the correct config value', () => {
    expect(configService.getConfig().someValue).toBe('someValue');
  });
});