import { MinioConfig, MinioService } from '@hcengineering/minio'
import { createRawMongoDBAdapter } from '@hcengineering/mongo'
import { buildStorage, StorageAdapter, StorageConfiguration } from '@hcengineering/server-core'
import { serverFactories, ServerFactory } from '@hcengineering/server-ws'

export function storageConfigFromEnv (): StorageConfiguration {
  const storageConfig: StorageConfiguration = JSON.parse(
    process.env.STORAGE_CONFIG ?? '{ "default": "", "storages": []}'
  )
  if (storageConfig.storages.length === 0 || storageConfig.default === '') {
    console.info('STORAGE_CONFIG is required for complex configuration, fallback to minio config')

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

export function serverConfigFromEnv (): {
  url: string
  elasticUrl: string
  serverSecret: string
  rekoniUrl: string
  frontUrl: string
  sesUrl: string | undefined
  accountsUrl: string
  serverPort: number
  serverFactory: ServerFactory
  enableCompression: boolean
  elasticIndexName: string
} {
  const serverPort = parseInt(process.env.SERVER_PORT ?? '3333')
  const serverFactory = serverFactories[(process.env.SERVER_PROVIDER as string) ?? 'ws'] ?? serverFactories.ws
  const enableCompression = (process.env.ENABLE_COMPRESSION ?? 'true') === 'true'

  const url = process.env.MONGO_URL
  if (url === undefined) {
    console.error('please provide mongodb url')
    process.exit(1)
  }

  const elasticUrl = process.env.ELASTIC_URL
  if (elasticUrl === undefined) {
    console.error('please provide elastic url')
    process.exit(1)
  }
  const elasticIndexName = process.env.ELASTIC_INDEX_NAME
  if (elasticIndexName === undefined) {
    console.log('Please provide ELASTIC_INDEX_NAME')
    process.exit(1)
  }

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.log('Please provide server secret')
    process.exit(1)
  }

  const rekoniUrl = process.env.REKONI_URL
  if (rekoniUrl === undefined) {
    console.log('Please provide REKONI_URL url')
    process.exit(1)
  }

  const frontUrl = process.env.FRONT_URL
  if (frontUrl === undefined) {
    console.log('Please provide FRONT_URL url')
    process.exit(1)
  }

  const sesUrl = process.env.SES_URL

  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.log('Please provide ACCOUNTS_URL url')
    process.exit(1)
  }
  return {
    url,
    elasticUrl,
    elasticIndexName,
    serverSecret,
    rekoniUrl,
    frontUrl,
    sesUrl,
    accountsUrl,
    serverPort,
    serverFactory,
    enableCompression
  }
}

// Temporary solution, until migration will be implemented.
const ONLY_MINIO = true

export function buildStorageFromConfig (config: StorageConfiguration, dbUrl: string): StorageAdapter {
  if (ONLY_MINIO) {
    const minioConfig = config.storages.find((it) => it.kind === 'minio') as MinioConfig
    if (minioConfig === undefined) {
      throw new Error('minio config is required')
    }

    return new MinioService({
      accessKey: minioConfig.accessKeyId,
      secretKey: minioConfig.accessKeyId,
      endPoint: minioConfig.endpoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL
    })
  }
  return buildStorage(config, createRawMongoDBAdapter(dbUrl), (kind, config) => {
    if (kind === MinioService.config) {
      const c = config as MinioConfig
      return new MinioService({
        accessKey: c.accessKeyId,
        secretKey: c.accessKeyId,
        endPoint: c.endpoint,
        port: c.port,
        useSSL: c.useSSL
      })
    } else {
      throw new Error('Unsupported storage kind:' + kind)
    }
  })
}
