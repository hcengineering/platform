/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AccountClient } from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import chunter from '@hcengineering/chunter'
import { CollaboratorClient } from '@hcengineering/collaborator-client'
import contact, {
  AvatarType,
  Person,
  type Employee,
  type SocialIdentity,
  type SocialIdentityRef
} from '@hcengineering/contact'
import core, {
  AttachedDoc,
  Branding,
  Class,
  Client,
  ClientConnectEvent,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  FindResult,
  MeasureContext,
  PersonId,
  Ref,
  SocialIdType,
  SortingOrder,
  Space,
  Status,
  Tx,
  TxApplyIf,
  TxCUD,
  TxOperations,
  TxProcessor,
  TxWorkspaceEvent,
  WithLookup,
  WorkspaceEvent,
  WorkspaceUuid,
  buildSocialIdString,
  concatLink,
  generateId,
  groupByArray,
  reduceCalls,
  systemAccountUuid,
  toIdMap,
  withContext,
  type Blob,
  type Data,
  type MigrationState,
  type PersonUuid,
  type TimeRateLimiter,
  type WorkspaceIds
} from '@hcengineering/core'
import github, {
  DocSyncInfo,
  GithubAuthentication,
  GithubIntegration,
  GithubIntegrationRepository,
  GithubIssue,
  GithubProject,
  githubId,
  type GithubUserInfo
} from '@hcengineering/github'
import { LiveQuery } from '@hcengineering/query'
import { getAccountClient } from '@hcengineering/server-client'
import { StorageAdapter } from '@hcengineering/server-core'
import { getPublicLinkUrl } from '@hcengineering/server-guest-resources'
import { generateToken } from '@hcengineering/server-token'
import task, { ProjectType, TaskType } from '@hcengineering/task'
import { MarkupNode, MarkupNodeType, jsonToMarkup } from '@hcengineering/text'
import { isMarkdownsEquals } from '@hcengineering/text-markdown'
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
import { PullRequestSyncManager } from './sync/pullrequests'
import { RepositorySyncMapper } from './sync/repository'
import { ReviewCommentSyncManager } from './sync/reviewComments'
import { ReviewThreadSyncManager } from './sync/reviewThreads'
import { ReviewSyncManager } from './sync/reviews'
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

  authRequestSend = new Set<PersonId>()

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

  isClosing (): boolean {
    return this.closing
  }

  async close (): Promise<void> {
    clearInterval(this.periodicTimer)

    this.closing = true
    this.ctx.warn('Closing', { workspace: this.workspace })
    this.triggerSync()
    await Promise.all([await this.syncPromise, new Promise<void>((resolve) => setTimeout(resolve, 5000))])

    this.ctx.warn('Closing Done', { workspace: this.workspace })
    await this.client.close()
  }

  async refreshClient (clean: boolean): Promise<void> {
    await this.liveQuery.refreshConnect(clean)
  }

  getWorkspaceId (): WorkspaceUuid {
    return this.workspace.uuid
  }

  getWorkspaceUrl (): string {
    return this.workspace.url
  }

  getBranding (): Branding | null {
    return this.branding
  }

  async reloadRepositories (ctx: MeasureContext, installationId: number): Promise<void> {
    const current = this.integrations.get(installationId)
    if (current !== undefined) {
      await this.repositoryManager.reloadRepositories(ctx, current)
      this.triggerUpdate()
    }
  }

  async checkMarkdownConversion (
    container: IntegrationContainer,
    body: string
  ): Promise<{ markdownCompatible: boolean, markdown: string }> {
    const markupText = await this.getMarkup(container, body)
    const markdown = await this.getMarkdown(markupText)
    const markdownCompatible = isMarkdownsEquals(body, markdown)
    return { markdownCompatible, markdown }
  }

  async getMarkupSafe (
    container: IntegrationContainer,
    text?: string | null,
    preprocessor?: (nodes: MarkupNode) => Promise<void>
  ): Promise<string> {
    if (text == null) {
      return ''
    }

    const markup = await this.getMarkup(container, text, preprocessor)
    const markdown = await this.getMarkdown(markup)
    const compatible = isMarkdownsEquals(text, markdown)

    return compatible
      ? markup
      : jsonToMarkup({
        type: MarkupNodeType.doc,
        content: [
          {
            type: MarkupNodeType.markdown,
            content: [
              {
                type: MarkupNodeType.text,
                text
              }
            ]
          }
        ]
      })
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
    const refUrl = concatLink(frontUrl, `/browse/?workspace=${this.workspace.uuid}`)
    // TODO storage URL
    const imageUrl = concatLink(frontUrl ?? config.FrontURL, `/files?workspace=${this.workspace.uuid}&file=`)
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
      concatLink(this.getBranding()?.front ?? config.FrontURL, `/browse/?workspace=${this.workspace.uuid}`),
      // TODO storage URL
      concatLink(this.getBranding()?.front ?? config.FrontURL, `/files/${this.workspace.uuid}/`),
      preprocessor
    )
  }

  async getContainer (space: Ref<Space>): Promise<ContainerFocus | undefined> {
    const project = await this.liveQuery.findOne<GithubProject>(github.mixin.GithubProject, {
      _id: space as Ref<GithubProject>
    })
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

  async getRepositoryById (
    _id?: Ref<GithubIntegrationRepository> | null
  ): Promise<GithubIntegrationRepository | undefined> {
    if (_id != null) {
      return await this.liveQuery.findOne<GithubIntegrationRepository>(github.class.GithubIntegrationRepository, {
        _id
      })
    }
  }

  async getAccountU (user?: User): Promise<PersonId | undefined> {
    if (user == null) {
      return undefined
    }
    return await this.getAccount({
      id: user.node_id,
      login: user.login,
      avatarUrl: user.avatar_url,
      email: user.email ?? undefined,
      name: user.name
    })
  }

  accountMap = new Map<string, PersonId | undefined | Promise<PersonId | undefined>>()
  async getAccount (userInfo?: UserInfo | null): Promise<PersonId | undefined> {
    if (userInfo?.login == null) {
      return
    }
    const info = this.accountMap.get(userInfo?.login ?? '')
    if (info !== undefined) {
      if (info instanceof Promise) {
        const p = await info
        this.accountMap.set(userInfo?.login, p)
        return p
      }
      return info
    }
    const p = this._getAccountRaw(userInfo)
    this.accountMap.set(userInfo?.login ?? '', p)
    return await p
  }

  async _getAccountRaw (userInfo?: UserInfo | null): Promise<PersonId | undefined> {
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

    const normalizedLogin = userInfo.login.toLowerCase()
    const infos = await this.liveQuery.findOne(github.class.GithubUserInfo, { login: normalizedLogin })
    if (infos === undefined) {
      await this._client.createDoc(github.class.GithubUserInfo, contact.space.Contacts, {
        ...userInfo,
        login: normalizedLogin
      })
    }

    // Find a local social id already existing
    const existingSocialId = await this._client.findOne(contact.class.SocialIdentity, {
      type: SocialIdType.GITHUB,
      value: userInfo.login.toLowerCase()
    })

    if (existingSocialId !== undefined) {
      return existingSocialId?._id
    }

    const { uuid, socialId } = await this.accountClient.ensurePerson(
      SocialIdType.GITHUB,
      userInfo.login.toLowerCase(),
      userInfo.name ?? userInfo.login,
      ''
    )
    const person: Ref<Person> | undefined = await this.findPerson(userInfo, userName, uuid)
    // We need to find or create a local person for uuid if missing.

    // We need to create social id github account
    await this._client.addCollection(
      contact.class.SocialIdentity,
      contact.space.Contacts,
      person,
      contact.class.Person,
      'socialIds',
      {
        type: SocialIdType.GITHUB,
        value: userInfo.login.toLowerCase(),
        key: buildSocialIdString({
          type: SocialIdType.GITHUB,
          value: userInfo.login.toLowerCase()
        })
      },
      socialId as SocialIdentityRef
    )

    return socialId
  }

  accountClient: AccountClient

  private constructor (
    readonly ctx: MeasureContext,
    readonly limiter: TimeRateLimiter,
    readonly platform: PlatformWorker,
    readonly installations: Map<number, InstallationRecord>,
    readonly client: Client,
    readonly app: App,
    readonly storageAdapter: StorageAdapter,
    readonly workspace: WorkspaceIds,
    readonly branding: Branding | null,
    readonly periodicSyncInterval = 60 * 60 * 1000
  ) {
    const token = generateToken(systemAccountUuid, this.workspace.uuid, { service: 'github', mode: 'github' })
    this.accountClient = getAccountClient(token, 30000)

    this._client = new TxOperations(this.client, core.account.System)
    this.liveQuery = new LiveQuery(client)

    this.repositoryManager = new RepositorySyncMapper(this._client, this.app)

    this.collaborator = createCollaboratorClient(this.workspace.uuid)

    this.personMapper = new UsersSyncManager(
      this.ctx.newChild('users', {}, { span: false }),
      this._client,
      this.liveQuery
    )

    this.mappers = [
      { _class: [github.mixin.GithubProject], mapper: this.repositoryManager },
      {
        _class: [tracker.class.Issue],
        mapper: new IssueSyncManager(this._client, this.liveQuery, this.collaborator)
      },
      {
        _class: [github.class.GithubPullRequest],
        mapper: new PullRequestSyncManager(this._client, this.liveQuery, this.collaborator)
      },
      {
        _class: [chunter.class.ChatMessage],
        mapper: new CommentSyncManager(this._client, this.liveQuery)
      },
      // {
      //   _class: [contact.class.PersonAccount],
      //   mapper: this.personMapper
      // },
      {
        _class: [github.class.GithubReview],
        mapper: new ReviewSyncManager(this._client, this.liveQuery)
      },
      {
        _class: [github.class.GithubReviewThread],
        mapper: new ReviewThreadSyncManager(this._client, this.liveQuery)
      },
      {
        _class: [github.class.GithubReviewComment],
        mapper: new ReviewCommentSyncManager(this._client, this.liveQuery)
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
      this.triggerUpdate()
    } catch (err: any) {
      Analytics.handleError(err)
    }

    this.periodicSyncPromise = undefined
  }

  private async findPerson (userInfo: UserInfo, userName: string, uuid: PersonUuid): Promise<Ref<Person>> {
    let person: Ref<Person> | undefined
    // try to find by account.
    if (userInfo.email != null && userInfo.email.trim().length > 0) {
      const personAccount = await this.client.findOne(contact.class.SocialIdentity, {
        type: SocialIdType.EMAIL,
        value: userInfo.email.toLowerCase()
      })
      person = personAccount?.attachedTo
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
        attachments: 0,
        personUuid: uuid
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
    const personRef = await this.client.findOne(contact.class.Person, { _id: person })
    if (personRef === undefined) {
      return
    }
    const accounts = await this.client.findAll(contact.class.SocialIdentity, {
      type: SocialIdType.GITHUB,
      attachedTo: personRef._id
    })
    if (accounts.length === 0) {
      return // Nobody, will use system account.
    }
    const info = await this.client.findOne(github.class.GithubUserInfo, {
      login: { $in: accounts.map((it) => it.value) }
    })
    if (info?.id === undefined) {
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
          login: accounts[0].value
        }
      )
      const infoData = response.user
      const normalizedInfoData: Data<GithubUserInfo> = {
        ...infoData,
        login: infoData.login?.toLowerCase()
      }
      if (info == null) {
        await this._client.createDoc(github.class.GithubUserInfo, contact.space.Contacts, normalizedInfoData)
      } else {
        await this._client.diffUpdate(info, {
          ...normalizedInfoData
        })
      }
    }
    return info
  }

  async syncUserData (ctx: MeasureContext): Promise<void> {
    // Let's sync information about users and send some details
    const accounts = await ctx.with('find-social-id', {}, () =>
      this._client.findAll(contact.class.SocialIdentity, {
        type: SocialIdType.GITHUB
      })
    )
    const userAuths = await ctx.with('find-github-auths', {}, () =>
      this._client.findAll(github.class.GithubAuthentication, {})
    )
    const persons = await ctx.with('find-persons', {}, () =>
      this._client.findAll(contact.class.Person, {
        _id: { $in: accounts.map((it) => it.attachedTo) }
      })
    )
    for (const account of accounts) {
      const userAuth = userAuths.find((it) => it.login === account.value)
      const person = persons.find((it) => account?.attachedTo)
      if (account === undefined || userAuth === undefined || person === undefined) {
        continue
      }
      const record = await this.platform.getUser(account.value)
      if (record === undefined) {
        continue
      }
      try {
        await this.platform.checkRefreshToken(ctx, record, true)

        const ops = new TxOperations(this.client, account._id)
        await syncUser(ctx, record, userAuth, ops, account._id)
      } catch (err: any) {
        try {
          await this.platform.revokeUserAuth(ctx, record)
        } catch (err: any) {
          ctx.error(`Failed to revoke user ${record._id}`, err)
        }
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
            account._id
          )
        }
      }
    }
  }

  @withContext('get-octokit')
  async getOctokit (ctx: MeasureContext, account: PersonId): Promise<Octokit | undefined> {
    let record = await this.platform.getAccountByRef(this.workspace.uuid, account)

    if (record === undefined) {
      const accountRef = await ctx.with('find-social-id', {}, () =>
        this._client.findOne(contact.class.SocialIdentity, { _id: account as any })
      )
      if (accountRef !== undefined) {
        const accounts = await ctx.with('find-accounts', {}, () =>
          this._client.findAll(contact.class.SocialIdentity, { attachedTo: accountRef.attachedTo })
        )
        for (const aa of accounts) {
          record = await this.platform.getAccountByRef(this.workspace.uuid, aa._id)
          if (record !== undefined) {
            this.platform.userManager.cacheRecord(this.workspace.uuid, account, record)
            break
          }
        }
      }
    }
    // Check and refresh token if required.
    if (record !== undefined) {
      ctx.info('get octokit', { account, recordId: record._id, workspace: this.workspace.uuid })
      if (!(await this.platform.checkRefreshToken(ctx, record))) {
        record.octokit = undefined
      }
      if (record.octokit !== undefined) {
        return record.octokit
      }

      record.octokit = ctx.withSync(
        'create-octokit',
        {},
        () =>
          new Octokit({
            auth: record.token,
            client_id: config.ClientID,
            client_secret: config.ClientSecret
          })
      )
      return record.octokit
    }

    // We need to inform user, he need to authorize this account with github.
    // TODO: Inform user it need authenticsion
    if (!this.authRequestSend.has(account)) {
      this.authRequestSend.add(account)
      const socialId = await ctx.with('find-social-id', {}, () =>
        this._client.findOne(contact.class.SocialIdentity, { _id: account as any })
      )
      if (socialId !== undefined) {
        const personSpace = await ctx.with('find-person-space', {}, () =>
          this.liveQuery.findOne(contact.class.PersonSpace, { person: socialId.attachedTo })
        )
        const person = await ctx.with('find-person', {}, () =>
          this._client.findOne(contact.mixin.Employee, { _id: socialId.attachedTo as Ref<Employee> })
        )
        if (personSpace !== undefined && person !== undefined) {
          // We need to remove if user has authentication in workspace but doesn't have a record.

          const allSocialId = await ctx.with('find-all-social-ids', {}, () =>
            this._client.findAll(contact.class.SocialIdentity, {
              attachedTo: personSpace.person
            })
          )

          const authentications = await ctx.with('find-authentications', {}, () =>
            this.liveQuery.findAll(github.class.GithubAuthentication, {
              createdBy: { $in: allSocialId.map((it) => it._id) }
            })
          )
          for (const auth of authentications) {
            await this._client.remove(auth)
          }

          if (person.personUuid !== undefined) {
            await createNotification(this._client, person, {
              user: person.personUuid,
              space: personSpace._id,
              message: github.string.AuthenticatedWithGithubRequired,
              props: {}
            })
          }
        }
      }
    }
    this.ctx.info('get octokit: return bot', { account, workspace: this.workspace.uuid })
  }

  async isPlatformUser (account: PersonId): Promise<boolean> {
    let record = await this.platform.getAccountByRef(this.workspace.uuid, account)
    let accountRef: Employee | undefined
    if (record === undefined) {
      const socialId = await this._client.findOne(contact.class.SocialIdentity, { _id: account as any })
      if (socialId !== undefined) {
        accountRef = await this._client.findOne(contact.mixin.Employee, { _id: socialId?.attachedTo as Ref<Employee> })
        if (accountRef !== undefined) {
          const socialIds = await this._client.findAll(contact.class.SocialIdentity, { attachedTo: accountRef._id })
          for (const aa of socialIds) {
            record = await this.platform.getAccountByRef(this.workspace.uuid, aa._id)
            if (record !== undefined) {
              break
            }
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

    const statuses = this.client.getModel().findAllSync(core.class.Status, {})

    const projectType = await this.getProjectType(type)

    const allowedTypes = new Set(projectType?.statuses.map((it) => it._id) ?? [])
    return statuses.filter((it) => allowedTypes.has(it._id))
  }

  async getStatuses (type: Ref<TaskType> | undefined): Promise<Status[]> {
    if (type === undefined) return []
    const taskType = await this.getTaskType(type)

    const statuses = this.client.getModel().findAllSync(core.class.Status, {})

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
                m.mapper.repositoryDisabled(this.ctx, i, r)
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
    try {
      await this.syncUserData(this.ctx)
    } catch (err: any) {
      Analytics.handleError(err)
    }
  }

  projects: GithubProject[] = []

  async queryProjects (): Promise<void> {
    await new Promise<void>((resolve) => {
      this.liveQuery.query(
        github.mixin.GithubProject,
        {
          archived: false
        },
        (res) => {
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
        }
      )
    })
  }

  async updateIntegrations (ctx: MeasureContext): Promise<void> {
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
            enabled: !inst.suspended,
            synchronized: new Set(),
            syncLock: new Map()
          }
          this.integrations.set(it.installationId, current)
          await this.repositoryManager.reloadRepositories(ctx, current, inst.repositories)
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
        await this.repositoryManager.reloadRepositories(ctx, current, inst.repositories)
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
            if (TxProcessor.isExtendsCUD(t._class)) {
              const cud = t as TxCUD<Doc>
              if (cud.objectClass === github.class.DocSyncInfo) {
                this.triggerSync()
                break
              }
              if (cud.objectClass === contact.class.Person || cud.objectClass === contact.class.Channel) {
                this.accountMap.clear()
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
    const updateAccounts = async (accounts: SocialIdentity[]): Promise<void> => {
      const persons = await this.liveQuery.findAll(contact.class.Person, {
        _id: { $in: accounts.map((it) => it.attachedTo) }
      })
      const h = this.client.getHierarchy()
      for (const a of accounts) {
        const login = a.value
        const person = persons.find((it) => it._id === a.attachedTo)
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
    await new Promise<void>((resolve, reject) => {
      this.liveQuery.query(contact.class.SocialIdentity, { type: SocialIdType.GITHUB }, (res) => {
        void updateAccounts(res).then(resolve).catch(reject)
      })
    })
  }

  async performExternalSync (
    ctx: MeasureContext,
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

      ctx.info('External Syncing', {
        name: repo.name,
        prj: prj.name,
        field,
        version,
        docs: docs.length,
        workspace: this.workspace.uuid
      })

      const byClass = this.groupByClass(docs)
      for (const [_class, _docs] of byClass.entries()) {
        const mapper = this.mappers.find((it) => it._class.includes(_class))?.mapper
        try {
          await mapper?.externalSync(ctx, integration, derivedClient, field, _docs, repo, prj)
        } catch (err: any) {
          Analytics.handleError(err)
          ctx.error('failed to perform external sync', err)
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
    const migrations = await this.client.findAll<MigrationState>(core.class.MigrationState, {})

    const derivedClient = new TxOperations(this.client, core.account.System, true)

    if (migrations.find((it) => it.plugin === githubId && it.state === key) === undefined) {
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

    const wrongAuthentications = 'migrate-wrong-authentications'

    if (migrations.find((it) => it.plugin === githubId && it.state === wrongAuthentications) === undefined) {
      const auths = await this.client.findAll(github.class.GithubAuthentication, {})
      for (const auth of auths) {
        if (auth.createdBy !== auth.modifiedBy) {
          await this._client.remove(auth)
        }
      }
      await derivedClient.createDoc(core.class.MigrationState, core.space.Configuration, {
        plugin: githubId,
        state: wrongAuthentications
      })
    }

    const fixWrongLastGithubAccount = 'migrate-lastGithubAccount'

    if (migrations.find((it) => it.plugin === githubId && it.state === fixWrongLastGithubAccount) === undefined) {
      while (true) {
        const syncInfos = await this.client.findAll(
          github.class.DocSyncInfo,
          { lastGithubUser: { $ne: null } },
          { limit: 500 }
        )
        if (syncInfos.length === 0) {
          break
        }
        const ops = this._client.apply()
        for (const auth of syncInfos) {
          await ops.update(auth, { lastGithubUser: null })
        }
        await ops.commit()
      }
      await derivedClient.createDoc(core.class.MigrationState, core.space.Configuration, {
        plugin: githubId,
        state: fixWrongLastGithubAccount
      })
    }
  }

  async syncAndWait (): Promise<void> {
    this.updateRequests = 1

    await this.applyMigrations()
    while (!this.closing) {
      if (this.updateRequests > 0) {
        this.updateRequests = 0 // Just in case
        await this.ctx.with('update-integrations', {}, (ctx) => this.updateIntegrations(ctx))
        void this.ctx.with('performFullSync', {}, (ctx) =>
          this.performFullSync(ctx).catch((err) => {
            this.ctx.error('Failed to perform full sync', { error: err })
          })
        )
      }
      try {
        const { projects, repositories } = await this.collectActiveProjects()
        if (projects.length === 0 && repositories.length === 0) {
          await this.waitChanges()
          continue
        }

        // Check if we have documents with external sync request's pending.
        const hadExternalChanges = await this.ctx.with('performExternalSync', {}, (ctx) =>
          this.performExternalSync(ctx, projects, repositories, 'externalVersion', githubExternalSyncVersion)
        )
        const hadSyncChanges = await this.ctx.with('performSync', {}, (ctx) =>
          this.performSync(ctx, projects, repositories)
        )

        // Perform derived operations
        // Sync derived external data, like pull request reviews, files etc.
        const hadDerivedChanges = await this.ctx.with('performDerivedSync', {}, (ctx) =>
          this.performExternalSync(ctx, projects, repositories, 'derivedVersion', githubDerivedSyncVersion)
        )

        if (!hadExternalChanges && !hadSyncChanges && !hadDerivedChanges) {
          if (this.previousWait !== 0) {
            this.ctx.info('Wait for changes:', { previousWait: this.previousWait, workspace: this.workspace.url })
            this.previousWait = 0
          }
          // Wait until some sync documents will be modified, updated.
          await this.waitChanges()
        }
      } catch (err: any) {
        this.ctx.error('failed to perform sync', { err, workspace: this.workspace.url })
      }
    }
  }

  private async performSync (
    ctx: MeasureContext,
    projects: GithubProject[],
    repositories: Pick<GithubIntegrationRepository, '_id'>[]
  ): Promise<boolean> {
    const _projects = toIdMap(projects)
    const _repositories = repositories.map((it) => it._id)

    const docs = await this.limiter.exec(
      async () =>
        await ctx.with(
          'find-doc-sync-info',
          {},
          (ctx) =>
            this._client.findAll<DocSyncInfo>(
              github.class.DocSyncInfo,
              {
                needSync: { $ne: githubSyncVersion },
                externalVersion: { $in: [githubExternalSyncVersion, '#'] },
                space: { $in: Array.from(_projects.keys()) },
                repository: { $in: [null, ..._repositories] }
              },
              {
                limit: 50
              }
            ),
          { _projects, _repositories }
        )
    )

    //

    if (docs.length > 0) {
      this.previousWait += docs.length
      ctx.info('Syncing', { docs: docs.length, workspace: this.workspace.uuid })

      const bySpace = groupByArray(docs, (it) => it.space)
      for (const [k, v] of bySpace.entries()) {
        await this.doSyncFor(ctx, v, _projects.get(k as Ref<GithubProject>) as GithubProject)
      }
    }
    return docs.length !== 0
  }

  async doSyncFor (ctx: MeasureContext, docs: DocSyncInfo[], project: GithubProject): Promise<void> {
    const byClass = this.groupByClass(docs)

    // We need to reorder based on our sync mappers

    for (const [_class, clDocs] of byClass.entries()) {
      await this.syncClass(ctx, _class, clDocs, project)
    }
  }

  private async collectActiveProjects (): Promise<{
    projects: GithubProject[]
    repositories: GithubIntegrationRepository[]
  }> {
    const projects: GithubProject[] = []
    const repositories: GithubIntegrationRepository[] = []

    const allProjects = await this.liveQuery.findAll<GithubProject>(github.mixin.GithubProject, {
      archived: false
    })
    const allRepositories = (await this.liveQuery.findAll(github.class.GithubIntegrationRepository, {})).filter(
      (it) => it.enabled
    )

    for (const it of Array.from(this.integrations.values())) {
      if (it.enabled) {
        const _projects = []
        for (const p of allProjects) {
          if (p.integration === it.integration._id) {
            _projects.push(p)
          }
        }

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
    const installations = new Map<number, PersonId>()
    for (const integeration of this.platform.integrations.filter((it) => it.workspace === this.workspace.uuid)) {
      for (const installationId of integeration.installationId) {
        installations.set(installationId, integeration.accountId)
      }
    }
    for (const [installationId, accountId] of installations.entries()) {
      const integration = await this._client.findOne(github.class.GithubIntegration, {
        installationId
      })
      const installation = this.installations.get(installationId) as InstallationRecord
      if (integration === undefined && installation !== undefined) {
        await this._client.createDoc(
          github.class.GithubIntegration,
          core.space.Configuration,
          {
            alive: !installation.suspended,
            installationId,
            clientId: config.ClientID,
            name: installation.installationName,
            nodeId: installation.loginNodeId,
            repositories: 0
          },
          generateId(),
          Date.now(),
          accountId
        )
        this.triggerUpdate()
      } else if (integration !== undefined) {
        await this._client.diffUpdate(integration, {
          alive: !installation.suspended
        })
      }
    }
  }

  async syncClass (
    ctx: MeasureContext,
    _class: Ref<Class<Doc>>,
    syncInfo: DocSyncInfo[],
    project: GithubProject
  ): Promise<void> {
    const externalDocs = await this._client.findAll<Doc>(_class, {
      _id: { $in: syncInfo.map((it) => it._id as Ref<Doc>) }
    })

    const parents = await this._client.findAll<DocSyncInfo>(github.class.DocSyncInfo, {
      space: project._id,
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
      await this.limiter.exec(async () => {
        try {
          const existing = externalDocs.find((it) => it._id === info._id)
          const mapper = this.mappers.find((it) => it._class.includes(info.objectClass))?.mapper
          if (mapper === undefined) {
            this.ctx.info('No mapper for class', { objectClass: info.objectClass, workspace: this.workspace.uuid })
            await derivedClient.update<DocSyncInfo>(info, {
              needSync: githubSyncVersion
            })
            return
          }
          const repo = await this.getRepositoryById(info.repository)
          if (repo !== undefined && !repo.enabled) {
            return
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
            try {
              if (await mapper.handleDelete(ctx, existing, info, derivedClient, false, parent)) {
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
                return
              }
            } catch (err: any) {
              this.ctx.error('failed to handle delete', { err })
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
            try {
              if (await mapper.handleDelete(ctx, existing, info, derivedClient, true)) {
                await derivedClient.remove(info)
              }
            } catch (err: any) {
              this.ctx.error('failed to handle delete', { err })
            }
            return
          }

          const docUpdate = await ctx.with(
            'sync doc',
            {},
            (ctx) => mapper.sync(ctx, existing, info, parent, derivedClient),
            {
              url: info.url.toLowerCase(),
              workspace: this.workspace.uuid,
              existing: existing !== undefined,
              objectClass: info.objectClass
            },
            { log: true }
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
      })
    }
  }

  private async waitChanges (): Promise<void> {
    if (this.closing) {
      return
    }
    if (this.triggerRequests > 0 || this.updateRequests > 0) {
      this.ctx.info('Trigger check pending:', {
        requests: this.triggerRequests,
        updates: this.updateRequests,
        workspace: this.workspace.uuid
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
              this.ctx.info('Sync triggered', { request: this.triggerRequests, workspace: this.workspace.uuid })
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
              this.ctx.info('Sync update triggered', { requests: this.updateRequests, workspace: this.workspace.uuid })
            }
            resolve()
          }, 50) // Small timeout to aggregate few bulk changes.
        }
      }
    })
  }

  sync (): void {
    this.triggerSync()
  }

  performFullSync = reduceCalls(async (ctx: MeasureContext) => {
    try {
      await this._performFullSync(ctx)
    } catch (err: any) {
      this.ctx.error('Failed to perform full sync', { error: err })
    }
  })

  async _performFullSync (ctx: MeasureContext): Promise<void> {
    // Wait previous active sync
    for (const integration of this.integrations.values()) {
      if (this.closing) {
        break
      }
      await ctx.with(
        'external sync',
        {},
        async (ctx) => {
          const enabled = integration.enabled && integration.octokit !== undefined

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

          if (integration.integration.name !== integration.installationName) {
            upd.name = integration.installationName
          }
          if (integration.integration.alive !== enabled) {
            upd.alive = enabled
          }
          if (Object.keys(upd).length > 0) {
            await this._client.diffUpdate(integration.integration, upd, Date.now(), integration.integration.createdBy)
            this.triggerUpdate()
          }
          if (!enabled) {
            return
          }
          const derivedClient = new TxOperations(this.client, core.account.System, true)

          const { projects, repositories } = await this.collectActiveProjects()

          const _projects = projects.filter((it) => it.integration === integration.integration._id)
          const _prjIds = new Set(_projects.map((it) => it._id))
          const _repositories = repositories.filter((it) => it.githubProject != null && _prjIds.has(it.githubProject))

          // Cleanup broken synchronized documents

          while (true) {
            if (this.closing) {
              break
            }
            const withError = await ctx.with('find-docSyncInfo', {}, () =>
              derivedClient.findAll<any>(github.class.DocSyncInfo, { error: { $ne: null }, url: null }, { limit: 50 })
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

          while (true) {
            if (this.closing) {
              break
            }
            const withError = await ctx.with('find-docSyncInfo-errors', {}, () =>
              derivedClient.findAll<any>(github.class.DocSyncInfo, { error: { $ne: null } }, { limit: 50 })
            )

            if (withError.length === 0) {
              break
            }
            const ops = derivedClient.apply()
            for (const d of withError) {
              const errStr = JSON.stringify(d.error)
              // Skip this error's and not retry
              const skipError =
                errStr.includes('Bad credentials') ||
                errStr.includes('Resource not accessible by integration') ||
                errStr.includes('does not have permission to update') ||
                errStr.includes('State cannot be changed') ||
                errStr.includes('Not Found') ||
                errStr.includes('Could not resolve to a node with the global') ||
                errStr.includes('Body is too long, Body is too long')

              await ops.update(d, { error: null, needSync: skipError ? githubSyncVersion : '' })
            }
            await ctx.with('commit-errors-docsync-info', {}, () => ops.commit())
          }

          for (const { _class, mapper } of this.mappers) {
            if (this.closing) {
              break
            }
            await ctx.with(
              'mapper external sync',
              {},
              async (ctx) => {
                await mapper.externalFullSync(ctx, integration, derivedClient, _projects, _repositories)
              },
              { installation: integration.installationName, workspace: this.workspace.uuid },
              { log: true }
            )
          }
        },
        { installation: integration.installationName, workspace: this.workspace.uuid },
        { log: true }
      )
    }
  }

  async handleEvent<T>(
    ctx: MeasureContext,
    requestClass: Ref<Class<Doc>>,
    integrationId: number | undefined,
    event: T
  ): Promise<void> {
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
          await mapper.handleEvent(ctx, integration, derivedClient, event)
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
    workspace: WorkspaceIds,
    branding: Branding | null,
    app: App,
    storageAdapter: StorageAdapter
  ): Promise<GithubWorker | undefined> {
    ctx.info('Connecting to', { workspace })
    let client: Client | undefined
    let endpoint: string | undefined
    let maitenanceState = false
    let worker: GithubWorker | undefined
    try {
      ;({ client, endpoint } = await createPlatformClient(
        ctx,
        workspace.uuid,
        30000,
        async (event: ClientConnectEvent) => {
          if (event === ClientConnectEvent.Maintenance) {
            await client?.close()
            maitenanceState = true
            throw new Error('Workspace in maintenance')
          }
          if (worker !== undefined) {
            platformWorker.checkReconnect(workspace.uuid, event, worker)
          }
        }
      ))
      ctx.info('connected to github', { workspace: workspace.uuid, endpoint })

      const githubEnabled = (await client.findOne(core.class.PluginConfiguration, { pluginId: githubId }))?.enabled
      if (githubEnabled === false) {
        return undefined
      }

      await GithubWorker.checkIntegrations(client, installations)

      worker = new GithubWorker(
        ctx,
        platformWorker.getRateLimiter(endpoint ?? ''),
        platformWorker,
        installations,
        client,
        app,
        storageAdapter,
        workspace,
        branding
      )
      ctx.info('Init worker', { workspace: workspace.url, workspaceId: workspace.uuid })
      void worker.init().catch((err) => {
        ctx.error('failed to init worker', { error: err, workspace: workspace.uuid })
        void client?.close().catch((err) => {
          ctx.error('failed to close client after init error', { error: err, workspace: workspace.uuid })
        })
      })
      return worker
    } catch (err: any) {
      await client?.close()
      void worker?.close()
      if (maitenanceState) {
        ctx.info('workspace in maintenance, schedule recheck', { workspace: workspace.uuid, endpoint })
        return
      }
      ctx.error('timeout during to connect', { workspace, error: err })
      return undefined
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
  account: PersonId
): Promise<void> {
  const okit =
    record.octokit ??
    new Octokit({
      auth: record.token,
      client_id: config.ClientID,
      client_secret: config.ClientSecret
    })
  record.octokit = okit

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
      ...dta,
      error: null
    },
    undefined,
    account
  )
}
