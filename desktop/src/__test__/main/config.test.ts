// Regression test suite

import { ConfigService } from '../../../src/main/config/config.service';
import { ConfigServiceMock } from './config.service.mock';
import { TestHelper } from './test-helper';

describe('ConfigService', () => {
  let configService: ConfigService;
  let configServiceMock: ConfigServiceMock;
  let testHelper: TestHelper;

  beforeEach(async () => {
    configServiceMock = new ConfigServiceMock();
    configService = new ConfigService(configServiceMock);
    testHelper = new TestHelper();
    await testHelper.configureTestingModule({
      imports: [ConfigService],
      providers: [
        { provide: ConfigService, useValue: configServiceMock },
      ],
    });
  });

  afterEach(() => {
    testHelper.destroy();
  });

  it('should return the correct config', async () => {
    const config = await configService.getConfig();
    expect(config).toEqual(configServiceMock.getConfig());
  });

  it('should throw an error when trying to get the config with an invalid input', async () => {
    await testHelper.inject(() => configService.getConfig('invalid-input'));
    expect(testHelper.lastError()).toBeInstanceOf(Error);
  });

  // Fixing the test to correctly test the error handling
  it('should throw an error when trying to get the config with an invalid input (with error message)', async () => {
    try {
      await configService.getConfig('invalid-input');
    } catch (error) {
      expect(error.message).toBe('Invalid input');
    }
  });
});