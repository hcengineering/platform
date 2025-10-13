//
// Copyright © 2023 Hardcore Engineering Inc.
//
//
/* eslint-disable @typescript-eslint/no-unused-vars */
import { getClient as getAccountClient } from '@hcengineering/account-client'
import chunter from '@hcengineering/chunter'
import core, {
  BrandingMap,
  buildSocialIdString,
  Client,
  ClientConnectEvent,
  DocumentUpdate,
  isActiveMode,
  isDeletingMode,
  MeasureContext,
  PersonId,
  RateLimiter,
  SocialIdType,
  systemAccountUuid,
  TimeRateLimiter,
  TxOperations,
  versionToString,
  WorkspaceInfoWithStatus,
  WorkspaceUuid,
  type PersonUuid,
  type Ref
} from '@hcengineering/core'
import github, {
  GithubAuthentication,
  githubId,
  makeQuery,
  type GithubIntegration,
  githubIntegrationKind
} from '@hcengineering/github'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { generateToken } from '@hcengineering/server-token'
import tracker from '@hcengineering/tracker'
import { Installation, type InstallationCreatedEvent, type InstallationUnsuspendEvent } from '@octokit/webhooks-types'
import { App, Octokit } from 'octokit'

import { Analytics } from '@hcengineering/analytics'
import { SplitLogger } from '@hcengineering/analytics-service'
import contact, { type Employee, type SocialIdentityRef } from '@hcengineering/contact'
import { type StorageAdapter } from '@hcengineering/server-core'
import { join } from 'path'
import { createPlatformClient } from './client'
import config from './config'
import { registerLoaders } from './loaders'
import { createNotification } from './notifications'
import { errorToObj } from './sync/utils'
import { GithubIntegrationRecord, GithubUserRecord } from './types'
import { UserManager } from './users'
import { GithubWorker, syncUser } from './worker'

export interface InstallationRecord {
  installationName: string
  login: string
  loginNodeId: string

  repositories?: InstallationCreatedEvent['repositories'] | InstallationUnsuspendEvent['repositories']
  type: 'Bot' | 'User' | 'Organization'
  octokit: Octokit
  suspended: boolean
}

interface IntegrationDataValue {
  installationId: number | number[]
}

export class PlatformWorker {
  private readonly clients = new Map<WorkspaceUuid, GithubWorker>()

  storageAdapter!: StorageAdapter

  installations = new Map<number, InstallationRecord>()

  integrations: GithubIntegrationRecord[] = []

  periodicTimer: any
  periodicSyncPromise: Promise<void> | undefined

  canceled = false

  userManager: UserManager = new UserManager()

  rateLimits = new Map<string, TimeRateLimiter>()

  private constructor (
    readonly ctx: MeasureContext,
    readonly app: App,
    readonly brandingMap: BrandingMap,
    readonly periodicSyncInterval = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    registerLoaders()
  }

  getRateLimiter (endpoint: string): TimeRateLimiter {
    let limiter = this.rateLimits.get(endpoint)
    if (limiter === undefined) {
      limiter = new TimeRateLimiter(config.RateLimit)
      this.rateLimits.set(endpoint, limiter)
    }
    return limiter
  }

  public async initStorage (): Promise<void> {
    const storageConfig = storageConfigFromEnv()
    this.storageAdapter = buildStorageFromConfig(storageConfig)
  }

  async close (): Promise<void> {
    this.canceled = true
    clearInterval(this.periodicSyncInterval)
    await Promise.all(
      [...this.clients.values()].map(async (worker) => {
        await worker.close()
      })
    )
    this.clients.clear()
    await this.storageAdapter.close()
  }

  async init (ctx: MeasureContext): Promise<void> {
    const sysToken = generateToken(systemAccountUuid, undefined, { service: 'github' })
    const accountsClient = getAccountClient(config.AccountsURL, sysToken)

    const allIntegrations = await accountsClient.listIntegrations({ kind: githubIntegrationKind })

    this.integrations = []

    for (const i of allIntegrations) {
      if (i.workspaceUuid == null) {
        continue
      }
      const installationId = (i.data as IntegrationDataValue)?.installationId
      if (installationId !== undefined) {
        this.integrations.push({
          accountId: i.socialId,
          workspace: i.workspaceUuid,
          installationId: Array.isArray(installationId) ? installationId : [installationId]
        })
      } else {
        ctx.warn('Integration without installationId', {
          accountId: i.socialId,
          workspace: i.workspaceUuid
        })
        await accountsClient.deleteIntegration({
          kind: githubIntegrationKind,
          workspaceUuid: i.workspaceUuid,
          socialId: i.socialId
        })
      }
    }

    await this.queryInstallations(ctx)

    for (const integr of [...this.integrations]) {
      // We need to check and remove integrations without a real integration's
      const ids = integr.installationId

      const missing = ids.filter((id) => !this.installations.has(id))
      if (missing.length > 0) {
        const has = ids.filter((id) => this.installations.has(id))
        ctx.warn('Few Installation was deleted during service shutdown', {
          installationId: missing,
          workspace: integr.workspace
        })
        if (has.length > 0) {
          await accountsClient.updateIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: integr.workspace,
            socialId: integr.accountId,
            data: { installationId: has } satisfies IntegrationDataValue
          })
        } else {
          await accountsClient.deleteIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: integr.workspace,
            socialId: integr.accountId
          })
        }
      }
    }
    this.integrations = this.integrations.filter((it) => it.installationId.length > 0)

    void this.doSyncWorkspaces().catch((err) => {
      ctx.error('error during sync workspaces', { err })
      process.exit(1)
    })

    this.periodicTimer = setInterval(() => {
      if (this.periodicSyncPromise === undefined) {
        this.periodicSyncPromise = this.performPeriodicSync()
      }
    }, this.periodicSyncInterval)
  }

  async performPeriodicSync (): Promise<void> {
    // Sync authorized users information details.
    const workspaces = await this.getWorkspaces()
    for (const workspace of workspaces) {
      const worker = this.clients.get(workspace)
      if (worker !== undefined) {
        await this.ctx.with('syncUsers', {}, (ctx) => worker.syncUserData(ctx))
      }
    }
    this.periodicSyncPromise = undefined
  }

  triggerCheckWorkspaces = (): void => {}

  async doSyncWorkspaces (): Promise<void> {
    let oldErrors = ''
    let sameErrors = 1

    let lastTimeout: any

    while (!this.canceled) {
      let errors: string[] = []
      try {
        errors = await this.checkWorkspaces()
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('check workspace', err)
        errors.push(err.message)
      }
      await new Promise<void>((resolve) => {
        this.triggerCheckWorkspaces = () => {
          this.ctx.info('Workspaces check triggered')
          this.triggerCheckWorkspaces = () => {}
          clearTimeout(lastTimeout)
          resolve()
        }
        if (errors.length > 0) {
          const timeout = 15000 * sameErrors
          const ne = errors.join(',')
          if (oldErrors === ne) {
            if (sameErrors < 25) {
              sameErrors++
            }
          } else {
            oldErrors = ne
          }
          setTimeout(() => {
            this.triggerCheckWorkspaces()
          }, timeout)
        }
      })
    }
  }

  public async getUser (login: string): Promise<GithubUserRecord | undefined> {
    return await this.userManager.getAccount(login)
  }

  async mapInstallation (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    installationId: number,
    accountId: PersonId
  ): Promise<void> {
    const sysToken = generateToken(systemAccountUuid, undefined, { service: 'github' })
    const accountsClient = getAccountClient(config.AccountsURL, sysToken)

    const oldInstallation = this.integrations.filter((it) => it.installationId.includes(installationId))
    if (oldInstallation.length > 0) {
      ctx.info('update integrations', { workspace, installationId, accountId })
      // What to do with installation in different workspace?
      // Let's remove it and sync to new one.
      const oldWorkspaces = oldInstallation.filter((it) => it.workspace !== workspace)
      if (oldWorkspaces.length > 0) {
        const oldWorkspace = oldWorkspaces[0].workspace

        for (const oldInstallation of oldWorkspaces) {
          const has = oldInstallation.installationId.filter((it) => it !== installationId)
          if (has.length > 0) {
            oldInstallation.installationId = has
            await accountsClient.updateIntegration({
              kind: githubIntegrationKind,
              workspaceUuid: oldWorkspace,
              socialId: oldInstallation.accountId
            })
          } else {
            await accountsClient.deleteIntegration({
              kind: githubIntegrationKind,
              workspaceUuid: oldWorkspace,
              socialId: oldInstallation.accountId
            })
          }
        }

        // We need new integeration to be added to new workspace
        const existingRecord = this.integrations.find((it) => it.workspace === workspace && it.accountId === accountId)
        if (existingRecord !== undefined) {
          existingRecord.installationId.push(installationId)
          await accountsClient.updateIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: workspace,
            socialId: accountId,
            data: { installationId: existingRecord.installationId } satisfies IntegrationDataValue
          })
        } else {
          await accountsClient.createIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: workspace,
            socialId: accountId,
            data: { installationId } satisfies IntegrationDataValue
          })
          this.integrations.push({
            workspace,
            installationId: [installationId],
            accountId
          })
        }

        const oldWorker = this.clients.get(oldWorkspace) as GithubWorker
        if (oldWorker !== undefined) {
          await this.removeInstallationFromWorkspace(oldWorker.client, installationId)
          await oldWorker.reloadRepositories(ctx, installationId)
        } else {
          let client: Client | undefined
          try {
            ;({ client } = await createPlatformClient(ctx, oldWorkspace, 30000))
            await this.removeInstallationFromWorkspace(oldWorker, installationId)
          } catch (err: any) {
            ctx.error('failed to remove old installation from workspace', { workspace: oldWorkspace, installationId })
          } finally {
            await client?.close()
          }
        }
      }

      await this.updateInstallation(installationId)

      const worker = this.clients.get(workspace) as GithubWorker
      await worker?.reloadRepositories(ctx, installationId)
      worker?.triggerUpdate()

      this.triggerCheckWorkspaces()
      return
    }
    ctx.info('add integration', { workspace, installationId, accountId })

    await ctx.with(
      'add integration',
      {},
      async (ctx) => {
        const existing = this.integrations.find((it) => it.workspace === workspace && it.accountId === accountId)
        if (existing !== undefined) {
          existing.installationId.push(installationId)
          await accountsClient.updateIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: existing.workspace,
            socialId: existing.accountId,
            data: { installationId: existing.installationId } satisfies IntegrationDataValue
          })
        } else {
          const record: GithubIntegrationRecord = {
            workspace,
            installationId: [installationId],
            accountId
          }
          await accountsClient.createIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: record.workspace,
            socialId: record.accountId,
            data: { installationId: record.installationId }
          })
          this.integrations.push(record)
        }
      },
      { workspace, installationId, accountId }
    )
    // We need to query installations to be sure we have it, in case event is delayed or not received.
    await this.updateInstallation(installationId)

    const worker = this.clients.get(workspace) as GithubWorker
    await worker?.reloadRepositories(ctx, installationId)
    worker?.triggerUpdate()

    this.triggerCheckWorkspaces()
  }

  private async removeInstallationFromWorkspace (client: Client, installationId: number): Promise<void> {
    const wsIntegerations = await client.findAll(github.class.GithubIntegration, { installationId })

    const ops = new TxOperations(client, core.account.System)
    for (const intValue of wsIntegerations) {
      await ops.remove<GithubIntegration>(intValue)
    }
  }

  async removeInstallation (ctx: MeasureContext, workspace: WorkspaceUuid, installationId: number): Promise<void> {
    const installation = this.installations.get(installationId)
    if (installation !== undefined) {
      // Do not wait to github to process it
      void installation.octokit.rest.apps
        .deleteInstallation({
          installation_id: installationId
        })
        .catch((err) => {
          if (err.status !== 404) {
            // Already deleted.
            ctx.error('error from github api', { error: err })
          }
        })

      await this.handleInstallationEventDelete(ctx, installationId)
    } else {
      await this.removeInstallationNoClient(workspace, ctx, installationId)
    }
    this.triggerCheckWorkspaces()
  }

  private async removeInstallationNoClient (
    workspace: WorkspaceUuid,
    ctx: MeasureContext<any>,
    installationId: number
  ): Promise<void> {
    let client: Client | undefined
    try {
      const { client, endpoint } = await createPlatformClient(ctx, workspace, 30000)
      ctx.info('connected to github', { workspace, endpoint })

      const githubEnabled = (await client.findOne(core.class.PluginConfiguration, { pluginId: githubId }))?.enabled
      if (githubEnabled !== false) {
        const wsIntegerations = await client.findAll(github.class.GithubIntegration, { installationId })
        for (const intValue of wsIntegerations) {
          const ops = new TxOperations(client, core.account.System)
          await ops.remove<GithubIntegration>(intValue)
        }
      }
    } finally {
      await client?.close()
    }
  }

  async requestGithubAccessToken (
    ctx: MeasureContext,
    payload: {
      workspace: WorkspaceUuid
      code: string
      state: string
      accountId: PersonId // Primary social Id
    }
  ): Promise<void> {
    try {
      const uri =
        'https://github.com/login/oauth/access_token?' +
        makeQuery({
          client_id: config.ClientID,
          client_secret: config.ClientSecret,
          code: payload.code,
          state: payload.state
        })
      const result = await fetch(uri, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      })

      const resultJson = await result.json()
      if (resultJson.error !== undefined) {
        await this.updateAccountAuthRecord(ctx, payload, { error: null }, undefined, false)
      } else {
        const okit = new Octokit({
          auth: resultJson.access_token,
          client_id: config.ClientID,
          client_secret: config.ClientSecret
        })
        const user = await okit.rest.users.getAuthenticated()
        const nowTime = Date.now() / 1000
        const dta: GithubUserRecord = {
          account: payload.accountId,
          _id: user.data.login,
          token: resultJson.access_token,
          code: null,
          expiresIn: resultJson.expires_in != null ? nowTime + (resultJson.expires_in as number) : null,
          refreshToken: resultJson.refresh_token ?? null,
          refreshTokenExpiresIn:
            resultJson.refresh_token_expires_in !== undefined
              ? nowTime + (resultJson.refresh_token_expires_in as number)
              : null,
          scope: resultJson.scope,
          accounts: { [payload.workspace]: payload.accountId }
        }
        await this.userManager.updateUser(dta)
        const existingUser = await this.userManager.getAccount(user.data.login)
        if (existingUser == null) {
          await this.userManager.insertUser(dta)
        } else {
          dta.accounts = { ...existingUser.accounts, [payload.workspace]: payload.accountId } // Put primary socialId for now.
          await this.userManager.updateUser(dta)
        }

        // Update workspace client login info.
        await this.updateAccountAuthRecord(
          ctx,
          payload,
          {
            login: dta._id,
            error: null,
            avatar: user.data.avatar_url,
            name: user.data.name ?? '',
            url: user.data.url
          },
          dta,
          false
        )
      }
    } catch (err: any) {
      Analytics.handleError(err)
      await this.updateAccountAuthRecord(ctx, payload, { error: errorToObj(err) }, undefined, false)
    }
  }

  private async updateAccountAuthRecord (
    ctx: MeasureContext,
    payload: { workspace: WorkspaceUuid, accountId: PersonId },
    update: DocumentUpdate<GithubAuthentication>,
    dta: GithubUserRecord | undefined,
    revoke: boolean
  ): Promise<void> {
    try {
      let platformClient: Client | undefined
      let shouldClose = false
      try {
        platformClient = this.clients.get(payload.workspace)?.client
        if (platformClient === undefined) {
          shouldClose = true
          ;({ client: platformClient } = await createPlatformClient(ctx, payload.workspace, 30000))
        }
        const client = new TxOperations(platformClient, payload.accountId)

        let personAuths = await client.findAll(github.class.GithubAuthentication, {
          attachedTo: payload.accountId
        })
        if (personAuths.length > 1) {
          for (const auth of personAuths.slice(1)) {
            await client.remove(auth)
          }
          personAuths.length = 1
        }

        if (revoke) {
          for (const personAuth of personAuths) {
            await client.remove(personAuth, Date.now(), payload.accountId)
          }

          // TODO: Do we need to remove social ids?
        } else {
          if (personAuths.length > 0) {
            await client.update<GithubAuthentication>(personAuths[0], update, false, Date.now(), payload.accountId)
          } else if (dta !== undefined) {
            const authId = await client.createDoc<GithubAuthentication>(
              github.class.GithubAuthentication,
              core.space.Workspace,
              {
                error: null,
                authRequestTime: Date.now(),
                createdAt: new Date(),
                followers: 0,
                following: 0,
                nodeId: '',
                updatedAt: new Date(),
                url: '',
                repositories: 0,
                organizations: { totalCount: 0, nodes: [] },
                closedIssues: 0,
                openIssues: 0,
                mergedPRs: 0,
                openPRs: 0,
                closedPRs: 0,
                repositoryDiscussions: 0,
                starredRepositories: 0,
                ...update,
                attachedTo: payload.accountId,
                login: dta._id
              },
              undefined,
              undefined,
              payload.accountId
            )

            personAuths = await client.findAll(github.class.GithubAuthentication, {
              _id: authId
            })
          }
        }

        const account = await client.findOne(contact.class.SocialIdentity, {
          _id: payload.accountId as SocialIdentityRef
        })
        const person =
          account !== undefined
            ? await client.findOne(contact.mixin.Employee, { _id: account?.attachedTo as Ref<Employee> })
            : undefined
        if (person !== undefined) {
          if (!revoke) {
            const personSpace = await client.findOne(contact.class.PersonSpace, { person: person._id })
            if (personSpace !== undefined && person.personUuid !== undefined) {
              if (update.login != null) {
                await createNotification(client, person, {
                  user: person.personUuid,
                  space: personSpace._id,
                  message: github.string.AuthenticatedWithGithub,
                  props: {
                    login: update.login
                  }
                })
              }
            }

            if (dta?._id !== undefined) {
              const sysToken = generateToken(systemAccountUuid, payload.workspace, {
                service: 'github'
              })
              const userToken = generateToken(person.personUuid as PersonUuid, payload.workspace, {
                service: 'github'
              })
              const sysAccountClient = getAccountClient(config.AccountsURL, sysToken)
              const userAccountClient = getAccountClient(config.AccountsURL, userToken)

              // We only want not-deleted social ids here
              const ids = await userAccountClient.getSocialIds()

              let githubSocialId: PersonId | undefined = ids.find(
                (it) => it.type === SocialIdType.GITHUB && it.value === dta?._id
              )?._id
              // We need to assign socialId to person in global account if missing and get it to match if exists.

              if (githubSocialId === undefined) {
                // We need to create a new social id for this account.
                this.ctx.info('Create social id', {
                  account: dta?._id,
                  workspace: payload.workspace,
                  personUuid: person.personUuid,
                  ids
                })
                try {
                  const pp = await sysAccountClient.findPersonBySocialKey(
                    buildSocialIdString({ type: SocialIdType.GITHUB, value: dta?._id })
                  )
                  if (pp !== person.personUuid) {
                    // TODO: We need to remove old social id association
                  }

                  githubSocialId = await sysAccountClient.addSocialIdToPerson(
                    person.personUuid as PersonUuid,
                    SocialIdType.GITHUB,
                    dta?._id ?? '',
                    true
                  )
                } catch (err: any) {
                  this.ctx.error('Failed to create social id', {
                    account: dta?._id,
                    workspace: payload.workspace,
                    error: err
                  })
                }
              }

              const socialIdentity = await client.findOne(contact.class.SocialIdentity, {
                _id: githubSocialId as SocialIdentityRef
              })
              if (githubSocialId !== undefined && socialIdentity === undefined) {
                // We need to create a new social id for this account.

                // We need to create social id github account
                try {
                  await client.addCollection(
                    contact.class.SocialIdentity,
                    contact.space.Contacts,
                    person._id,
                    contact.class.Person,
                    'socialIds',
                    {
                      type: SocialIdType.GITHUB,
                      value: dta._id.toLowerCase(),
                      key: buildSocialIdString({
                        type: SocialIdType.GITHUB,
                        value: dta._id.toLowerCase()
                      }),
                      verifiedOn: Date.now()
                    },
                    githubSocialId as SocialIdentityRef
                  )
                } catch (err: any) {
                  this.ctx.error('Failed to create social id', {
                    account: dta?._id,
                    workspace: payload.workspace,
                    error: err,
                    githubSocialId
                  })
                }
              }
            }
          } else {
            const personSpace = await client.findOne(contact.class.PersonSpace, { person: person._id })
            if (personSpace !== undefined && person.personUuid !== undefined) {
              await createNotification(client, person, {
                user: person.personUuid,
                space: personSpace._id,
                message: github.string.AuthenticationRevokedGithub,
                props: {
                  login: update.login
                }
              })
            }
          }
        }

        if (dta !== undefined && personAuths.length === 1) {
          try {
            await syncUser(this.ctx, dta, personAuths[0], client, payload.accountId)
          } catch (err: any) {
            if (err.response?.data?.message === 'Bad credentials') {
              await this.revokeUserAuth(ctx, dta)
            } else {
              this.ctx.error(`Failed to sync user ${dta._id}`, { error: errorToObj(err) })
            }
          }
        }
      } catch (err: any) {
        this.ctx.error('error workspace update', { err })
        Analytics.handleError(err)
      } finally {
        if (shouldClose) {
          await platformClient?.close()
        }
      }
    } catch (err: any) {
      Analytics.handleError(err)
    }
  }

  async checkRefreshToken (ctx: MeasureContext, auth: GithubUserRecord, force: boolean = false): Promise<boolean> {
    if (auth.refreshToken != null && auth.expiresIn != null && auth.expiresIn < Date.now() / 1000) {
      const uri =
        'https://github.com/login/oauth/access_token?' +
        makeQuery({
          client_id: config.ClientID,
          client_secret: config.ClientSecret,
          grant_type: 'refresh_token',
          refresh_token: auth.refreshToken
        })

      const result = await fetch(uri, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      })
      const resultJson = await result.json()

      if (resultJson.error !== undefined) {
        // We need to clear github integration info.
        await this.revokeUserAuth(ctx, auth)
        return false
      } else {
        // Update okit
        const nowTime = Date.now() / 1000
        const dta: GithubUserRecord = {
          ...auth,
          token: resultJson.access_token,
          code: null,
          expiresIn: nowTime + (resultJson.expires_in as number),
          refreshToken: resultJson.refresh_token,
          refreshTokenExpiresIn: nowTime + (resultJson.refresh_token_expires_in as number),
          scope: resultJson.scope
        }
        auth.token = resultJson.access_token
        auth.code = null
        auth.expiresIn = dta.expiresIn
        auth.refreshToken = dta.refreshToken
        auth.refreshTokenExpiresIn = dta.refreshTokenExpiresIn
        auth.scope = dta.scope

        await this.userManager.updateUser(dta)
        return true
      }
    }
    return true
  }

  async getAccount (login: string): Promise<GithubUserRecord | undefined> {
    return await this.userManager.getAccount(login)
  }

  async getAccountByRef (workspace: WorkspaceUuid, ref: PersonId): Promise<GithubUserRecord | undefined> {
    return await this.userManager.getAccountByRef(this.ctx, workspace, ref)
  }

  private async updateInstallation (installationId: number): Promise<void> {
    const install = await this.app.octokit.rest.apps.getInstallation({ installation_id: installationId })
    if (install !== null) {
      const tinst = install.data as Installation
      const val: InstallationRecord = {
        octokit: await this.app.getInstallationOctokit(installationId),
        login: tinst.account.login,
        loginNodeId: tinst.account.node_id,
        type: tinst.account?.type ?? 'User',
        installationName: `${tinst.account?.html_url ?? ''}`,
        suspended: install.data.suspended_at != null
      }
      this.updateInstallationRecord(installationId, val)
    }
  }

  private updateInstallationRecord (installationId: number, val: InstallationRecord): void {
    const current = this.installations.get(installationId)
    if (current !== undefined) {
      if (val.octokit !== undefined) {
        current.octokit = val.octokit
      }
      current.login = val.login
      current.loginNodeId = val.loginNodeId
      current.type = val.type
      current.installationName = val.installationName
      current.suspended = val.suspended
      if (val.repositories !== undefined) {
        current.repositories = val.repositories
      }
    } else {
      this.installations.set(installationId, val)
    }
  }

  private async queryInstallations (ctx: MeasureContext): Promise<void> {
    for await (const install of this.app.eachInstallation.iterator()) {
      const tinst = install.installation as Installation
      const val: InstallationRecord = {
        octokit: install.octokit,
        login: tinst.account.login,
        loginNodeId: tinst.account.node_id,
        type: tinst.account?.type ?? 'User',
        installationName: `${tinst.account?.html_url ?? ''}`,
        suspended: install.installation.suspended_at != null
      }
      this.updateInstallationRecord(install.installation.id, val)
      ctx.info('Found installation', {
        installationId: install.installation.id,
        url: install.installation.account?.html_url ?? ''
      })
    }
  }

  async handleInstallationEvent (
    ctx: MeasureContext,
    install: Installation,
    repositories: InstallationCreatedEvent['repositories'] | InstallationUnsuspendEvent['repositories'],
    enabled: boolean
  ): Promise<void> {
    ctx.info('handle integration add', { installId: install.id, name: install.html_url })
    const okit = await this.app.getInstallationOctokit(install.id)
    const iName = `${install.account.html_url ?? ''}`

    this.updateInstallationRecord(install.id, {
      octokit: okit,
      login: install.account.login,
      type: install.account?.type ?? 'User',
      loginNodeId: install.account.node_id,
      installationName: iName,
      repositories,
      suspended: !enabled
    })

    const worker = this.getWorker(install.id)
    if (worker !== undefined) {
      const integeration = worker.integrations.get(install.id)
      if (integeration !== undefined) {
        integeration.enabled = enabled
      }

      await worker.syncUserData(this.ctx)
      await worker.reloadRepositories(ctx, install.id)

      worker.triggerUpdate()
      worker.triggerSync()
    }

    // Check if no workspace was available
    this.triggerCheckWorkspaces()
  }

  async handleInstallationEventDelete (ctx: MeasureContext, installId: number): Promise<void> {
    const existing = this.installations.get(installId)
    this.installations.delete(installId)
    ctx.info('handle integration delete', { installId, name: existing?.installationName })

    const interg = this.integrations.filter((it) => it.installationId.includes(installId))

    // We already have, worker we need to update it.
    const worker = this.getWorker(installId) ?? (interg.length > 0 ? this.clients.get(interg[0].workspace) : undefined)
    if (worker !== undefined) {
      const integeration = worker.integrations.get(installId)
      if (integeration !== undefined) {
        integeration.enabled = false
        integeration.synchronized = new Set()

        await this.removeInstallationFromWorkspace(worker._client, installId)

        await worker._client.remove(integeration.integration)
      }
      worker.integrations.delete(installId)
      worker.triggerUpdate()
    } else {
      this.ctx.info('No worker for removed installation', { installId, name: existing?.installationName })
      // No worker
      const workspace = interg.length > 0 ? interg[0].workspace : undefined
      if (workspace !== undefined) {
        await this.removeInstallationNoClient(workspace, this.ctx, installId)
      }
    }
    if (interg.length > 0) {
      const sysToken = generateToken(systemAccountUuid, undefined, { service: 'github' })
      const sysAccountClient = getAccountClient(config.AccountsURL, sysToken)

      for (const intgr of interg) {
        const has = intgr.installationId.filter((it) => it !== installId)
        if (has.length > 0) {
          await sysAccountClient.updateIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: intgr.workspace,
            socialId: intgr.accountId,
            data: { installationId: has } satisfies IntegrationDataValue
          })
        } else {
          intgr.installationId = []
          await sysAccountClient.deleteIntegration({
            kind: githubIntegrationKind,
            workspaceUuid: intgr.workspace,
            socialId: intgr.accountId
          })
        }
      }
    }
    this.integrations = this.integrations.filter((it) => it.installationId.length > 0)
    this.triggerCheckWorkspaces()
  }

  async getWorkspaces (): Promise<WorkspaceUuid[]> {
    // Since few integeration could map into one workspace, we need to deduplicate
    return Array.from(new Set(this.integrations.map((it) => it.workspace)))
  }

  checkedWorkspaces = new Set<string>()

  checkWorkspaceIsActive (workspace: WorkspaceUuid, workspaceInfo: WorkspaceInfoWithStatus): boolean {
    if (workspaceInfo?.uuid === undefined) {
      this.ctx.error('No workspace exists for workspaceId', { workspace })
      return false
    }
    if (workspaceInfo?.isDisabled === true || isDeletingMode(workspaceInfo?.mode)) {
      this.ctx.warn('Workspace is disabled', { workspace })
      return false
    }
    if (!isActiveMode(workspaceInfo?.mode)) {
      this.ctx.warn('Workspace is in maitenance, skipping for now.', { workspace, mode: workspaceInfo?.mode })
      return true
    }

    const lastVisit = (Date.now() - (workspaceInfo.lastVisit ?? 0)) / (3600 * 24 * 1000) // In days

    if (config.WorkspaceInactivityInterval > 0 && lastVisit > config.WorkspaceInactivityInterval) {
      if (!this.checkedWorkspaces.has(workspace)) {
        this.checkedWorkspaces.add(workspace)
        this.ctx.warn('Workspace is inactive for too long, skipping for now.', { workspace })
      }
      return true
    }
    return false
  }

  checkReconnect (workspace: WorkspaceUuid, event: ClientConnectEvent, worker: GithubWorker): void {
    if (event === ClientConnectEvent.Refresh || event === ClientConnectEvent.Upgraded) {
      void this.clients
        .get(workspace)
        ?.refreshClient(event === ClientConnectEvent.Upgraded)
        ?.catch((err) => {
          worker.ctx.error('Failed to refresh', { error: err })
        })
    }

    // We need to check if workspace is inactive
    const token = generateToken(systemAccountUuid, workspace, { service: 'github', mode: 'github' })
    getAccountClient(config.AccountsURL, token)
      .getWorkspaceInfo()
      .then((wsInfo) => {
        const res = this.checkWorkspaceIsActive(workspace, wsInfo)
        if (!res) {
          this.ctx.warn('Workspace is inactive, removing from clients list.', { workspace })
          this.clients.delete(workspace)
          void worker?.close().catch((err) => {
            this.ctx.error('Failed to close workspace', { workspace, error: err })
          })
        }
      })
      .catch((err) => {
        this.ctx.error('Failed to check workspace is active', { workspace, error: err })
      })
  }

  private async checkWorkspaces (): Promise<string[]> {
    this.ctx.info('************************* Check workspaces ************************* ', {
      workspaces: this.clients.size
    })
    const workspaces = await this.getWorkspaces()
    const toDelete = new Set<WorkspaceUuid>(this.clients.keys())

    const rateLimiter = new RateLimiter(5)
    const rechecks: string[] = []
    let idx = 0
    const connecting = new Map<
    string,
    {
      time: number
      version: string
    }
    >()
    const st = Date.now()
    const connectingInfo = setInterval(() => {
      this.ctx.info('****** connecting to workspaces ******', {
        connecting: connecting.size,
        time: Date.now() - st,
        workspaces: workspaces.length,
        connected: this.clients.size,
        queue: rateLimiter.processingQueue.size
      })
      for (const [c, d] of connecting.entries()) {
        this.ctx.info('connecting to workspace', { workspace: c, time: Date.now() - d.time, version: d.version })
      }
    }, 5000)

    try {
      const token = generateToken(systemAccountUuid, undefined, { service: 'github', mode: 'github' })
      const infos = new Map(
        Array.from(await getAccountClient(config.AccountsURL, token).getWorkspacesInfo(workspaces)).map((it) => [
          it.uuid,
          it
        ])
      )
      for (const workspace of workspaces) {
        const widx = ++idx
        if (this.clients.has(workspace)) {
          toDelete.delete(workspace)
          continue
        }
        const returnedInfo = infos.get(workspace)
        if (returnedInfo === undefined) {
          rechecks.push(workspace)
          continue
        }
        const needRecheck = this.checkWorkspaceIsActive(workspace, returnedInfo)
        if (needRecheck) {
          rechecks.push(workspace)
          continue
        }
        await rateLimiter.add(async () => {
          try {
            const branding = Object.values(this.brandingMap).find((b) => b.key === returnedInfo?.branding) ?? null
            const workerCtx = this.ctx.newChild('worker', { workspace: returnedInfo.uuid }, { span: false })

            connecting.set(returnedInfo.uuid, {
              time: Date.now(),
              version: versionToString({
                major: returnedInfo.versionMajor,
                minor: returnedInfo.versionMinor,
                patch: returnedInfo.versionPatch
              })
            })
            workerCtx.info('************************* Register worker ************************* ', {
              workspaceId: returnedInfo.uuid,
              workspaceUrl: returnedInfo.url,
              versionMajor: returnedInfo.versionMajor,
              versionMinor: returnedInfo.versionMinor,
              versionPatch: returnedInfo.versionPatch,
              mode: returnedInfo.mode,
              index: widx,
              total: workspaces.length
            })

            const worker = await GithubWorker.create(
              this,
              workerCtx,
              this.installations,
              {
                dataId: returnedInfo.dataId,
                url: returnedInfo.url,
                uuid: returnedInfo.uuid
              },
              branding,
              this.app,
              this.storageAdapter
            )
            if (worker !== undefined) {
              workerCtx.info('************************* Register worker Done ************************* ', {
                workspaceId: returnedInfo.uuid,
                workspaceUrl: returnedInfo.url,
                index: widx,
                total: workspaces.length
              })
              this.clients.set(workspace, worker)
            } else {
              // No if no integration, we will try connect one more time in a time period
              workerCtx.info(
                '************************* Failed Register worker, timeout or integrations removed *************************',
                {
                  workspaceId: returnedInfo.uuid,
                  workspaceUrl: returnedInfo.url,
                  versionMajor: returnedInfo.versionMajor,
                  versionMinor: returnedInfo.versionMinor,
                  versionPatch: returnedInfo.versionPatch,
                  lastVisit: (Date.now() - (returnedInfo.lastVisit ?? 0)) / (24 * 60 * 60 * 1000),
                  index: widx,
                  total: workspaces.length
                }
              )
              rechecks.push(workspace)
            }
          } catch (e: any) {
            Analytics.handleError(e)
            this.ctx.info("Couldn't create WS worker", { workspace, error: e })
            rechecks.push(workspace)
          } finally {
            connecting.delete(returnedInfo.uuid)
          }
        })
      }
      this.ctx.info('************************* Waiting To complete Workspace processing ************************* ', {
        workspaces: this.clients.size,
        rateLimiter: rateLimiter.processingQueue.size
      })
      try {
        await rateLimiter.waitProcessing()
      } catch (e: any) {
        Analytics.handleError(e)
      }
    } finally {
      clearInterval(connectingInfo)
    }

    this.ctx.info('************************* Check close deleted ************************* ', {
      workspaces: this.clients.size,
      deleted: toDelete.size
    })
    // Close deleted workspaces
    for (const deleted of Array.from(toDelete.keys())) {
      const ws = this.clients.get(deleted)
      if (ws !== undefined) {
        try {
          this.ctx.info('workspace removed from tracking list', { workspace: deleted })
          this.clients.delete(deleted)
          void ws.close().catch((err) => {
            this.ctx.error('Error', { error: err })
          })
        } catch (err: any) {
          Analytics.handleError(err)
        }
      }
    }
    this.ctx.info('************************* Check workspaces done ************************* ', {
      workspaces: this.clients.size
    })
    return rechecks
  }

  getWorkers (): GithubWorker[] {
    return Array.from(this.clients.values())
  }

  static async create (ctx: MeasureContext, app: App, brandingMap: BrandingMap): Promise<PlatformWorker> {
    const worker = new PlatformWorker(ctx, app, brandingMap)
    await worker.initStorage()
    await worker.init(ctx)
    worker.initWebhooks()
    return worker
  }

  initWebhooks (): void {
    const webhook = this.ctx.newChild(
      'webhook',
      {},
      {
        logger: new SplitLogger('webhook', { root: join(process.cwd(), 'logs'), pretty: true, enableConsole: false }),
        span: false
      }
    )
    webhook.info('Register webhook')

    this.app.webhooks.onAny(async (event) => {
      const shortData: Record<string, string> = { id: event.id, name: event.name }
      if ('action' in event.payload) {
        shortData.action = event.payload.action
      }
      this.ctx.info('webhook event', shortData)
      webhook.info('event', { ...shortData, payload: event.payload })
    })

    this.app.webhooks.on('github_app_authorization', async (event) => {
      if (event.payload.action === 'revoked') {
        const sender = event.payload.sender

        const record = await this.getAccount(sender.login)
        if (record !== undefined) {
          await this.revokeUserAuth(webhook, record)
          await this.userManager.removeUser(sender.login)
        }
      }
    })

    this.app.webhooks.onError(async (event) => {
      this.ctx.error('webhook event', { message: event.message, name: event.name, cause: event.cause })
      webhook.error('event', { ...event })
    })

    function catchEventError (
      promise: Promise<void>,
      action: string,
      name: string,
      id: string,
      repository: string
    ): void {
      void promise.catch((err) => {
        webhook.error('error during handleEvent', { err, event: action, repository, name, id })
        Analytics.handleError(err)
      })
    }

    this.app.webhooks.on('pull_request', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, github.class.GithubPullRequest, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.name
        )
      }
    })

    this.app.webhooks.on('issues', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, tracker.class.Issue, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.name
        )
      }
    })
    this.app.webhooks.on('issue_comment', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, chunter.class.ChatMessage, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.name
        )
      }
    })

    this.app.webhooks.on('repository', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, github.mixin.GithubProject, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.name
        )
      }
    })

    this.app.webhooks.on('projects_v2_item', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        if (payload.projects_v2_item.content_type === 'Issue') {
          catchEventError(
            this.ctx.with(name, {}, (ctx) =>
              repoWorker.handleEvent(ctx, tracker.class.Issue, payload.installation?.id, payload)
            ),
            payload.action,
            name,
            id,
            payload.projects_v2_item.node_id
          )
        } else if (payload.projects_v2_item.content_type === 'PullRequest') {
          catchEventError(
            this.ctx.with(name, {}, (ctx) =>
              repoWorker.handleEvent(ctx, github.class.GithubPullRequest, payload.installation?.id, payload)
            ),
            payload.action,
            name,
            id,
            payload.projects_v2_item.node_id
          )
        }
      }
    })

    this.app.webhooks.on('installation', async ({ payload, name, id }) => {
      switch (payload.action) {
        case 'created':
        case 'unsuspend': {
          catchEventError(
            this.ctx.with(name, {}, (ctx) =>
              this.handleInstallationEvent(ctx, payload.installation, payload.repositories, true)
            ),
            payload.action,
            name,
            id,
            payload.installation.html_url
          )
          break
        }
        case 'suspend': {
          catchEventError(
            this.ctx.with(name, {}, (ctx) =>
              this.handleInstallationEvent(ctx, payload.installation, payload.repositories, false)
            ),
            payload.action,
            name,
            id,
            payload.installation.html_url
          )
          break
        }
        case 'deleted': {
          catchEventError(
            this.ctx.with(name, {}, (ctx) => this.handleInstallationEventDelete(ctx, payload.installation.id)),
            payload.action,
            name,
            id,
            payload.installation.html_url
          )
          break
        }
      }
    })
    this.app.webhooks.on('installation_repositories', async ({ payload, name, id }) => {
      const worker = this.getWorker(payload.installation.id)
      if (worker === undefined) {
        this.triggerCheckWorkspaces()
        return
      }
      catchEventError(
        this.ctx.with(name, {}, (ctx) => worker.reloadRepositories(ctx, payload.installation.id)),
        payload.action,
        name,
        id,
        payload.installation.html_url
      )
      const doSyncUsers = async (worker: GithubWorker): Promise<void> => {
        await worker.syncUserData(this.ctx)
      }
      catchEventError(doSyncUsers(worker), payload.action, name, id, payload.installation.html_url)
    })

    this.app.webhooks.on('pull_request_review', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, github.class.GithubReview, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.html_url
        )
      }
    })

    this.app.webhooks.on('pull_request_review_comment', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, github.class.GithubReviewComment, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.html_url
        )
      }
    })
    this.app.webhooks.on('pull_request_review_thread', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          this.ctx.with(name, {}, (ctx) =>
            repoWorker.handleEvent(ctx, github.class.GithubReviewThread, payload.installation?.id, payload)
          ),
          payload.action,
          name,
          id,
          payload.repository.html_url
        )
      }
    })
  }

  public async revokeUserAuth (ctx: MeasureContext, record: GithubUserRecord): Promise<void> {
    for (const [ws, acc] of Object.entries(record.accounts)) {
      await this.updateAccountAuthRecord(
        ctx,
        { workspace: ws as WorkspaceUuid, accountId: acc },
        { login: record._id },
        undefined,
        true
      )
    }
  }

  getWorker (installationId?: number): GithubWorker | undefined {
    if (installationId === undefined) {
      return
    }
    for (const w of this.clients.values()) {
      for (const i of w.integrations.values()) {
        if (i.installationId === installationId) {
          return w
        }
      }
      for (const i of w.integrationsRaw.values()) {
        if (i.installationId === installationId) {
          return w
        }
      }
    }
  }
}
