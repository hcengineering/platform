//
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import contact from '@anticrm/contact'
import core, { DOMAIN_TX, Tx } from '@anticrm/core'
import builder, { createDeps, migrateOperations } from '@anticrm/model-all'
import { getMetadata } from '@anticrm/platform'
import { decode, encode } from 'jwt-simple'
import { Client } from 'minio'
import { Document, MongoClient } from 'mongodb'
import { connect } from './connect'
import toolPlugin from './plugin'
import { MigrateClientImpl } from './upgrade'

export { version } from '@anticrm/model-all'
export * from './connect'
export * from './plugin'
export { toolPlugin as default }

/**
 * @public
 */
export function prepareTools (): { mongodbUri: string, minio: Client, txes: Tx[] } {
  let minioEndpoint = process.env.MINIO_ENDPOINT
  if (minioEndpoint === undefined) {
    console.error('please provide minio endpoint')
    process.exit(1)
  }

  const minioAccessKey = process.env.MINIO_ACCESS_KEY
  if (minioAccessKey === undefined) {
    console.error('please provide minio access key')
    process.exit(1)
  }

  const minioSecretKey = process.env.MINIO_SECRET_KEY
  if (minioSecretKey === undefined) {
    console.error('please provide minio secret key')
    process.exit(1)
  }

  const mongodbUri = process.env.MONGO_URL
  if (mongodbUri === undefined) {
    console.error('please provide mongodb url.')
    process.exit(1)
  }

  let minioPort = 9000
  const sp = minioEndpoint.split(':')
  if (sp.length > 1) {
    minioEndpoint = sp[0]
    minioPort = parseInt(sp[1])
  }

  const minio = new Client({
    endPoint: minioEndpoint,
    port: minioPort,
    useSSL: false,
    accessKey: minioAccessKey,
    secretKey: minioSecretKey
  })

  const txes = JSON.parse(JSON.stringify(builder.getTxes())) as Tx[]
  return { mongodbUri, minio, txes }
}

/**
 * @public
 */
export async function initModel (transactorUrl: string, dbName: string): Promise<void> {
  const { mongodbUri, minio, txes } = prepareTools()
  if (txes.some((tx) => tx.objectSpace !== core.space.Model)) {
    throw Error('Model txes must target only core.space.Model')
  }

  const client = new MongoClient(mongodbUri)
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log('dropping database...')
    await db.dropDatabase()

    console.log('creating model...')
    const model = txes
    const result = await db.collection(DOMAIN_TX).insertMany(model as Document[])
    console.log(`${result.insertedCount} model transactions inserted.`)

    console.log('creating data...')
    const connection = await connect(transactorUrl, dbName)
    try {
      await createDeps(connection)
    } catch (e) {
      console.log(e)
    } finally {
      await connection.close()
    }

    console.log('create minio bucket')
    if (!(await minio.bucketExists(dbName))) {
      await minio.makeBucket(dbName, 'k8s')
    }
  } finally {
    await client.close()
  }
}

/**
 * @public
 */
export async function upgradeModel (
  transactorUrl: string,
  dbName: string
): Promise<void> {
  const { mongodbUri, txes } = prepareTools()
  if (txes.some((tx) => tx.objectSpace !== core.space.Model)) {
    throw Error('Model txes must target only core.space.Model')
  }

  const client = new MongoClient(mongodbUri)
  try {
    await client.connect()
    const db = client.db(dbName)

    console.log('removing model...')
    // we're preserving accounts (created by core.account.System).
    const result = await db.collection(DOMAIN_TX).deleteMany({
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      objectClass: { $ne: contact.class.EmployeeAccount }
    })
    console.log(`${result.deletedCount} transactions deleted.`)

    console.log('creating model...')
    const model = txes
    const insert = await db.collection(DOMAIN_TX).insertMany(model as Document[])
    console.log(`${insert.insertedCount} model transactions inserted.`)

    const migrateClient = new MigrateClientImpl(db)
    for (const op of migrateOperations) {
      await op.migrate(migrateClient)
    }

    console.log('Apply upgrade operations')

    const connection = await connect(transactorUrl, dbName)
    for (const op of migrateOperations) {
      await op.upgrade(connection)
    }

    await connection.close()
  } finally {
    await client.close()
  }
}

const getSecret = (): string => {
  return getMetadata(toolPlugin.metadata.Secret) ?? 'secret'
}

/**
 * @public
 */
export function generateToken (email: string, workspace: string): string {
  return encode({ email, workspace }, getSecret())
}

/**
 * @public
 */
export function decodeToken (token: string): { email: string, workspace: string} {
  return decode(token, getSecret())
}
