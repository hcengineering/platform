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
    parseStorageEnv('minio,myminio|localhost:9000?accessKey=minio&secretKey=minio2', cfg)
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
  it('test-decode unexpected symbols', async () => {
    const cfg: StorageConfiguration = { default: '', storages: [] }
    parseStorageEnv(
      'minio|localhost:9000?accessKey=%F0%9F%91%85%F0%9F%91%BB%20-%20%D0%AD%D0%A2%D0%9E%20%20%20%20%D1%82%D0%B0%D0%BA%D0%BE%D0%B9%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C%0A%D0%90%20%D1%82%D0%BE&secretKey=minio2&downloadUrl=https%3A%2F%2Ffront.hc.engineering',
      cfg
    )
    expect(cfg.default).toEqual('minio')
    const minio = cfg.storages[0] as MinioConfig
    expect(minio.endpoint).toEqual('localhost')
    expect(minio.port).toEqual(9000)
    expect(minio.accessKey).toEqual('👅👻 - ЭТО    такой пароль\nА то')
    expect(minio.secretKey).toEqual('minio2')
    expect((minio as any).downloadUrl).toEqual('https://front.hc.engineering')
  })
  it('test-decode unexpected symbols', async () => {
    const cfg: StorageConfiguration = { default: '', storages: [] }
    parseStorageEnv(
      'minio|localhost:9000?accessKey=%F0%9F%91%85%F0%9F%91%BB%20-%20%D0%AD%D0%A2%D0%9E%20%20%20%20%D1%82%D0%B0%D0%BA%D0%BE%D0%B9%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C%0A%D0%90%20%D1%82%D0%BE&secretKey=minio2&downloadUrl=https%3A%2F%2Ffront.hc.engineering|image/jpeg,image/gif',
      cfg
    )
    expect(cfg.default).toEqual('minio')
    const minio = cfg.storages[0] as MinioConfig
    expect(minio.endpoint).toEqual('localhost')
    expect(minio.port).toEqual(9000)
    expect(minio.accessKey).toEqual('👅👻 - ЭТО    такой пароль\nА то')
    expect(minio.secretKey).toEqual('minio2')
    expect(minio.contentTypes).toEqual(['image/jpeg', 'image/gif'])
    expect((minio as any).downloadUrl).toEqual('https://front.hc.engineering')
  })
})
