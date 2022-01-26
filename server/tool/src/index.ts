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
import { Client } from 'minio'
import { Document, MongoClient } from 'mongodb'
import { connect } from './connect'
import { MigrateClientImpl } from './upgrade'
import toolPlugin from './plugin'

export { version } from '@anticrm/model-all'
export * from './plugin'
export { toolPlugin as default }
export * from './connect'

/**
 * @public
 */
export function prepareTools (): { mongodbUri: string, minio: Client, txes: Tx[] } {
  const minioEndpoint = process.env.MINIO_ENDPOINT
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

  const minio = new Client({
    endPoint: minioEndpoint,
    port: 9000,
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
