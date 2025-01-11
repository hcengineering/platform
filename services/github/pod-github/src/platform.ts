//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import chunter from '@hcengineering/chunter'
import core, {
  Account,
  BrandingMap,
  Client,
  ClientConnectEvent,
  DocumentUpdate,
  isActiveMode,
  MeasureContext,
  RateLimiter,
  Ref,
  systemAccountEmail,
  TimeRateLimiter,
  TxOperations
} from '@hcengineering/core'
import github, { GithubAuthentication, makeQuery, type GithubIntegration } from '@hcengineering/github'
import { getMongoClient, MongoClientReference } from '@hcengineering/mongo'
import { setMetadata } from '@hcengineering/platform'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { generateToken } from '@hcengineering/server-token'
import tracker from '@hcengineering/tracker'
import { Installation, type InstallationCreatedEvent, type InstallationUnsuspendEvent } from '@octokit/webhooks-types'
import { Collection } from 'mongodb'
import { App, Octokit } from 'octokit'

import { ClientWorkspaceInfo } from '@hcengineering/account'
import { Analytics } from '@hcengineering/analytics'
import { SplitLogger } from '@hcengineering/analytics-service'
import contact, { Person, PersonAccount } from '@hcengineering/contact'
import { type StorageAdapter } from '@hcengineering/server-core'
import { join } from 'path'
import { getWorkspaceInfo } from './account'
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
}

export class PlatformWorker {
  private readonly clients: Map<string, GithubWorker> = new Map<string, GithubWorker>()

  storageAdapter!: StorageAdapter

  installations = new Map<number, InstallationRecord>()

  integrations: GithubIntegrationRecord[] = []

  mongoRef!: MongoClientReference

  integrationCollection!: Collection<GithubIntegrationRecord>

  periodicTimer: any
  periodicSyncPromise: Promise<void> | undefined

  canceled = false

  userManager!: UserManager

  rateLimits = new Map<string, TimeRateLimiter>()

  private constructor (
    readonly ctx: MeasureContext,
    readonly app: App,
    readonly brandingMap: BrandingMap,
    readonly periodicSyncInterval = 10 * 60 * 1000 // 10 minutes
  ) {
    setMetadata(serverToken.metadata.Secret, config.ServerSecret)
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
    this.mongoRef = getMongoClient(config.MongoURL)
    const mongoClient = await this.mongoRef.getClient()

    const db = mongoClient.db(config.ConfigurationDB)
    this.integrationCollection = db.collection<GithubIntegrationRecord>('installations')

    this.userManager = new UserManager(db.collection<GithubUserRecord>('users'))

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
    this.mongoRef.close()
  }

  async init (ctx: MeasureContext): Promise<void> {
    this.integrations = await this.integrationCollection.find({}).toArray()
    await this.queryInstallations(ctx)

    for (const integr of [...this.integrations]) {
      // We need to check and remove integrations without a real integration's
      if (!this.installations.has(integr.installationId)) {
        ctx.warn('Installation was deleted during service shutdown', {
          installationId: integr.installationId,
          workspace: integr.workspace
        })
        await this.integrationCollection.deleteOne({ installationId: integr.installationId })
        this.integrations = this.integrations.filter((it) => it.installationId !== integr.installationId)
      }
    }

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
    const workspaces = await this.findUsersWorkspaces()
    for (const [workspace, users] of workspaces) {
      const worker = this.clients.get(workspace)
      if (worker !== undefined) {
        await this.ctx.with('syncUsers', {}, (ctx) => worker.syncUserData(ctx, users))
      }
    }
    this.periodicSyncPromise = undefined
  }

  triggerCheckWorkspaces = (): void => {}

  async doSyncWorkspaces (): Promise<void> {
    while (!this.canceled) {
      let errors = false
      try {
        errors = await this.checkWorkspaces()
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('check workspace', err)
        errors = true
      }
      await new Promise<void>((resolve) => {
        this.triggerCheckWorkspaces = () => {
          this.ctx.info('Workspaces check triggered')
          this.triggerCheckWorkspaces = () => {}
          resolve()
        }
        if (errors) {
          setTimeout(() => {
            this.triggerCheckWorkspaces()
          }, 5000)
        }
      })
    }
  }

  private async findUsersWorkspaces (): Promise<Map<string, GithubUserRecord[]>> {
    const i = this.userManager.getAllUsers()
    const workspaces = new Map<string, GithubUserRecord[]>()
    while (await i.hasNext()) {
      const userInfo = await i.next()
      if (userInfo !== null) {
        for (const ws of Object.keys(userInfo.accounts ?? {})) {
          if (this.integrations.find((it) => it.workspace === ws) === undefined) {
            // No workspace integration found, let's check workspace.
            workspaces.set(ws, [...(workspaces.get(ws) ?? []), userInfo])
          }
        }
      }
    }
    await i.close()
    return workspaces
  }

  public async getUsers (workspace: string): Promise<GithubUserRecord[]> {
    return await this.userManager.getUsers(workspace)
  }

  public async getUser (login: string): Promise<GithubUserRecord | undefined> {
    return await this.userManager.getAccount(login)
  }

  async mapInstallation (
    ctx: MeasureContext,
    workspace: string,
    installationId: number,
    accountId: Ref<Account>
  ): Promise<void> {
    const oldInstallation = this.integrations.find((it) => it.installationId === installationId)
    if (oldInstallation != null) {
      ctx.info('update integration', { workspace, installationId, accountId })
      // What to do with installation in different workspace?
      // Let's remove it and sync to new one.
      if (oldInstallation.workspace !== workspace) {
        //
        const oldWorkspace = oldInstallation.workspace

        await this.integrationCollection.updateOne(
          { installationId: oldInstallation.installationId },
          { $set: { workspace } }
        )
        oldInstallation.workspace = workspace

        const oldWorker = this.clients.get(oldWorkspace) as GithubWorker
        if (oldWorker !== undefined) {
          await this.removeInstallationFromWorkspace(oldWorker.client, installationId)
          await oldWorker.reloadRepositories(installationId)
        } else {
          let client: Client | undefined
          try {
            ;({ client } = await createPlatformClient(oldWorkspace, 30000))
            await this.removeInstallationFromWorkspace(oldWorker, installationId)
            await client.close()
          } catch (err: any) {
            ctx.error('failed to remove old installation from workspace', { workspace: oldWorkspace, installationId })
          }
        }
      }

      await this.updateInstallation(installationId)

      const worker = this.clients.get(workspace) as GithubWorker
      await worker?.reloadRepositories(installationId)
      worker?.triggerUpdate()

      this.triggerCheckWorkspaces()
      return
    }
    const record: GithubIntegrationRecord = {
      workspace,
      installationId,
      accountId
    }
    ctx.info('add integration', { workspace, installationId, accountId })

    await ctx.with('add integration', { workspace, installationId, accountId }, async (ctx) => {
      await this.integrationCollection.insertOne(record)
      this.integrations.push(record)
    })
    // We need to query installations to be sure we have it, in case event is delayed or not received.
    await this.updateInstallation(installationId)

    const worker = this.clients.get(workspace) as GithubWorker
    await worker?.reloadRepositories(installationId)
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

  async removeInstallation (ctx: MeasureContext, workspace: string, installationId: number): Promise<void> {
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

      await this.handleInstallationEventDelete(installationId)
    }
    this.triggerCheckWorkspaces()
  }

  async requestGithubAccessToken (payload: {
    workspace: string
    code: string
    state: string
    accountId: Ref<Account>
  }): Promise<void> {
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
        await this.updateAccountAuthRecord(payload, { error: null }, undefined, false)
      } else {
        const okit = new Octokit({
          auth: resultJson.access_token,
          client_id: config.ClientID,
          client_secret: config.ClientSecret
        })
        const user = await okit.rest.users.getAuthenticated()
        const nowTime = Date.now() / 1000
        const dta: GithubUserRecord = {
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
          dta.accounts = { ...existingUser.accounts, [payload.workspace]: payload.accountId }
          await this.userManager.updateUser(dta)
        }

        // Update workspace client login info.
        await this.updateAccountAuthRecord(
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
      await this.updateAccountAuthRecord(payload, { error: errorToObj(err) }, undefined, false)
    }
  }

  private async updateAccountAuthRecord (
    payload: { workspace: string, accountId: Ref<Account> },
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
          ;({ client: platformClient } = await createPlatformClient(payload.workspace, 30000))
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

        // We need to re-bind previously created github:login account to a proper person.
        const account = client.getModel().getObject(payload.accountId) as PersonAccount
        const person = (await client.findOne(contact.class.Person, { _id: account.person })) as Person
        if (person !== undefined) {
          if (!revoke) {
            const personSpace = await client.findOne(contact.class.PersonSpace, { person: person._id })
            if (personSpace !== undefined) {
              await createNotification(client, person, {
                user: account._id,
                space: personSpace._id,
                message: github.string.AuthenticatedWithGithub,
                props: {
                  login: update.login
                }
              })
            }

            const githubAccount = client.getModel().getAccountByEmail('github:' + update.login) as PersonAccount
            if (githubAccount !== undefined && githubAccount.person !== account.person) {
              const dummyPerson = githubAccount.person
              // To add activity entry to dummy person.
              await client.update(githubAccount, { person: account.person }, false, Date.now(), payload.accountId)

              const dPerson = (await client.findOne(contact.class.Person, { _id: dummyPerson })) as Person
              if (person !== undefined && dPerson !== undefined) {
                const personSpace = await client.findOne(contact.class.PersonSpace, { person: person._id })
                if (personSpace !== undefined) {
                  await createNotification(client, dPerson, {
                    user: githubAccount._id,
                    space: personSpace._id,
                    message: github.string.AuthenticatedWithGithubEmployee,
                    props: {
                      login: update.login
                    }
                  })
                }
              }
            }
          } else {
            const personSpace = await client.findOne(contact.class.PersonSpace, { person: person._id })
            if (personSpace !== undefined) {
              await createNotification(client, person, {
                user: account._id,
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
              await this.revokeUserAuth(dta)
            } else {
              this.ctx.error(`Failed to sync user ${dta._id}`, { error: errorToObj(err) })
            }
          }
        }
      } finally {
        if (shouldClose) {
          await platformClient?.close()
        }
      }
    } catch (err: any) {
      Analytics.handleError(err)
    }
  }

  async checkRefreshToken (auth: GithubUserRecord, force: boolean = false): Promise<void> {
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
        await this.revokeUserAuth(auth)
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
      }
    }
  }

  async getAccount (login: string): Promise<GithubUserRecord | undefined> {
    return await this.userManager.getAccount(login)
  }

  async getAccountByRef (workspace: string, ref: Ref<Account>): Promise<GithubUserRecord | undefined> {
    return await this.userManager.getAccountByRef(workspace, ref)
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
        installationName: `${tinst.account?.html_url ?? ''}`
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
        installationName: `${tinst.account?.html_url ?? ''}`
      }
      this.updateInstallationRecord(install.installation.id, val)
      ctx.info('Found installation', {
        installationId: install.installation.id,
        url: install.installation.account?.html_url ?? ''
      })
    }
  }

  async handleInstallationEvent (
    install: Installation,
    repositories: InstallationCreatedEvent['repositories'] | InstallationUnsuspendEvent['repositories'],
    enabled: boolean
  ): Promise<void> {
    this.ctx.info('handle integration add', { installId: install.id, name: install.html_url })
    const okit = await this.app.getInstallationOctokit(install.id)
    const iName = `${install.account.html_url ?? ''}`

    this.updateInstallationRecord(install.id, {
      octokit: okit,
      login: install.account.login,
      type: install.account?.type ?? 'User',
      loginNodeId: install.account.node_id,
      installationName: iName,
      repositories
    })

    const worker = this.getWorker(install.id)
    if (worker !== undefined) {
      await worker.syncUserData(this.ctx, await this.getUsers(worker.workspace.name))
      await worker.reloadRepositories(install.id)

      worker.triggerUpdate()
      worker.triggerSync()
    }

    // Need to inform workspace
    const integeration = this.integrations.find((it) => it.installationId === install.id)
    if (integeration !== undefined) {
      const worker = this.clients.get(integeration.workspace) as GithubWorker
      worker?.triggerUpdate()
    }

    // Check if no workspace was available
    this.triggerCheckWorkspaces()
  }

  async handleInstallationEventDelete (installId: number): Promise<void> {
    const existing = this.installations.get(installId)
    this.installations.delete(installId)
    this.ctx.info('handle integration delete', { installId, name: existing?.installationName })

    const interg = this.integrations.find((it) => it.installationId === installId)

    // We already have, worker we need to update it.
    const worker = this.getWorker(installId) ?? (interg !== undefined ? this.clients.get(interg.workspace) : undefined)
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
    }
    this.integrations = this.integrations.filter((it) => it.installationId !== installId)
    await this.integrationCollection.deleteOne({ installationId: installId })
    this.triggerCheckWorkspaces()
  }

  async getWorkspaces (): Promise<string[]> {
    const workspaces = new Set(this.integrations.map((it) => it.workspace))

    return Array.from(workspaces)
  }

  async checkWorkspaceIsActive (token: string, workspace: string): Promise<ClientWorkspaceInfo | undefined> {
    let workspaceInfo: ClientWorkspaceInfo | undefined
    try {
      workspaceInfo = await getWorkspaceInfo(token)
    } catch (err: any) {
      this.ctx.error('Workspace not found:', { workspace })
      return
    }
    if (workspaceInfo?.workspace === undefined) {
      this.ctx.error('No workspace exists for workspaceId', { workspace })
      return
    }
    if (!isActiveMode(workspaceInfo?.mode)) {
      this.ctx.warn('Workspace is in maitenance, skipping for now.', { workspace })
      return
    }
    if (workspaceInfo?.disabled === true) {
      this.ctx.warn('Workspace is disabled', { workspace })
      return
    }
    const lastVisit = (Date.now() - workspaceInfo.lastVisit) / (3600 * 24 * 1000) // In days

    if (config.WorkspaceInactivityInterval > 0 && lastVisit > config.WorkspaceInactivityInterval) {
      this.ctx.warn('Workspace is inactive for too long, skipping for now.', { workspace })
      return
    }
    return workspaceInfo
  }

  private async checkWorkspaces (): Promise<boolean> {
    this.ctx.info('************************* Check workspaces ************************* ', {
      workspaces: this.clients.size
    })
    let workspaces = await this.getWorkspaces()
    if (process.env.GITHUB_USE_WS !== undefined) {
      workspaces = [process.env.GITHUB_USE_WS]
    }
    const toDelete = new Set<string>(this.clients.keys())

    const rateLimiter = new RateLimiter(5)
    let errors = 0
    let idx = 0
    const connecting = new Map<string, number>()
    const st = Date.now()
    const connectingInfo = setInterval(() => {
      this.ctx.info('****** connecting to workspaces ******', {
        connecting: connecting.size,
        time: Date.now() - st,
        workspaces: workspaces.length,
        queue: rateLimiter.processingQueue.size
      })
      for (const [c, d] of connecting.entries()) {
        this.ctx.info('connecting to workspace', { workspace: c, time: Date.now() - d })
      }
    }, 5000)
    for (const workspace of workspaces) {
      const widx = ++idx
      if (this.clients.has(workspace)) {
        toDelete.delete(workspace)
        continue
      }
      await rateLimiter.add(async () => {
        const token = generateToken(
          systemAccountEmail,
          {
            name: workspace
          },
          { mode: 'github' }
        )
        const workspaceInfo = await this.checkWorkspaceIsActive(token, workspace)
        if (workspaceInfo === undefined) {
          errors++
          return
        }
        try {
          const branding = Object.values(this.brandingMap).find((b) => b.key === workspaceInfo?.branding) ?? null
          const workerCtx = this.ctx.newChild('worker', { workspace: workspaceInfo.workspace }, {})

          connecting.set(workspaceInfo.workspace, Date.now())
          workerCtx.info('************************* Register worker ************************* ', {
            workspaceId: workspaceInfo.workspaceId,
            workspace: workspaceInfo.workspace,
            index: widx,
            total: workspaces.length
          })

          let initialized = false
          const worker = await GithubWorker.create(
            this,
            workerCtx,
            this.installations,
            {
              name: workspace,
              workspaceUrl: workspaceInfo.workspace,
              workspaceName: workspace
            },
            branding,
            this.app,
            this.storageAdapter,
            (workspace, event) => {
              if (event === ClientConnectEvent.Refresh || event === ClientConnectEvent.Upgraded) {
                void this.clients.get(workspace)?.refreshClient(event === ClientConnectEvent.Upgraded)
              }
              if (initialized) {
                // We need to check if workspace is inactive
                void this.checkWorkspaceIsActive(token, workspace).then((res) => {
                  if (res === undefined) {
                    this.ctx.warn('Workspace is inactive, removing from clients list.', { workspace })
                    this.clients.delete(workspace)
                    void worker?.close()
                  }
                })
              }
            }
          )
          if (worker !== undefined) {
            initialized = true
            workerCtx.info('************************* Register worker Done ************************* ', {
              workspaceId: workspaceInfo.workspaceId,
              workspace: workspaceInfo.workspace,
              index: widx,
              total: workspaces.length
            })
            // No if no integration, we will try connect one more time in a time period
            this.clients.set(workspace, worker)
          } else {
            workerCtx.info(
              '************************* Failed Register worker, timeout or integrations removed *************************',
              {
                workspaceId: workspaceInfo.workspaceId,
                workspace: workspaceInfo.workspace,
                index: widx,
                total: workspaces.length
              }
            )
            errors++
          }
        } catch (e: any) {
          Analytics.handleError(e)
          this.ctx.info("Couldn't create WS worker", { workspace, error: e })
          console.error(e)
          errors++
        } finally {
          connecting.delete(workspaceInfo.workspace)
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
      errors++
    }
    clearInterval(connectingInfo)

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
          void ws.close()
        } catch (err: any) {
          Analytics.handleError(err)
          errors++
        }
      }
    }
    this.ctx.info('************************* Check workspaces done ************************* ', {
      workspaces: this.clients.size
    })
    return errors > 0
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
      {},
      new SplitLogger('webhook', { root: join(process.cwd(), 'logs'), pretty: true, enableConsole: false })
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
          await this.revokeUserAuth(record)
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
          repoWorker.handleEvent(github.class.GithubPullRequest, payload.installation?.id, payload),
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
          repoWorker.handleEvent(tracker.class.Issue, payload.installation?.id, payload),
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
          repoWorker.handleEvent(chunter.class.ChatMessage, payload.installation?.id, payload),
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
          repoWorker.handleEvent(github.mixin.GithubProject, payload.installation?.id, payload),
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
            repoWorker.handleEvent(tracker.class.Issue, payload.installation?.id, payload),
            payload.action,
            name,
            id,
            payload.projects_v2_item.node_id
          )
        } else if (payload.projects_v2_item.content_type === 'PullRequest') {
          catchEventError(
            repoWorker.handleEvent(github.class.GithubPullRequest, payload.installation?.id, payload),
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
            this.handleInstallationEvent(payload.installation, payload.repositories, true),
            payload.action,
            name,
            id,
            payload.installation.html_url
          )
          break
        }
        case 'suspend': {
          catchEventError(
            this.handleInstallationEvent(payload.installation, payload.repositories, false),
            payload.action,
            name,
            id,
            payload.installation.html_url
          )
          break
        }
        case 'deleted': {
          catchEventError(
            this.handleInstallationEventDelete(payload.installation.id),
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
        worker.reloadRepositories(payload.installation.id),
        payload.action,
        name,
        id,
        payload.installation.html_url
      )
      const doSyncUsers = async (worker: GithubWorker): Promise<void> => {
        const users = await this.getUsers(worker.workspace.name)
        await worker.syncUserData(this.ctx, users)
      }
      catchEventError(doSyncUsers(worker), payload.action, name, id, payload.installation.html_url)
    })

    this.app.webhooks.on('pull_request_review', async ({ payload, name, id }) => {
      const repoWorker = this.getWorker(payload.installation?.id)
      if (repoWorker !== undefined) {
        catchEventError(
          repoWorker.handleEvent(github.class.GithubReview, payload.installation?.id, payload),
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
          repoWorker.handleEvent(github.class.GithubReviewComment, payload.installation?.id, payload),
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
          repoWorker.handleEvent(github.class.GithubReviewThread, payload.installation?.id, payload),
          payload.action,
          name,
          id,
          payload.repository.html_url
        )
      }
    })
  }

  public async revokeUserAuth (record: GithubUserRecord): Promise<void> {
    for (const [ws, acc] of Object.entries(record.accounts)) {
      await this.updateAccountAuthRecord({ workspace: ws, accountId: acc }, { login: record._id }, undefined, true)
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
