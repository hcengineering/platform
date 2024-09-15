import { Analytics } from '@hcengineering/analytics'
import chunter from '@hcengineering/chunter'
import { CollaboratorClient } from '@hcengineering/collaborator-client'
import contact, { AvatarType, Person, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  AccountRole,
  AttachedDoc,
  Branding,
  Class,
  Client,
  ClientConnectEvent,
  Data,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  FindResult,
  MeasureContext,
  Ref,
  SortingOrder,
  Space,
  Status,
  Tx,
  TxApplyIf,
  TxCUD,
  TxOperations,
  TxWorkspaceEvent,
  WithLookup,
  WorkspaceEvent,
  WorkspaceIdWithUrl,
  concatLink,
  generateId,
  groupByArray,
  reduceCalls,
  toIdMap,
  type Blob,
  type MigrationState
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubAuthentication,
  GithubIntegration,
  GithubIntegrationRepository,
  GithubIssue,
  GithubMilestone,
  GithubProject,
  GithubUserInfo,
  githubId
} from '@hcengineering/github'
import { LiveQuery } from '@hcengineering/query'
import { StorageAdapter } from '@hcengineering/server-core'
import { getPublicLinkUrl } from '@hcengineering/server-guest-resources'
import task, { ProjectType, TaskType } from '@hcengineering/task'
import { MarkupNode, isMarkdownsEquals, jsonToMarkup } from '@hcengineering/text'
import tracker from '@hcengineering/tracker'
import { User } from '@octokit/webhooks-types'
import { App, Octokit } from 'octokit'
import { createPlatformClient } from './client'
import { createCollaboratorClient } from './collaborator'
import config from './config'
import { markupToMarkdown, parseMessageMarkdown } from './markdown'
import { createNotification } from './notifications'
import { InstallationRecord, PlatformWorker } from './platform'
import { CommentSyncManager } from './sync/comments'
import { IssueSyncManager } from './sync/issues'
import { ProjectsSyncManager } from './sync/projects'
import { PullRequestSyncManager } from './sync/pullrequests'
import { RepositorySyncMapper } from './sync/repository'
import { ReviewCommentSyncManager } from './sync/reviewComments'
import { ReviewThreadSyncManager } from './sync/reviewThreads'
import { ReviewSyncManager } from './sync/reviews'
import { syncConfig } from './sync/syncConfig'
import { UsersSyncManager, fetchViewerDetails } from './sync/users'
import { errorToObj } from './sync/utils'
import {
  ContainerFocus,
  DocSyncManager,
  ExternalSyncField,
  GithubUserRecord,
  IntegrationContainer,
  IntegrationManager,
  UserInfo,
  githubDerivedSyncVersion,
  githubExternalSyncVersion,
  githubSyncVersion
} from './types'
import { equalExceptKeys } from './utils'
/**
 * @public
 */
export class GithubWorker implements IntegrationManager {
  integrations: Map<number, IntegrationContainer> = new Map<number, IntegrationContainer>()
  _client: TxOperations
  closing: boolean = false
  syncPromise?: Promise<void>

  triggerRequests: number = 0

  triggerSync: () => void = () => {
    this.triggerRequests++
  }

  updateRequests: number = 0
  triggerUpdate: () => void = () => {
    this.updateRequests++
  }

  mappers: { _class: Ref<Class<Doc>>[], mapper: DocSyncManager }[] = []

  liveQuery: LiveQuery

  repositoryManager: RepositorySyncMapper

  collaborator: CollaboratorClient

  periodicTimer: any

  personMapper: UsersSyncManager

  async close (): Promise<void> {
    clearInterval(this.periodicTimer)

    this.closing = true
    await this.syncPromise
    await this.client.close()
  }

  async refreshClient (clean: boolean): Promise<void> {
    await this.liveQuery.refreshConnect(clean)
  }

  getWorkspaceId (): WorkspaceIdWithUrl {
    return this.workspace
  }

  getBranding (): Branding | null {
    return this.branding
  }

  async reloadRepositories (installationId: number): Promise<void> {
    const current = this.integrations.get(installationId)
    if (current !== undefined) {
      await this.repositoryManager.reloadRepositories(current)
      this.triggerUpdate()
    }
  }

  async checkMarkdownConversion (
    container: IntegrationContainer,
    body: string
  ): Promise<{ markdownCompatible: boolean, markdown: string }> {
    const markupText = await this.getMarkup(container, body)
    const markDown = await this.getMarkdown(markupText)
    return { markdownCompatible: isMarkdownsEquals(body, markDown), markdown: markDown }
  }

  async getMarkup (
    container: IntegrationContainer,
    text?: string | null,
    preprocessor?: (nodes: MarkupNode) => Promise<void>
  ): Promise<string> {
    if (text == null) {
      return ''
    }
    const frontUrl = this.getBranding()?.front ?? config.FrontURL
    const refUrl = concatLink(frontUrl, `/browse/?workspace=${this.workspace.name}`)
    // TODO storage URL
    const imageUrl = concatLink(frontUrl ?? config.FrontURL, `/files?workspace=${this.workspace.name}&file=`)
    const guestUrl = getPublicLinkUrl(this.workspace, frontUrl)
    const json = parseMessageMarkdown(text ?? '', refUrl, imageUrl, guestUrl)
    await preprocessor?.(json)
    return jsonToMarkup(json)
  }

  async getMarkdown (text?: string | null, preprocessor?: (nodes: MarkupNode) => Promise<void>): Promise<string> {
    if (text == null) {
      return ''
    }
    return await markupToMarkdown(
      text ?? '',
      concatLink(this.getBranding()?.front ?? config.FrontURL, `/browse/?workspace=${this.workspace.name}`),
      // TODO storage URL
      concatLink(this.getBranding()?.front ?? config.FrontURL, `/files?workspace=${this.workspace.name}&file=`),
      preprocessor
    )
  }

  async getContainer (space: Ref<Space>): Promise<ContainerFocus | undefined> {
    const project = (
      await this.liveQuery.queryFind<GithubProject>(github.mixin.GithubProject, {
        _id: space as Ref<GithubProject>
      })
    ).shift()
    if (project !== undefined) {
      for (const v of this.integrations.values()) {
        if (v.octokit === undefined) {
          continue
        }
        if (project.integration !== v.integration._id) {
          continue
        }
        return {
          container: v,
          project
        }
      }
    }
  }

  async getProjectRepositories (space: Ref<Space>): Promise<GithubIntegrationRepository[]> {
    const repositories = await this.liveQuery.queryFind<GithubIntegrationRepository>(
      github.class.GithubIntegrationRepository,
      {}
    )
    return repositories.filter((it) => it.githubProject === space)
  }

  async getRepositoryById (
    _id?: Ref<GithubIntegrationRepository> | null
  ): Promise<GithubIntegrationRepository | undefined> {
    if (_id != null) {
      return (
        await this.liveQuery.queryFind<GithubIntegrationRepository>(github.class.GithubIntegrationRepository, { _id })
      ).shift()
    }
  }

  async getAccountU (user: User): Promise<PersonAccount | undefined> {
    return await this.getAccount({
      id: user.node_id,
      login: user.login,
      avatarUrl: user.avatar_url,
      email: user.email ?? undefined,
      name: user.name
    })
  }

  accountMap = new Map<string, Promise<PersonAccount | undefined>>()
  async getAccount (userInfo?: UserInfo | null): Promise<PersonAccount | undefined> {
    if (userInfo?.login == null) {
      return
    }
    const info = this.accountMap.get(userInfo?.login ?? '')
    if (info !== undefined) {
      return await info
    }
    const p = this._getAccountRaw(userInfo)
    this.accountMap.set(userInfo?.login ?? '', p)
    return await p
  }

  async _getAccountRaw (userInfo?: UserInfo | null): Promise<PersonAccount | undefined> {
    // We need to sync by userInfo id to prevent parallel requests.
    if (userInfo === null) {
      // Ghost author.
      return await this.getAccount({
        id: 'ghost',
        login: 'ghost',
        avatarUrl: 'https://avatars.githubusercontent.com/u/10137?v=4',
        email: '<EMAIL>',
        name: 'Ghost'
      })
    }
    if (userInfo?.login == null) {
      return
    }
    const userName = (userInfo.name ?? userInfo.login)
      .split(' ')
      .map((it) => it.trim())
      .reverse()
      .join(',') // TODO: Convert first, last name

    const infos = await this.liveQuery.findOne(github.class.GithubUserInfo, { login: userInfo.login })
    if (infos === undefined) {
      await this._client.createDoc(github.class.GithubUserInfo, contact.space.Contacts, {
        ...userInfo
      })
    }

    const account = await this.liveQuery.findOne(contact.class.PersonAccount, { email: `github:${userInfo.login}` })
    if (account !== undefined) {
      const person = await this.liveQuery.findOne(contact.class.Person, { _id: account.person })
      // We need to be sure employee are exists.
      if (person === undefined) {
        const person: Ref<Person> = await this.findPerson(userInfo, userName)
        if (account.person !== person) {
          await this._client.update(account, { person })
        }
      }
      return account
    } else {
      // Check authorized users
      const accountRecord = await this.platform.getAccount(userInfo.login)
      if (accountRecord !== undefined) {
        const authorizedId = accountRecord.accounts[this.workspace.name]
        if (authorizedId !== undefined) {
          const emp = await this._client.findOne(contact.class.PersonAccount, {
            _id: authorizedId as Ref<PersonAccount>
          })
          if (emp !== undefined) {
            // We need to create github account
            const gid = await this._client.createDoc(contact.class.PersonAccount, core.space.Model, {
              email: `github:${userInfo.login}`,
              person: emp.person,
              role: AccountRole.User
            })
            const acc = await this._client.findOne(contact.class.PersonAccount, { _id: gid })
            return acc
          }
        }
      }

      const person: Ref<Person> | undefined = await this.findPerson(userInfo, userName)

      // We need to create email account
      const id = await this._client.createDoc(contact.class.PersonAccount, core.space.Model, {
        email: `github:${userInfo.login}`,
        person,
        role: AccountRole.User
      })
      const acc = await this.liveQuery.findOne(contact.class.PersonAccount, { _id: id })
      return acc
    }
  }

  private constructor (
    readonly ctx: MeasureContext,
    readonly platform: PlatformWorker,
    readonly installations: Map<number, InstallationRecord>,
    readonly client: Client,
    readonly app: App,
    readonly storageAdapter: StorageAdapter,
    readonly workspace: WorkspaceIdWithUrl,
    readonly branding: Branding | null,
    readonly periodicSyncInterval = 60 * 60 * 1000
  ) {
    this._client = new TxOperations(this.client, core.account.System)
    this.liveQuery = new LiveQuery(client)

    this.repositoryManager = new RepositorySyncMapper(this.ctx.newChild('repository', {}), this._client, this.app)

    this.collaborator = createCollaboratorClient(this.workspace)

    this.personMapper = new UsersSyncManager(this.ctx.newChild('users', {}), this._client, this.liveQuery)

    this.mappers = [
      { _class: [github.mixin.GithubProject], mapper: this.repositoryManager },
      {
        _class: [github.class.GithubIntegration, tracker.class.Milestone],
        mapper: new ProjectsSyncManager(this.ctx.newChild('project', {}), this._client, this.liveQuery)
      },
      {
        _class: [tracker.class.Issue],
        mapper: new IssueSyncManager(this.ctx.newChild('issue', {}), this._client, this.liveQuery, this.collaborator)
      },
      {
        _class: [github.class.GithubPullRequest],
        mapper: new PullRequestSyncManager(
          this.ctx.newChild('pullRequest', {}),
          this._client,
          this.liveQuery,
          this.collaborator
        )
      },
      {
        _class: [chunter.class.ChatMessage],
        mapper: new CommentSyncManager(this.ctx.newChild('comment', {}), this._client, this.liveQuery)
      },
      {
        _class: [contact.class.PersonAccount],
        mapper: this.personMapper
      },
      {
        _class: [github.class.GithubReview],
        mapper: new ReviewSyncManager(this.ctx.newChild('review', {}), this._client, this.liveQuery)
      },
      {
        _class: [github.class.GithubReviewThread],
        mapper: new ReviewThreadSyncManager(this.ctx.newChild('review-thread', {}), this._client, this.liveQuery)
      },
      {
        _class: [github.class.GithubReviewComment],
        mapper: new ReviewCommentSyncManager(this.ctx.newChild('review-comment', {}), this._client, this.liveQuery)
      }
    ]

    // We need to perform some periodic syncs, like sync users available, sync repo data.
    this.periodicTimer = setInterval(() => {
      if (this.periodicSyncPromise === undefined) {
        this.periodicSyncPromise = this.performPeriodicSync()
      }
    }, this.periodicSyncInterval)
  }

  periodicSyncPromise: Promise<void> | undefined
  async performPeriodicSync (): Promise<void> {
    try {
      for (const inst of this.integrations.values()) {
        await this.repositoryManager.reloadRepositories(inst)
      }
      this.triggerUpdate()
    } catch (err: any) {
      Analytics.handleError(err)
    }

    this.periodicSyncPromise = undefined
  }

  private async findPerson (userInfo: UserInfo, userName: string): Promise<Ref<Person>> {
    let person: Ref<Person> | undefined
    // try to find by account.
    if (userInfo.email != null) {
      const personAccount = await this.liveQuery.findOne(contact.class.PersonAccount, { email: userInfo.email })
      person = personAccount?.person
    }

    if (person === undefined) {
      const channel = await this.liveQuery.findOne(contact.class.Channel, {
        provider: contact.channelProvider.GitHub,
        value: userInfo.login
      })
      person = channel?.attachedTo as Ref<Person>
    }

    if (person === undefined) {
      // We need to create some person to identify this account.
      person = await this._client.createDoc(contact.class.Person, contact.space.Contacts, {
        name: userName,
        avatarType: AvatarType.EXTERNAL,
        avatarProps: { url: userInfo.avatarUrl },
        city: '',
        comments: 0,
        channels: 0,
        attachments: 0
      })
      await this._client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        person,
        contact.class.Person,
        'channels',
        {
          provider: contact.channelProvider.GitHub,
          value: userInfo.login
        }
      )
      if (userInfo.email != null && userInfo.email.trim() !== '') {
        await this._client.addCollection(
          contact.class.Channel,
          contact.space.Contacts,
          person,
          contact.class.Person,
          'channels',
          {
            provider: contact.channelProvider.Email,
            value: userInfo.email
          }
        )
      }
    }
    return person
  }

  async getGithubLogin (container: IntegrationContainer, person: Ref<Person>): Promise<UserInfo | undefined> {
    const accounts = await this.liveQuery.queryFind(contact.class.PersonAccount, {})
    const acc = accounts.find((it) => it.person === person && it.email.startsWith('github:'))
    if (acc === undefined) {
      return // Nobody, will use system account.
    }
    const login = acc.email.substring(7)
    let info = await this.liveQuery.findOne(github.class.GithubUserInfo, { login })
    if (info === undefined) {
      // We need to retrieve info for login
      const response: any = await container.octokit?.graphql(
        `query($login: String!) {
        user(login: $login) {
          id
          email
          login
          name
          avatarUrl
        }
      }`,
        {
          login
        }
      )

      info = response.user
      await this._client.createDoc(github.class.GithubUserInfo, contact.space.Contacts, info as Data<GithubUserInfo>)
    }
    return info
  }

  async syncUserData (ctx: MeasureContext, users: GithubUserRecord[]): Promise<void> {
    // Let's sync information about users and send some details
    const accounts = await this._client.findAll(contact.class.PersonAccount, {
      email: { $in: users.map((it) => `github:${it._id}`) }
    })
    const userAuths = await this._client.findAll(github.class.GithubAuthentication, {})
    const persons = await this._client.findAll(contact.class.Person, { _id: { $in: accounts.map((it) => it.person) } })
    for (const record of users) {
      if (record.error !== undefined) {
        // Skip accounts with error
        continue
      }
      const account = accounts.find((it) => it.email === `github:${record._id}`)
      const userAuth = userAuths.find((it) => it.login === record._id)
      const person = persons.find((it) => account?.person)
      if (account === undefined || userAuth === undefined || person === undefined) {
        continue
      }
      const accountRef = record.accounts[this.workspace.name]
      try {
        await this.platform.checkRefreshToken(record, true)

        const ops = new TxOperations(this.client, accountRef)
        await syncUser(ctx, record, userAuth, ops, accountRef)
      } catch (err: any) {
        await this.platform.revokeUserAuth(record)
        if (err.response?.data?.message !== 'Bad credentials') {
          ctx.error(`Failed to sync user ${record._id}`, err)
          Analytics.handleError(err)
        }
        if (userAuth !== undefined) {
          await this._client.update<GithubAuthentication>(
            userAuth,
            {
              error: errorToObj(err)
            },
            undefined,
            Date.now(),
            accountRef
          )
        }
      }
    }
  }

  async getOctokit (account: Ref<PersonAccount>): Promise<Octokit | undefined> {
    let record = await this.platform.getAccountByRef(this.workspace.name, account)

    // const accountRef = this.accounts.find((it) => it._id === account)
    const accountRef = await this.liveQuery.findOne(contact.class.PersonAccount, { _id: account })
    if (record === undefined) {
      if (accountRef !== undefined) {
        const accounts = this._client.getModel().getAccountByPersonId(accountRef.person)
        for (const aa of accounts) {
          record = await this.platform.getAccountByRef(this.workspace.name, aa._id)
          if (record !== undefined) {
            break
          }
        }
      }
    }
    // Check and refresh token if required.
    if (record !== undefined) {
      this.ctx.info('get octokit', { account, recordId: record._id, workspace: this.workspace.name })
      await this.platform.checkRefreshToken(record)
      return new Octokit({
        auth: record.token,
        client_id: config.ClientID,
        client_secret: config.ClientSecret
      })
    }

    // We need to inform user, he need to authorize this account with github.
    if (accountRef !== undefined) {
      const person = await this.liveQuery.findOne(contact.class.Person, { _id: accountRef.person })
      if (person !== undefined) {
        const personSpace = await this.liveQuery.findOne(contact.class.PersonSpace, { person: person._id })
        if (personSpace !== undefined) {
          await createNotification(this._client, person, {
            user: account,
            space: personSpace._id,
            message: github.string.AuthenticatedWithGithubRequired,
            props: {}
          })
        }
      }
    }
    this.ctx.info('get octokit: return bot', { account, workspace: this.workspace.name })
  }

  async isPlatformUser (account: Ref<PersonAccount>): Promise<boolean> {
    let record = await this.platform.getAccountByRef(this.workspace.name, account)
    const accountRef = await this.liveQuery.findOne(contact.class.PersonAccount, { _id: account })
    if (record === undefined) {
      if (accountRef !== undefined) {
        const accounts = this._client.getModel().getAccountByPersonId(accountRef.person)
        for (const aa of accounts) {
          record = await this.platform.getAccountByRef(this.workspace.name, aa._id)
          if (record !== undefined) {
            break
          }
        }
      }
    }
    // Check and refresh token if required.
    return record !== undefined && accountRef !== undefined
  }

  async uploadFile (patch: string, file?: string, contentType?: string): Promise<Blob | undefined> {
    const id: string = file ?? generateId()
    await this.storageAdapter.put(this.ctx, this.workspace, id, patch, contentType ?? 'text/x-patch')
    return await this.storageAdapter.stat(this.ctx, this.workspace, id)
  }

  integrationRepositories: WithLookup<GithubIntegrationRepository>[] = []
  integrationsRaw: GithubIntegration[] = []

  async getProjectType (type: Ref<ProjectType>): Promise<ProjectType | undefined> {
    return (await this.liveQuery.queryFind(task.class.ProjectType, { _id: type })).shift()
  }

  async getTaskType (type: Ref<TaskType>): Promise<TaskType | undefined> {
    return (await this.liveQuery.queryFind(task.class.TaskType, { _id: type })).shift()
  }

  async getTaskTypeOf (project: Ref<ProjectType>, ofClass: Ref<Class<Doc>>): Promise<TaskType | undefined> {
    const pType = await this.getProjectType(project)
    for (const tsk of pType?.tasks ?? []) {
      const task = await this.getTaskType(tsk)
      if (task?.ofClass === ofClass) {
        return task
      }
    }
  }

  async getProjectStatuses (type: Ref<ProjectType> | undefined): Promise<Status[]> {
    if (type === undefined) return []

    const statuses = await this.liveQuery.queryFind(core.class.Status, {})

    const projectType = await this.getProjectType(type)

    const allowedTypes = new Set(projectType?.statuses.map((it) => it._id) ?? [])
    return statuses.filter((it) => allowedTypes.has(it._id))
  }

  async getStatuses (type: Ref<TaskType> | undefined): Promise<Status[]> {
    if (type === undefined) return []
    const taskType = await this.getTaskType(type)

    const statuses = await this.liveQuery.queryFind(core.class.Status, {})

    const allowedTypes = new Set(taskType?.statuses ?? [])
    return statuses.filter((it) => allowedTypes.has(it._id))
  }

  async init (): Promise<void> {
    this.registerNotifyHandler()

    await this.queryAccounts()

    await this.queryProjects()

    for (const { mapper } of this.mappers) {
      await mapper.init(this)
    }

    await new Promise<void>((resolve) => {
      this.liveQuery.query(github.class.GithubIntegration, {}, (res) => {
        try {
          if (equalExceptKeys(this.integrationsRaw, res, ['modifiedBy', 'modifiedOn'])) {
            return
          }
          this.integrationsRaw = res
        } finally {
          resolve()
        }

        this.triggerUpdate()
      })
    })
    await new Promise<void>((resolve) => {
      this.liveQuery.query(github.class.GithubIntegrationRepository, {}, (res) => {
        try {
          if (equalExceptKeys(this.integrationRepositories, res, ['modifiedOn', 'modifiedBy'])) {
            return
          }
          // We have some repository changed.
          const existing = toIdMap(res)
          const removed = this.integrationRepositories.filter((it) => !existing.has(it._id))
          this.integrationRepositories = res

          const clearCacheForRepo = (r: WithLookup<GithubIntegrationRepository>): void => {
            const i = Array.from(this.integrations.values()).find((it) => it.integration._id === r.attachedTo)
            if (i !== undefined) {
              for (const m of this.mappers) {
                m.mapper.repositoryDisabled(i, r)
              }
            }
          }
          // In case enabled is change to false, we need to clean cache for repository.
          for (const r of res) {
            if (!r.enabled) {
              clearCacheForRepo(r)
            }
          }
          for (const o of removed) {
            clearCacheForRepo(o)
          }
        } finally {
          resolve()
        }

        this.triggerUpdate()
      })
    })

    this.triggerRequests = 1
    this.updateRequests = 1
    this.syncPromise = this.syncAndWait()

    const userRecords = await this.platform.getUsers(this.workspace.name)
    try {
      await this.syncUserData(this.ctx, userRecords)
    } catch (err: any) {
      Analytics.handleError(err)
    }
  }

  projects: GithubProject[] = []
  milestones: GithubMilestone[] = []

  async queryProjects (): Promise<void> {
    await new Promise<void>((resolve) => {
      this.liveQuery.query(github.mixin.GithubProject, {}, (res) => {
        let needRefresh = false
        if (!equalExceptKeys(this.projects, res, ['sequence', 'modifiedOn', 'modifiedBy'])) {
          needRefresh = true
        }
        this.projects = res
        resolve()
        if (needRefresh || this.projects.length !== res.length) {
          // Do not trigger update if only sequence is changed.
          this.triggerUpdate()
        }
      })
    })

    await new Promise<void>((resolve) => {
      this.liveQuery.query(github.mixin.GithubMilestone, {}, (res) => {
        let needRefresh = false
        if (!equalExceptKeys(this.milestones, res, ['modifiedOn', 'modifiedBy'])) {
          needRefresh = true
        }
        this.milestones = res
        resolve()
        if (needRefresh || this.milestones.length !== res.length) {
          // Do not trigger update if only sequence is changed.
          this.triggerUpdate()
        }
      })
    })
  }

  async updateIntegrations (): Promise<void> {
    await this.checkMapping()
    for (const it of this.integrationsRaw) {
      let current = this.integrations.get(it.installationId)
      if (current === undefined) {
        try {
          const inst = this.installations.get(it.installationId)
          if (inst === undefined) {
            // will update on next update.
            continue
          }
          current = {
            integration: it,
            octokit: inst.octokit,
            installationId: it.installationId,
            login: inst.login ?? '',
            loginNodeId: inst.loginNodeId ?? '',
            type: inst.type ?? 'User',
            installationName: inst?.installationName ?? '',
            enabled: true,
            synchronized: new Set(),
            projectStructure: new Map(),
            syncLock: new Map()
          }
          this.integrations.set(it.installationId, current)
          await this.repositoryManager.reloadRepositories(current, inst.repositories)
        } catch (err: any) {
          Analytics.handleError(err)
          this.ctx.error('Error', { err })
        }
      } else {
        const inst = this.installations.get(it.installationId)
        if (inst === undefined) {
          // will update on next update.
          continue
        }
        current.integration = it
        await this.repositoryManager.reloadRepositories(current, inst.repositories)
      }
    }
  }

  private registerNotifyHandler (): void {
    this.client.notify = (...tx: Tx[]) => {
      void this.liveQuery
        .tx(...tx)
        .then(() => {
          // Handle tx
          const h = this._client.getHierarchy()
          for (const t of tx) {
            if (h.isDerived(t._class, core.class.TxCUD)) {
              const cud = t as TxCUD<Doc>
              if (cud.objectClass === github.class.DocSyncInfo) {
                this.triggerSync()
                break
              }
            }
            if (h.isDerived(t._class, core.class.TxApplyIf)) {
              const applyop = t as TxApplyIf
              for (const tt of applyop.txes) {
                if (tt.objectClass === github.class.DocSyncInfo) {
                  this.triggerSync()
                  break
                }
              }
            }
            if (h.isDerived(t._class, core.class.TxWorkspaceEvent)) {
              const evt = t as TxWorkspaceEvent
              if (evt.event === WorkspaceEvent.BulkUpdate) {
                // Just trigger for any bulk update
                this.triggerUpdate()
                break
              }
            }
          }
        })
        .catch((err) => {
          this.ctx.error('error during live query', { err })
          Analytics.handleError(err)
        })
    }
  }

  private async queryAccounts (): Promise<void> {
    const updateAccounts = async (accounts: PersonAccount[]): Promise<void> => {
      const persons = await this.liveQuery.queryFind(contact.class.Person, {
        _id: { $in: accounts.map((it) => it.person) }
      })
      const h = this.client.getHierarchy()
      for (const a of accounts) {
        if (a.email.startsWith('github:')) {
          const login = a.email.substring(7)
          const person = persons.find((it) => it._id === a.person)
          if (person !== undefined) {
            // #1 check if person has GithubUser mixin.
            if (!h.hasMixin(person, github.mixin.GithubUser)) {
              await this._client.createMixin(person._id, person._class, person.space, github.mixin.GithubUser, {
                url: `https://github.com/${login}`
              })
            } else {
              const ghu = h.as(person, github.mixin.GithubUser)
              if (ghu.url !== `https://github.com/${login}`) {
                await this._client.updateMixin(person._id, person._class, person.space, github.mixin.GithubUser, {
                  url: `https://github.com/${login}`
                })
              }
            }
            // #2 check if person has contact github and if not add it.
            const channel = await this._client.findOne(contact.class.Channel, {
              provider: contact.channelProvider.GitHub,
              value: login,
              attachedTo: person._id
            })
            if (channel === undefined) {
              await this._client.addCollection(
                contact.class.Channel,
                person.space,
                person._id,
                contact.class.Person,
                'channels',
                {
                  provider: contact.channelProvider.GitHub,
                  value: login
                }
              )
            }
          }
        }
      }
    }
    await new Promise<void>((resolve, reject) => {
      this.liveQuery.query(contact.class.PersonAccount, {}, (res) => {
        void updateAccounts(res).then(resolve).catch(reject)
      })
    })
  }

  async performExternalSync (
    projects: GithubProject[],
    repositories: GithubIntegrationRepository[],
    field: ExternalSyncField,
    version: string
  ): Promise<boolean> {
    // Find all classes with e
    const query: DocumentQuery<DocSyncInfo> = {
      [field]: { $nin: [version, '#'] },
      space: { $in: Array.from(projects.map((it) => it._id)) },
      repository: { $in: Array.from(repositories.map((it) => it._id)) },
      url: { $ne: '' }
    }
    if (field === 'derivedVersion') {
      const classes: Ref<Class<Doc>>[] = []
      for (const m of this.mappers) {
        if (m.mapper.externalDerivedSync) {
          classes.push(...m._class)
        }
      }
      // We need check only mappers, with support to this sync kind
      query.objectClass = { $in: classes }
    }

    const docs = await this._client.findAll(github.class.DocSyncInfo, query, {
      limit: 50,
      sort: { modifiedOn: SortingOrder.Ascending }
    })
    if (docs.length === 0) {
      return false
    }
    // Group changes by class and retrieve source documents.
    const byRepository = this.groupByRepository(docs)

    const ints = Array.from(this.integrations.values())
    const derivedClient = new TxOperations(this.client, core.account.System, true)
    for (const [repository, docs] of byRepository.entries()) {
      const integration = ints.find((it) => repositories.find((q) => q._id === repository))
      if (integration?.octokit === undefined) {
        continue
      }

      const repo = repositories.find((it) => it._id === repository)
      if (repo === undefined) {
        continue
      }
      const prj = projects.find((it) => repo.githubProject === it._id)
      if (prj === undefined) {
        continue
      }

      this.ctx.info('External Syncing', {
        name: repo.name,
        prj: prj.name,
        field,
        version,
        docs: docs.length,
        workspace: this.workspace.name
      })

      const byClass = this.groupByClass(docs)
      for (const [_class, _docs] of byClass.entries()) {
        const mapper = this.mappers.find((it) => it._class.includes(_class))?.mapper
        try {
          await mapper?.externalSync(integration, derivedClient, field, _docs, repo, prj)
        } catch (err: any) {
          Analytics.handleError(err)
          this.ctx.error('failed to perform external sync', err)
        }
      }
    }
    return true
  }

  previousWait = 0
  private groupByRepository (docs: FindResult<DocSyncInfo>): Map<Ref<GithubIntegrationRepository>, DocSyncInfo[]> {
    const byRepository = new Map<Ref<GithubIntegrationRepository>, DocSyncInfo[]>()

    for (const d of docs) {
      byRepository.set(d.repository as Ref<GithubIntegrationRepository>, [
        ...(byRepository.get(d.repository as Ref<GithubIntegrationRepository>) ?? []),
        d
      ])
    }
    return byRepository
  }

  groupByClass (docs: DocSyncInfo[]): Map<Ref<Class<Doc>>, DocSyncInfo[]> {
    const byClass = new Map<Ref<Class<Doc>>, DocSyncInfo[]>()

    for (const d of docs) {
      byClass.set(d.objectClass, [...(byClass.get(d.objectClass) ?? []), d])
    }
    return byClass
  }

  async applyMigrations (): Promise<void> {
    const key = 'lowerCaseDuplicates'
    // We need to apply migrations if required.
    const migration = await this.client.findOne<MigrationState>(core.class.MigrationState, {
      plugin: githubId,
      state: key
    })

    const derivedClient = new TxOperations(this.client, core.account.System, true)

    if (migration === undefined) {
      let modifiedOn = 0
      const limit = 1000
      while (true) {
        const docs = (
          await this.client.findAll(
            github.class.DocSyncInfo,
            { url: { $ne: '' }, modifiedOn },
            { projection: { url: 1, modifiedOn: 1 } }
          )
        ).concat(
          await this.client.findAll(
            github.class.DocSyncInfo,
            { url: { $ne: '' }, modifiedOn: { $gt: modifiedOn } },
            { limit, sort: { modifiedOn: SortingOrder.Ascending }, projection: { url: 1, modifiedOn: 1 } }
          )
        )
        if (docs.length > 0) {
          modifiedOn = docs[docs.length - 1].modifiedOn
        } else {
          // No more elements
          break
        }
        const ops = derivedClient.apply()

        const uris: string[] = []
        // Check if some uris need to be lowercased
        for (const d of docs) {
          if (d.url.startsWith('http://') || d.url.startsWith('https://')) {
            const lw = d.url.toLowerCase()
            uris.push(lw) // This is for duplicate processing
            if (lw !== d.url) {
              await ops.update(d, { url: lw })
            }
          }
        }
        await ops.commit()
        // Try find delete duplicate info
        const duplicates = groupByArray(
          await this.client.findAll(github.class.DocSyncInfo, { url: { $in: uris } }),
          (d) => d.url
        )
        for (const [, v] of duplicates.entries()) {
          // We need to delete a value without a document or any
          if (v.length > 1) {
            for (const d of v.slice(1)) {
              try {
                await derivedClient.remove(d)
                await derivedClient.removeDoc(d.objectClass, d.space, d._id)
              } catch (err: any) {
                this.ctx.error('failed to clean duplicate item', { err })
              }
            }
          }
        }
        if (docs.length < limit) {
          // We processed all items
          break
        }
      }

      await derivedClient.createDoc(core.class.MigrationState, core.space.Configuration, {
        plugin: githubId,
        state: key
      })
    }
  }

  async syncAndWait (): Promise<void> {
    this.updateRequests = 1

    await this.applyMigrations()
    while (!this.closing) {
      if (this.updateRequests > 0) {
        this.updateRequests = 0 // Just in case
        await this.updateIntegrations()
        void this.performFullSync()
      }

      const { projects, repositories } = await this.collectActiveProjects()
      if (projects.length === 0 && repositories.length === 0) {
        await this.waitChanges()
        continue
      }

      // Check if we have documents with external sync request's pending.
      const hadExternalChanges = await this.performExternalSync(
        projects,
        repositories,
        'externalVersion',
        githubExternalSyncVersion
      )
      const hadSyncChanges = await this.performSync(projects, repositories)

      // Perform derived operations
      // Sync derived external data, like pull request reviews, files etc.
      const hadDerivedChanges = await this.performExternalSync(
        projects,
        repositories,
        'derivedVersion',
        githubDerivedSyncVersion
      )

      if (!hadExternalChanges && !hadSyncChanges && !hadDerivedChanges) {
        if (this.previousWait !== 0) {
          this.ctx.info('Wait for changes:', { previousWait: this.previousWait, workspace: this.workspace.name })
          this.previousWait = 0
        }
        // Wait until some sync documents will be modified, updated.
        await this.waitChanges()
      }
    }
  }

  private async performSync (projects: GithubProject[], repositories: GithubIntegrationRepository[]): Promise<boolean> {
    const _projects = projects.map((it) => it._id)
    const _repositories = repositories.map((it) => it._id)

    const docs = await this.ctx.with(
      'find-doc-sync-info',
      {},
      async (ctx) =>
        await this._client.findAll<DocSyncInfo>(
          github.class.DocSyncInfo,
          {
            needSync: { $ne: githubSyncVersion },
            externalVersion: { $in: [githubExternalSyncVersion, '#'] },
            space: { $in: _projects },
            repository: { $in: [null, ..._repositories] }
          },
          {
            limit: 50
          }
        ),
      { _projects, _repositories }
    )

    //

    if (docs.length > 0) {
      this.previousWait += docs.length
      this.ctx.info('Syncing', { docs: docs.length, workspace: this.workspace.name })

      await this.doSyncFor(docs)
    }
    return docs.length !== 0
  }

  async doSyncFor (docs: DocSyncInfo[]): Promise<void> {
    const byClass = this.groupByClass(docs)

    // We need to reorder based on our sync mappers

    for (const [_class, clDocs] of byClass.entries()) {
      await this.syncClass(_class, clDocs)
    }
  }

  private async collectActiveProjects (): Promise<{
    projects: GithubProject[]
    repositories: GithubIntegrationRepository[]
  }> {
    const projects: GithubProject[] = []
    const repositories: GithubIntegrationRepository[] = []

    const allProjects = await this.liveQuery.queryFind<GithubProject>(github.mixin.GithubProject, {})
    const allRepositories = await this.liveQuery.queryFind(github.class.GithubIntegrationRepository, { enabled: true })

    for (const it of Array.from(this.integrations.values())) {
      if (it.enabled) {
        const _projects = allProjects.filter((p) => !syncConfig.MainProject || it.projectStructure.has(p._id))

        const prjIds = new Set(_projects.map((it) => it._id))

        const _repos = allRepositories.filter((r) => r.githubProject != null && prjIds.has(r.githubProject))
        repositories.push(..._repos)

        const repoProjects = new Set(_repos.map((it) => it.githubProject))

        projects.push(..._projects.filter((p) => repoProjects.has(p._id)))
      }
    }

    if (process.env.GITHUB_DEBUG_SYNC === 'true' && projects.length === 0 && repositories.length === 0) {
      return { projects: allProjects, repositories: allRepositories }
    }

    return { projects, repositories }
  }

  async checkMapping (): Promise<void> {
    for (const intgr of this.platform.integrations.filter((it) => it.workspace === this.workspace.name)) {
      const integration = await this._client.findOne(github.class.GithubIntegration, {
        installationId: intgr.installationId
      })
      if (integration === undefined && this.installations.has(intgr.installationId)) {
        const installation = this.installations.get(intgr.installationId) as InstallationRecord
        await this._client.createDoc(
          github.class.GithubIntegration,
          core.space.Configuration,
          {
            alive: true,
            installationId: intgr.installationId,
            clientId: config.ClientID,
            name: installation.installationName,
            nodeId: installation.loginNodeId,
            repositories: 0
          },
          generateId(),
          Date.now(),
          intgr.accountId
        )
        this.triggerUpdate()
      } else if (integration !== undefined) {
        await this._client.diffUpdate(integration, {
          alive: true
        })
      }
    }
  }

  async syncClass (_class: Ref<Class<Doc>>, syncInfo: DocSyncInfo[]): Promise<void> {
    const externalDocs = await this._client.findAll<Doc>(_class, {
      _id: { $in: syncInfo.map((it) => it._id as Ref<Doc>) }
    })

    const parents = await this._client.findAll<DocSyncInfo>(github.class.DocSyncInfo, {
      url: { $in: syncInfo.map((it) => it.parent?.toLowerCase()).filter((it) => it) as string[] }
    })

    // Attached parents, for new documents.
    const attachedTo = externalDocs
      .filter((it) => this.client.getHierarchy().isDerived(it._class, core.class.AttachedDoc))
      .map((it) => (it as AttachedDoc).attachedTo as Ref<DocSyncInfo>)
      .filter((it, idx, arr) => arr.indexOf(it) === idx)

    const attachedParents = await this._client.findAll<DocSyncInfo>(github.class.DocSyncInfo, {
      _id: { $in: attachedTo }
    })

    const derivedClient = new TxOperations(this.client, core.account.System, true)

    const docsMap = new Map<Ref<Doc>, Doc>(externalDocs.map((it) => [it._id as Ref<Doc>, it]))
    const orderedSyncInfo = [...syncInfo]
    orderedSyncInfo.sort((a, b) => {
      const adoc = docsMap.get(a._id as Ref<Doc>)
      const bdoc = docsMap.get(a._id as Ref<Doc>)
      return (bdoc?.createdOn ?? 0) - (adoc?.createdOn ?? 0)
    })

    for (const info of orderedSyncInfo) {
      try {
        const existing = externalDocs.find((it) => it._id === info._id)
        const mapper = this.mappers.find((it) => it._class.includes(info.objectClass))?.mapper
        if (mapper === undefined) {
          this.ctx.info('No mapper for class', { objectClass: info.objectClass, workspace: this.workspace.name })
          await derivedClient.update<DocSyncInfo>(info, {
            needSync: githubSyncVersion
          })
          continue
        }
        const repo = await this.getRepositoryById(info.repository)
        if (repo !== undefined && !repo.enabled) {
          continue
        }

        let parent =
          info.parent !== undefined
            ? parents.find((it) => it.url.toLowerCase() === info.parent?.toLowerCase())
            : undefined
        if (
          parent === undefined &&
          existing !== undefined &&
          this.client.getHierarchy().isDerived(existing._class, core.class.AttachedDoc)
        ) {
          // Find with attached parent
          parent = attachedParents.find((it) => it._id === (existing as AttachedDoc).attachedTo)
        }

        if (existing !== undefined && existing.space !== info.space) {
          // document is moved to non github project, so for github it like delete.
          const targetProject = await this.client.findOne(github.mixin.GithubProject, {
            _id: existing.space as Ref<GithubProject>
          })
          if (await mapper.handleDelete(existing, info, derivedClient, false, parent)) {
            const h = this._client.getHierarchy()
            await derivedClient.remove(info)
            if (h.hasMixin(existing, github.mixin.GithubIssue)) {
              const mixinData = this._client.getHierarchy().as(existing, github.mixin.GithubIssue)
              await this._client.update<GithubIssue>(
                mixinData,
                {
                  url: '',
                  githubNumber: 0,
                  repository: '' as Ref<GithubIntegrationRepository>
                },
                false,
                Date.now(),
                existing.modifiedBy
              )
            }
            continue
          }
          if (targetProject !== undefined) {
            // We need to sync into new project.
            await derivedClient.update<DocSyncInfo>(info, {
              external: null,
              current: null,
              url: '',
              needSync: '',
              externalVersion: '',
              githubNumber: 0,
              repository: null
            })
          }
        }

        if (info.deleted === true) {
          if (await mapper.handleDelete(existing, info, derivedClient, true)) {
            await derivedClient.remove(info)
            continue
          }
        }

        const docUpdate = await this.ctx.withLog(
          'sync doc',
          {},
          async (ctx) => await mapper.sync(existing, info, parent, derivedClient),
          { url: info.url.toLowerCase() }
        )
        if (docUpdate !== undefined) {
          await derivedClient.update(info, docUpdate)
        }
      } catch (err: any) {
        Analytics.handleError(err)
        this.ctx.error('failed to sync doc', { _id: info._id, objectClass: info.objectClass, error: err })
        // Mark to stop processing of document, before restart.
        await derivedClient.update<DocSyncInfo>(info, {
          error: errorToObj(err),
          needSync: githubSyncVersion,
          externalVersion: githubExternalSyncVersion
        })
      }
    }
  }

  private async waitChanges (): Promise<void> {
    if (this.triggerRequests > 0 || this.updateRequests > 0) {
      this.ctx.info('Trigger check pending:', {
        requests: this.triggerRequests,
        updates: this.updateRequests,
        workspace: this.workspace.name
      })
      this.triggerRequests = 0
      return
    }
    await new Promise<void>((resolve) => {
      let triggerTimeout: any
      let updateTimeout: any
      this.triggerSync = () => {
        const was0 = this.triggerRequests === 0
        this.triggerRequests++
        if (triggerTimeout === undefined) {
          triggerTimeout = setTimeout(() => {
            triggerTimeout = undefined
            if (was0) {
              this.ctx.info('Sync triggered', { request: this.triggerRequests, workspace: this.workspace.name })
            }
            resolve()
          }, 50) // Small timeout to aggregate few bulk changes.
        }
      }

      this.triggerUpdate = () => {
        const was0 = this.updateRequests === 0
        this.updateRequests++
        if (updateTimeout === undefined) {
          updateTimeout = setTimeout(() => {
            updateTimeout = undefined
            if (was0) {
              this.ctx.info('Sync update triggered', { requests: this.updateRequests, workspace: this.workspace.name })
            }
            resolve()
          }, 50) // Small timeout to aggregate few bulk changes.
        }
      }
      // Wait up for every 60 seconds to refresh, just in case.
      setTimeout(() => {
        resolve()
      }, 60 * 1000)
    })
  }

  sync (): void {
    this.triggerSync()
  }

  performFullSync = reduceCalls(async () => {
    await this._performFullSync()
  })

  async _performFullSync (): Promise<void> {
    // Wait previous active sync
    for (const integration of this.integrations.values()) {
      await this.ctx.withLog('external sync', { installation: integration.installationName }, async () => {
        if (!integration.enabled || integration.octokit === undefined) {
          return
        }

        const upd: DocumentUpdate<GithubIntegration> = {}
        if (integration.integration.byUser !== integration.login) {
          upd.byUser = integration.login
        }
        if (integration.integration.type !== integration.type) {
          upd.type = integration.type
        }
        if (integration.integration.clientId !== config.ClientID) {
          upd.clientId = config.ClientID
        }

        if (integration.integration.name !== integration.installationName || !integration.integration.alive) {
          upd.name = integration.installationName
          upd.alive = true
        }
        if (Object.keys(upd).length > 0) {
          await this._client.diffUpdate(integration.integration, upd, Date.now(), integration.integration.createdBy)
          this.triggerUpdate()
        }
        const derivedClient = new TxOperations(this.client, core.account.System, true)

        const { projects, repositories } = await this.collectActiveProjects()

        const _projects = projects.filter((it) => it.integration === integration.integration._id)
        const _prjIds = new Set(_projects.map((it) => it._id))
        const _repositories = repositories.filter((it) => it.githubProject != null && _prjIds.has(it.githubProject))

        // Cleanup broken synchronized documents

        while (true) {
          const withError = await derivedClient.findAll<any>(
            github.class.DocSyncInfo,
            { error: { $ne: null }, url: null },
            { limit: 50 }
          )
          if (withError.length === 0) {
            break
          }
          const ops = derivedClient.apply()
          for (const d of withError) {
            await ops.remove(d)
          }
          await ops.commit()
        }

        for (const { _class, mapper } of this.mappers) {
          await this.ctx.withLog('external sync', { _class: _class.join(', ') }, async () => {
            await mapper.externalFullSync(integration, derivedClient, _projects, _repositories)
          })
        }
      })
    }
  }

  async handleEvent<T>(requestClass: Ref<Class<Doc>>, integrationId: number | undefined, event: T): Promise<void> {
    if (integrationId === undefined) {
      return
    }
    const integration = this.integrations.get(integrationId)
    if (integration === undefined) {
      return
    }
    const derivedClient = new TxOperations(this.client, core.account.System, true)
    for (const { _class, mapper } of this.mappers) {
      if (_class.includes(requestClass)) {
        try {
          await mapper.handleEvent(integration, derivedClient, event)
        } catch (err: any) {
          Analytics.handleError(err)
          this.ctx.error('exception during processing of event:', { event, err })
        }
      }
    }
  }

  async getProjectAndRepository (
    repositoryId: string
  ): Promise<{ project?: GithubProject, repository?: GithubIntegrationRepository }> {
    const repository = await this.liveQuery.findOne<GithubIntegrationRepository>(
      github.class.GithubIntegrationRepository,
      { nodeId: repositoryId }
    )
    if (repository?.githubProject == null) {
      return {}
    }
    const project = await this.liveQuery.findOne(github.mixin.GithubProject, { _id: repository.githubProject })
    return { project, repository }
  }

  static async create (
    platformWorker: PlatformWorker,
    ctx: MeasureContext,
    installations: Map<number, InstallationRecord>,
    workspace: WorkspaceIdWithUrl,
    branding: Branding | null,
    app: App,
    storageAdapter: StorageAdapter,
    reconnect: (workspaceId: string, event: ClientConnectEvent) => void
  ): Promise<GithubWorker | undefined> {
    ctx.info('Connecting to', { workspace: workspace.workspaceUrl, workspaceId: workspace.workspaceName })
    let client: Client | undefined
    try {
      client = await createPlatformClient(workspace.name, 30000, (event: ClientConnectEvent) => {
        reconnect(workspace.name, event)
      })

      await GithubWorker.checkIntegrations(client, installations)

      const worker = new GithubWorker(
        ctx,
        platformWorker,
        installations,
        client,
        app,
        storageAdapter,
        workspace,
        branding
      )
      ctx.info('Init worker', { workspace: workspace.workspaceUrl, workspaceId: workspace.workspaceName })
      void worker.init()
      return worker
    } catch (err: any) {
      ctx.error('timeout during to connect', { workspace, error: err })
      await client?.close()
    }
  }

  static async checkIntegrations (client: Client, installations: Map<number, InstallationRecord>): Promise<void> {
    const wsIntegerations = await client.findAll(github.class.GithubIntegration, {})

    for (const intValue of wsIntegerations) {
      if (!installations.has(intValue.installationId)) {
        const ops = new TxOperations(client, core.account.System)
        await ops.remove<GithubIntegration>(intValue)
      }
    }
  }
}

export async function syncUser (
  ctx: MeasureContext,
  record: GithubUserRecord,
  userAuth: WithLookup<GithubAuthentication>,
  client: TxOperations,
  account: Ref<Account>
): Promise<void> {
  const okit = new Octokit({
    auth: record.token,
    client_id: config.ClientID,
    client_secret: config.ClientSecret
  })

  const details = await fetchViewerDetails(okit)

  const dta = {
    followers: details.viewer.followers.totalCount,
    following: details.viewer.following.totalCount,

    openIssues: details.viewer.openIssues.totalCount,
    closedIssues: details.viewer.closedIssues.totalCount,
    openPRs: details.viewer.openPRs.totalCount,
    mergedPRs: details.viewer.mergedPRs.totalCount,
    closedPRs: details.viewer.closedPRs.totalCount,

    repositories: details.viewer.repositories.totalCount,
    starredRepositories: details.viewer.starredRepositories.totalCount
  }

  await client.diffUpdate<GithubAuthentication>(
    userAuth,
    {
      email: details.viewer.email,
      url: details.viewer.url,
      name: details.viewer.name,
      bio: details.viewer.bio,
      location: details.viewer.location,
      company: details.viewer.company,
      avatar: details.viewer.avatarUrl,
      updatedAt: new Date(details.viewer.updatedAt ?? ''),
      repositoryDiscussions: details.viewer.repositoryDiscussions.totalCount,
      organizations: details.viewer.organizations,
      nodeId: details.viewer.id,
      ...dta
    },
    undefined,
    account
  )
}
