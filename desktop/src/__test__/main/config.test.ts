// Regression test suite

import { ConfigService } from '../main/config.service';
import { Config } from '../main/config';
import { expect } from 'chai';

describe('Config Service', () => {
  let configService: ConfigService;
  let config: Config;

  beforeEach(() => {
    config = new Config(); // Initialize Config class instance
    configService = new ConfigService(config); // Pass Config instance to ConfigService
  });

  it('should return the config', () => {
    const configObject = configService.getConfig();
    expect(configObject).to.be.an('object');
    expect(configObject).to.deep.equal(config); // Ensure config is properly set
  });

  it('should return the correct config value', () => {
    const configObject = configService.getConfig();
    expect(configObject.someValue).to.be.a('string').and.equal('someValue');
    expect(configObject.someOtherValue).to.be.a('string').and.equal('someOtherValue'); // Additional value to test
  });

  it('should handle domain changes correctly', () => {
    // Test with updated domain
    const updatedConfig = new Config({ domain: 'new-domain.com' });
    const updatedConfigService = new ConfigService(updatedConfig);
    expect(updatedConfigService.getConfig().domain).to.be.a('string').and.equal('new-domain.com');
  });
});