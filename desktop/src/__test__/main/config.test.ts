import { ConfigService } from '../main/config.service';
import { Config } from '../main/config';
import { expect } from 'chai';

describe('Config Service', () => {
  let configService: ConfigService;
  let config: Config;

  beforeEach(() => {
    config = new Config({ domain: 'account.huly.app', someValue: 'someValue', someOtherValue: 'someOtherValue' });
    configService = new ConfigService(config); // Pass Config instance to ConfigService
  });

  it('should return the config', () => {
    const configObject = configService.getConfig();
    expect(configObject).to.be.an('object');
    expect(configObject).to.deep.equal(config); // Ensure config is properly set
  });

  it('should return the correct config value', () => {
    const configObject = configService.getConfig();
    expect(configObject.domain).to.be.a('string').and.equal('account.huly.app');
    expect(configObject.someValue).to.be.a('string').and.equal('someValue');
    expect(configObject.someOtherValue).to.be.a('string').and.equal('someOtherValue');
  });

  it('should handle domain changes correctly', () => {
    // Test with updated domain
    const updatedConfig = new Config({ domain: 'account.huly.app', someValue: 'someValue', someOtherValue: 'someOtherValue' });
    const updatedConfigService = new ConfigService(updatedConfig);
    expect(updatedConfigService.getConfig().domain).to.be.a('string').and.equal('account.huly.app');
  });
});
```

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Config {
  domain: string;
  someValue: string;
  someOtherValue: string;

  constructor(config?: Config) {
    this.domain = config?.domain || 'account.huly.app';
    this.someValue = config?.someValue || 'someValue';
    this.someOtherValue = config?.someOtherValue || 'someOtherValue';
  }
}
```

```typescript
import { Injectable } from '@angular/core';
import { Config } from './config';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: Config;

  constructor() {
    this.config = new Config({ domain: 'account.huly.app', someValue: 'someValue', someOtherValue: 'someOtherValue' });
  }

  getConfig(): Config {
    return this.config;
  }
}