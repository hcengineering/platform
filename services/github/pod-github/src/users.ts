import type { AccountClient, IntegrationSecret } from '@hcengineering/account-client'
import { systemAccountUuid, type PersonId, type WorkspaceUuid } from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import type { GithubUserRecord } from './types'

export class UserManager {
  userCache = new Map<string, GithubUserRecord>()
  refUserCache = new Map<string, GithubUserRecord>()

  accountClient: AccountClient

  constructor () {
    const sysToken = generateToken(systemAccountUuid, '' as WorkspaceUuid, { service: 'github' })
    this.accountClient = getAccountClient(sysToken, 30000)
  }

  async getAccount (login: string): Promise<GithubUserRecord | undefined> {
    let res = this.userCache.get(login)
    if (res !== undefined) {
      return res
    }
    const secrets = await this.accountClient.listIntegrationsSecrets({ kind: 'github-user', key: login })
    if (secrets.length === 0) {
      return
    }
    res = this.secretToUserRecord(secrets[0], login)
    if (res !== undefined) {
      if (this.userCache.size > 1000) {
        this.userCache.clear()
      }
      this.userCache.set(login, res)
    }
    return res
  }

  private secretToUserRecord (secret: IntegrationSecret, login: string): GithubUserRecord | undefined {
    return {
      ...(JSON.parse(secret.secret) ?? {}), // TODO: Add security
      account: secret.socialId,
      _id: login,
      accounts: {}
    }
  }

  async getAccountByRef (workspace: WorkspaceUuid, ref: PersonId): Promise<GithubUserRecord | undefined> {
    const key = `${workspace}.${ref}`
    let rec = this.refUserCache.get(key)
    if (rec !== undefined) {
      return rec
    }

    const secrets = await this.accountClient.listIntegrationsSecrets({ kind: 'github-user', socialId: ref })
    if (secrets.length === 0) {
      return
    }

    rec = this.secretToUserRecord(secrets[0], secrets[0].key)
    if (rec !== undefined) {
      if (this.refUserCache.size > 1000) {
        this.refUserCache.clear()
      }
      this.refUserCache.set(key, rec)
    }
    return rec
  }

  async updateUser (dta: GithubUserRecord, clear: boolean = true): Promise<void> {
    if (clear) {
      this.userCache.clear()
      this.refUserCache.clear()
    }

    // Need to check if user integeration exists.
    const existing = await this.accountClient.getIntegration({
      kind: 'github-user',
      workspaceUuid: null,
      socialId: dta.account
    })

    if (existing == null) {
      await this.accountClient.createIntegration({
        kind: 'github-user',
        workspaceUuid: null,
        socialId: dta.account,
        data: {
          login: dta._id
        }
      })
    }

    const exists = await this.accountClient.getIntegrationSecret({
      key: dta._id,
      kind: 'github-user',
      socialId: dta.account,
      workspaceUuid: null
    })

    if (exists !== null) {
      await this.accountClient.updateIntegrationSecret({
        key: dta._id,
        kind: 'github-user',
        socialId: dta.account,
        secret: JSON.stringify(dta),
        workspaceUuid: null
      })
    } else {
      await this.accountClient.addIntegrationSecret({
        key: dta._id,
        kind: 'github-user',
        socialId: dta.account,
        secret: JSON.stringify(dta),
        workspaceUuid: null
      })
    }
  }

  async insertUser (dta: GithubUserRecord): Promise<void> {
    await this.updateUser(dta, false)
  }

  async removeUser (login: string): Promise<void> {
    this.userCache.clear()
    this.refUserCache.clear()

    const secerts = await this.accountClient.listIntegrationsSecrets({ kind: 'github-user', key: login })
    for (const s of secerts) {
      await this.accountClient.deleteIntegrationSecret(s)
    }
  }
}
