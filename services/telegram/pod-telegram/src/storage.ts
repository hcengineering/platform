import { MongoClient } from 'mongodb'

import config from './config'

export const getDB = (() => {
  let client: MongoClient | undefined

  return async () => {
    if (client === undefined) {
      client = new MongoClient(config.MongoURI)
      await client.connect()
    }

    return client.db(config.MongoDB)
  }
})()
