import type { MinioConfig } from '@hcengineering/minio'
import type { S3Config } from '@hcengineering/s3'
import type { StorageConfiguration } from '@hcengineering/server-core'
import { parseStorageEnv } from '../starter'

describe('config-parse', () => {
  it('single-minio', async () => {
    const cfg: StorageConfiguration = { default: '', storages: [] }
    parseStorageEnv('minio|localhost:9000?accessKey=minio&secretKey=minio2', cfg)
    expect(cfg.default).toEqual('minio')
    const minio = cfg.storages[0] as MinioConfig
    expect(minio.endpoint).toEqual('localhost')
    expect(minio.port).toEqual(9000)
    expect(minio.accessKey).toEqual('minio')
    expect(minio.secretKey).toEqual('minio2')
  })
  it('single-minio-named', async () => {
    const cfg: StorageConfiguration = { default: '', storages: [] }
    parseStorageEnv('minio|myminio|localhost:9000?accessKey=minio&secretKey=minio2', cfg)
    expect(cfg.default).toEqual('myminio')
    const minio = cfg.storages[0] as MinioConfig
    expect(minio.endpoint).toEqual('localhost')
    expect(minio.port).toEqual(9000)
    expect(minio.accessKey).toEqual('minio')
    expect(minio.secretKey).toEqual('minio2')
  })
  it('single-s3-line', async () => {
    const cfg: StorageConfiguration = { default: '', storages: [] }
    parseStorageEnv('s3|https://s3.somehost.com?accessKey=minio&secretKey=minio2', cfg)
    expect(cfg.default).toEqual('s3')
    const minio = cfg.storages[0] as S3Config
    expect(minio.endpoint).toEqual('https://s3.somehost.com')
    expect(minio.port).toEqual(undefined)
    expect(minio.accessKey).toEqual('minio')
    expect(minio.secretKey).toEqual('minio2')
  })
  it('multiple', async () => {
    const cfg: StorageConfiguration = { default: '', storages: [] }
    parseStorageEnv(
      'minio|localhost:9000?accessKey=minio&secretKey=minio2;s3|http://localhost?accessKey=minio&secretKey=minio2',
      cfg
    )
    expect(cfg.default).toEqual('s3')
    expect(cfg.storages.length).toEqual(2)
  })
})
