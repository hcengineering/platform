import { MinioConfig, MinioService, addMinioFallback } from '@hcengineering/minio'
import { createRawMongoDBAdapter } from '@hcengineering/mongo'
import { S3Service, type S3Config } from '@hcengineering/s3'
import {
  AggregatorStorageAdapter,
  StorageAdapter,
  StorageConfiguration,
  buildStorage,
  type StorageConfig
} from '@hcengineering/server-core'

/*

  A ';' separated list of URI's to configure the storage adapters. A new lines will be ommited during parse.

  Each config is in `kind(,name)?|uri|contentTypes` format.

  * kind - an storage kind minior/s3 for now.
  * name - a symbolic name for provider, name could be ommited in case kind will be used as name.
  * uri - an storage URI with encoded parameters.
  * contentTypes - a comma separated list of content type patterns. Like 'image/*,video/gif' will match all image/* and video/gif formats.
  So * will be replaced to `.*` for regexp

  Last one is used as default one, or one with conrent type matched will be used.

  Example:
  STORAGE_CONFIG=kind|minio|minio:9000?accessKey=minio&secretKey=minio&useSSL=false;\
    s3|https://s3.amazonaws.com?accessKey=${ACCESS_KEY}&secretKey=${SECRET_KEY}&region=us-east-1

*/

export function storageConfigFromEnv (): StorageConfiguration {
  const storageConfig: StorageConfiguration = { default: '', storages: [] }

  const storageEnv = process.env.STORAGE_CONFIG
  if (storageEnv !== undefined) {
    parseStorageEnv(storageEnv, storageConfig)
  }

  if (storageConfig.storages.length === 0 || storageConfig.default === '') {
    // 'STORAGE_CONFIG is required for complex configuration, fallback to minio config'
    addMinioFallback(storageConfig)
  }
  return storageConfig
}

export function parseStorageEnv (storageEnv: string, storageConfig: StorageConfiguration): void {
  const storages = storageEnv.split(';')
  for (const st of storages) {
    if (st.trim().length === 0 || !st.includes('|')) {
      throw new Error('Invalid storage config:' + st)
    }
    let [kindName, url, contentTypes] = st.split('|')
    let [kind, name] = kindName.split(',')
    if (name == null) {
      name = kind
    }
    let hasProtocol = true
    if (!url.includes('://')) {
      // No protocol, add empty one
      url = 'empty://' + url
      hasProtocol = false
    }
    const uri = new URL(url)
    const config: StorageConfig = {
      kind,
      name,
      endpoint: (hasProtocol ? uri.protocol + '//' : '') + uri.hostname, // Port should go away
      port: uri.port !== '' ? parseInt(uri.port) : undefined,
      contentTypes: contentTypes !== undefined ? contentTypes.split(',') : undefined
    }

    // Add all extra parameters
    uri.searchParams.forEach((v, k) => {
      ;(config as any)[k] = v
    })

    if (storageConfig.storages.find((it) => it.name === config.name) !== undefined) {
      throw new Error(`Duplicated storage name ${config.name}, skipping config:${st}`)
    }
    storageConfig.storages.push(config)
    storageConfig.default = config.name
  }
}

export function buildStorageFromConfig (config: StorageConfiguration, dbUrl: string): AggregatorStorageAdapter {
  return buildStorage(config, createRawMongoDBAdapter(dbUrl), (kind, config): StorageAdapter => {
    if (kind === MinioService.config) {
      const c = config as MinioConfig
      if (c.endpoint == null || c.accessKey == null || c.secretKey == null) {
        throw new Error('One of endpoint/accessKey/secretKey values are not specified')
      }
      return new MinioService(c)
    } else if (kind === S3Service.config) {
      const c = config as S3Config
      if (c.endpoint == null || c.accessKey == null || c.secretKey == null) {
        throw new Error('One of endpoint/accessKey/secretKey values are not specified')
      }
      return new S3Service(c)
    } else {
      throw new Error('Unsupported storage kind:' + kind)
    }
  })
}
