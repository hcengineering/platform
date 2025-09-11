import type { AccountClient, IntegrationSecret } from '@hcengineering/account-client'
import core, { systemAccountUuid, type MeasureContext, type PersonId, type WorkspaceUuid } from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { githubUserIntegrationKind } from '@hcengineering/github'
import type { GithubUserRecord } from './types'

export class UserManager {
  userCache = new Map<string, GithubUserRecord>()
  refUserCache = new Map<string, GithubUserRecord>()

  accountClient: AccountClient

  constructor () {
    const sysToken = generateToken(systemAccountUuid, undefined, { service: 'github' })
    this.accountClient = getAccountClient(sysToken, 30000)
  }

  async getAccount (login: string): Promise<GithubUserRecord | undefined> {
    let res = this.userCache.get(login)
    if (res !== undefined) {
      return res
    }
    const secrets = await this.accountClient.listIntegrationsSecrets({ kind: githubUserIntegrationKind, key: login })
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

  failedRefs = new Set<string>()

  cacheRecord (workspace: WorkspaceUuid, ref: PersonId, record: GithubUserRecord): void {
    if (this.refUserCache.size > 1000) {
      this.refUserCache.clear()
    }
    const key = `${workspace}.${ref}`
    this.refUserCache.set(key, record)
  }

  async getAccountByRef (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    ref: PersonId
  ): Promise<GithubUserRecord | undefined> {
    const key = `${workspace}.${ref}`
    let rec = this.refUserCache.get(key)
    if (rec !== undefined) {
      return rec
    }
    if (ref === core.account.System || ref === core.account.ConfigUser) {
      return undefined
    }

    try {
      if (this.failedRefs.has(ref)) {
        // Ignore failed refs
        return
      }
      const secrets = await this.accountClient.listIntegrationsSecrets({
        kind: githubUserIntegrationKind,
        socialId: ref
      })
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
    } catch (err: any) {
      this.failedRefs.add(ref)
      ctx.warn('failed to get user by ref', { workspace, ref, err })
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
      kind: githubUserIntegrationKind,
      workspaceUuid: null,
      socialId: dta.account
    })

    if (existing == null) {
      await this.accountClient.createIntegration({
        kind: githubUserIntegrationKind,
        workspaceUuid: null,
        socialId: dta.account,
        data: {
          login: dta._id
        }
      })
    }

    const exists = await this.accountClient.getIntegrationSecret({
      key: dta._id,
      kind: githubUserIntegrationKind,
      socialId: dta.account,
      workspaceUuid: null
    })

    if (exists !== null) {
      await this.accountClient.updateIntegrationSecret({
        key: dta._id,
        kind: githubUserIntegrationKind,
        socialId: dta.account,
        secret: JSON.stringify(dta),
        workspaceUuid: null
      })
    } else {
      await this.accountClient.addIntegrationSecret({
        key: dta._id,
        kind: githubUserIntegrationKind,
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

    const secerts = await this.accountClient.listIntegrationsSecrets({ kind: githubUserIntegrationKind, key: login })
    for (const s of secerts) {
      await this.accountClient.deleteIntegrationSecret(s)
    }
  }
}
