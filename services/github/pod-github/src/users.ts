import type { PersonId } from '@hcengineering/core'
import type { Collection, FindCursor } from 'mongodb'
import type { GithubUserRecord } from './types'

export class UserManager {
  userCache = new Map<string, GithubUserRecord>()
  refUserCache = new Map<string, GithubUserRecord>()

  constructor (readonly usersCollection: Collection<GithubUserRecord>) {}

  public async getUsers (workspace: string): Promise<GithubUserRecord[]> {
    return await this.usersCollection
      .find<GithubUserRecord>({
      [`accounts.${workspace}`]: { $exists: true }
    })
      .toArray()
  }

  async getAccount (login: string): Promise<GithubUserRecord | undefined> {
    let res = this.userCache.get(login)
    if (res !== undefined) {
      return res
    }
    res = (await this.usersCollection.findOne({ _id: login })) ?? undefined
    if (res !== undefined) {
      if (this.userCache.size > 1000) {
        this.userCache.clear()
      }
      this.userCache.set(login, res)
    }
    return res
  }

  async getAccountByRef (workspace: string, ref: PersonId): Promise<GithubUserRecord | undefined> {
    const key = `${workspace}.${ref}`
    let rec = this.refUserCache.get(key)
    if (rec !== undefined) {
      return rec
    }
    rec = (await this.usersCollection.findOne({ [`accounts.${workspace}`]: ref })) ?? undefined
    if (rec !== undefined) {
      if (this.refUserCache.size > 1000) {
        this.refUserCache.clear()
      }
      this.refUserCache.set(key, rec)
    }
    return rec
  }

  async updateUser (dta: GithubUserRecord): Promise<void> {
    this.userCache.clear()
    this.refUserCache.clear()
    await this.usersCollection.updateOne({ _id: dta._id }, { $set: dta } as any)
  }

  async insertUser (dta: GithubUserRecord): Promise<void> {
    await this.usersCollection.insertOne(dta)
  }

  async removeUser (login: string): Promise<void> {
    this.userCache.clear()
    this.refUserCache.clear()
    await this.usersCollection.deleteOne({ _id: login })
  }

  getAllUsers (): FindCursor<GithubUserRecord> {
    return this.usersCollection.find({})
  }
}
