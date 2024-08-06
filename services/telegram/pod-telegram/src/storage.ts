import { MongoClientReference, getMongoClient } from '@hcengineering/mongo'
import { MongoClient } from 'mongodb'

import config from './config'

const clientRef: MongoClientReference = getMongoClient(config.MongoURI)
let client: MongoClient | undefined
export const getDB = (() => {
  return async () => {
    if (client === undefined) {
      client = await clientRef.getClient()
    }

    return client.db(config.MongoDB)
  }
})()

export const closeDB: () => Promise<void> = async () => {
  clientRef.close()
}
