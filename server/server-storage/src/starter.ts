import { MinioConfig, MinioService } from '@hcengineering/minio'
import { createRawMongoDBAdapter } from '@hcengineering/mongo'
import { StorageAdapter, StorageConfiguration, buildStorage } from '@hcengineering/server-core'

export function storageConfigFromEnv (): StorageConfiguration {
  const storageConfig: StorageConfiguration = JSON.parse(
    process.env.STORAGE_CONFIG ?? '{ "default": "", "storages": []}'
  )
  if (storageConfig.storages.length === 0 || storageConfig.default === '') {
    // 'STORAGE_CONFIG is required for complex configuration, fallback to minio config'

    let minioEndpoint = process.env.MINIO_ENDPOINT
    if (minioEndpoint === undefined) {
      console.error('MINIO_ENDPOINT is required')
      process.exit(1)
    }
    const minioAccessKey = process.env.MINIO_ACCESS_KEY
    if (minioAccessKey === undefined) {
      console.error('MINIO_ACCESS_KEY is required')
      process.exit(1)
    }

    let minioPort = 9000
    const sp = minioEndpoint.split(':')
    if (sp.length > 1) {
      minioEndpoint = sp[0]
      minioPort = parseInt(sp[1])
    }

    const minioSecretKey = process.env.MINIO_SECRET_KEY
    if (minioSecretKey === undefined) {
      console.error('MINIO_SECRET_KEY is required')
      process.exit(1)
    }

    const minioConfig: MinioConfig = {
      kind: 'minio',
      name: 'minio',
      port: minioPort,
      region: 'us-east-1',
      useSSL: false,
      endpoint: minioEndpoint,
      accessKeyId: minioAccessKey,
      secretAccessKey: minioSecretKey
    }
    storageConfig.storages.push(minioConfig)
    storageConfig.default = 'minio'
  }
  return storageConfig
}

export function buildStorageFromConfig (config: StorageConfiguration, dbUrl: string): StorageAdapter {
  return buildStorage(config, createRawMongoDBAdapter(dbUrl), (kind, config): StorageAdapter => {
    if (kind === MinioService.config) {
      const c = config as MinioConfig
      return new MinioService({
        accessKey: c.accessKeyId,
        secretKey: c.secretAccessKey,
        endPoint: c.endpoint,
        region: c.region,
        port: c.port,
        useSSL: c.useSSL
      })
    } else {
      throw new Error('Unsupported storage kind:' + kind)
    }
  })
}
