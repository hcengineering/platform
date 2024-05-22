import { MinioConfig } from '@hcengineering/minio'
import { StorageConfiguration } from '@hcengineering/server-core'

export function addMinioFallback (storageConfig: StorageConfiguration): void {
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
    useSSL: 'false',
    endpoint: minioEndpoint,
    accessKey: minioAccessKey,
    secretKey: minioSecretKey
  }
  storageConfig.storages.push(minioConfig)
  storageConfig.default = 'minio'
}
