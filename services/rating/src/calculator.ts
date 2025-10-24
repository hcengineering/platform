/* eslint-disable @typescript-eslint/unbound-method */
import { Api as CommunicationApi } from '@hcengineering/communication-server'
import contact, { type Person, type SocialIdentity } from '@hcengineering/contact'
import core, {
  type AccountUuid,
  type Class,
  type Doc,
  type Domain,
  DOMAIN_MIGRATION,
  DOMAIN_TX,
  generateId,
  groupByArray,
  Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type MigrationState,
  ModelDb,
  type PersonId,
  type Ref,
  SortingOrder,
  systemAccount,
  systemAccountUuid,
  type Timestamp,
  toIdMap,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  type TxMixin,
  TxProcessor,
  type TxRemoveDoc,
  type TxUpdateDoc,
  type WorkspaceIds
} from '@hcengineering/core'
import {
  ContextNameMiddleware,
  DBAdapterInitMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  DomainTxMiddleware,
  LowLevelMiddleware,
  ModelMiddleware
} from '@hcengineering/middleware'
import { _parseId, type Id, PlatformError, unknownError } from '@hcengineering/platform'
import {
  type ConsumerControl,
  createDummyStorageAdapter,
  createPipeline,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext
} from '@hcengineering/server-core'
import { getConfig } from '@hcengineering/server-pipeline'

import { type AccountClient } from '@hcengineering/account-client'
import rating, {
  type DocReaction,
  DOMAIN_PERSON_RATING,
  DOMAIN_RATING_REACTION,
  type PersonRating,
  ratingId,
  ReactionKind
} from '@hcengineering/rating'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { LRUCache } from 'lru-cache'
import { calculatePersonRating, fulltextModelFilter, getRatingDomains } from './utils'

export const DOMAIN_CONTACT = 'contact' as Domain
export const DOMAIN_CHANNEL = 'channel' as Domain

export class RatingCalculator {
  pipeline!: Pipeline

  ctx!: MeasureContext

  lastUpdate: number = Date.now()

  operations: number = 0
  closing: boolean = false

  communicationApi: CommunicationApi | undefined

  modifiedPersons = new Map<AccountUuid, PersonRating>()

  // Hold person's not in weak cache.
  persons = new LRUCache<AccountUuid, PersonRating>({
    maxSize: 100,
    sizeCalculation: (value) => 1,
    dispose: (value) => {},
    ttl: 0,
    ttlAutopurge: false
  })

  socialIdTo = new Map<PersonId, AccountUuid>()

  lowLevelStorage!: LowLevelStorage

  token!: string
  transactorEndpoint?: string

  accountClient!: AccountClient

  flushTimeout: NodeJS.Timeout | null = null

  // If threshold of last update and new update is less 100ms, ignore rank update.
  rageAccounts = new LRUCache<AccountUuid, number>(
    new LRUCache({
      maxSize: 10000,
      sizeCalculation: (value) => 1,
      dispose: (value) => {},
      ttl: 0,
      ttlAutopurge: false
    })
  )

  ratingDomains = new Map<Domain, Set<Ref<Class<Doc>>>>()

  sendTxToTransactor (tx: Tx[]): void {
    if (this.transactorEndpoint === '') {
      return
    }
    void fetch(this.transactorEndpoint + `/api/v1/broadcast?workspace=${this.pipeline.context.workspace.uuid}`, {
      method: 'PUT',
      keepalive: true,
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(tx)
    }).catch((err) => {
      this.ctx.error('failed to send broadcast', { err })
    })
  }

  static async create (
    ctx: MeasureContext,
    model: Tx[],
    workspace: WorkspaceIds,
    dbURL: string,
    endpointProvider: (token: string) => Promise<string | undefined>,
    control?: ConsumerControl
  ): Promise<RatingCalculator> {
    const result = new RatingCalculator()
    result.ctx = ctx
    const externalStorage = createDummyStorageAdapter() // Use real storage, since we need to obtain communication resources, etc.
    const dbConf = getConfig(ctx, dbURL, ctx, {
      disableTriggers: true,
      externalStorage
    })

    const middlewares: MiddlewareCreator[] = [
      LowLevelMiddleware.create,
      ContextNameMiddleware.create,
      DomainFindMiddleware.create,
      DomainTxMiddleware.create, // since we need to process rating transactions
      DBAdapterInitMiddleware.create,
      ModelMiddleware.create(model, fulltextModelFilter), // TODO: Add filtration of only class structure and FullTextSearchContext
      DBAdapterMiddleware.create(dbConf)
    ]

    const hierarchy = new Hierarchy()
    const modelDb = new ModelDb(hierarchy)

    const context: PipelineContext = {
      workspace,
      branding: null,
      modelDb,
      hierarchy,
      storageAdapter: externalStorage,
      contextVars: {}
    }
    result.pipeline = await createPipeline(ctx, middlewares, context)

    const defaultAdapter = result.pipeline.context.adapterManager?.getDefaultAdapter()
    if (defaultAdapter === undefined) {
      throw new PlatformError(unknownError('Default adapter should be set'))
    }
    if (process.env.COMMUNICATION_API_ENABLED === 'true') {
      result.communicationApi = await CommunicationApi.create(ctx, workspace.uuid, dbURL, {
        broadcast: () => {},
        enqueue: () => {},
        registerAsyncRequest: () => {}
      })
    }

    // Initialize a workspace socialId -> accountUuid map
    if (result.pipeline.context.lowLevelStorage === undefined) {
      throw new Error('Low level storage is not defined')
    }
    result.lowLevelStorage = result.pipeline.context.lowLevelStorage

    result.token = generateToken(systemAccountUuid, undefined, {
      service: 'rating'
    })
    result.transactorEndpoint = await endpointProvider(result.token)
    result.accountClient = getAccountClient(result.token, 5000000)

    const iterator = await result.lowLevelStorage.traverse<SocialIdentity>(DOMAIN_CHANNEL, {
      _class: contact.class.SocialIdentity
    })

    try {
      while (true) {
        const bulk = await iterator.next(500)
        if (bulk == null) {
          break
        }

        // We need to find persons
        const contacts = toIdMap(
          await result.lowLevelStorage.rawFindAll<Person>(DOMAIN_CONTACT, {
            _class: contact.class.Person,
            _id: { $in: bulk.map((it) => it.attachedTo) }
          })
        )
        for (const b of bulk) {
          const person = contacts.get(b.attachedTo)
          if (person?.personUuid !== undefined) {
            result.socialIdTo.set(b._id, person.personUuid as AccountUuid)
          }
        }
      }
    } finally {
      await iterator.close()
    }

    result.ratingDomains = new Map(getRatingDomains(hierarchy, modelDb))

    // Let's check if workspace was calculated rating's if not we should do it.

    const migrationState = await result.pipeline.findAll<MigrationState>(ctx, core.class.MigrationState, {
      plugin: ratingId
    })
    if (!migrationState.some((it) => it.state === 'v1')) {
      // We need to perform migration of workspace, we need calculate all stuff for it.
      await result.recalculateAll(ctx, control)

      const newState: MigrationState = {
        _id: generateId(),
        _class: core.class.MigrationState,
        plugin: ratingId as string,
        state: 'v1',
        modifiedOn: Date.now(),
        modifiedBy: systemAccount.primarySocialId,
        space: core.space.Configuration
      }
      await result.lowLevelStorage.upload(ctx, DOMAIN_MIGRATION, [newState])
    }

    result.flushTimeout = setInterval(() => {
      void result.flushUpdates(ctx, Date.now(), new Map(), true).catch((err) => {
        ctx.error('Error during periodic flush', { err })
      })
    }, 5000)

    return result
  }

  async recalculateAll (ctx: MeasureContext, control?: ConsumerControl): Promise<void> {
    // We need to iterate over all transactions and recalculate rating for each document and each person

    ctx.info('START RERANK ALL for', {
      uuid: this.pipeline.context.workspace.uuid,
      url: this.pipeline.context.workspace.url
    })

    this.persons.clear()
    this.modifiedPersons.clear()

    const iterator = await this.lowLevelStorage.traverse(
      DOMAIN_TX,
      {},
      {
        sort: {
          modifiedOn: SortingOrder.Ascending
        }
      }
    )

    // Remove all existing ranks for persons.

    await this.lowLevelStorage.rawDeleteMany(DOMAIN_PERSON_RATING, {})

    try {
      let processed: number = 0
      while (true) {
        const docs = await iterator.next(250)
        await control?.heartbeat()
        if (docs == null) {
          break
        }
        await this.calculate(
          ctx,
          docs.map((d) => d as Tx),
          control
        )
        processed += docs.length
        console.log('processed', processed)
      }
    } finally {
      await iterator.close()
    }
    console.log('END')
  }

  missingPersons = new Set<PersonId>()

  async getPerson (
    ctx: MeasureContext,
    person: PersonId,
    txAuthors: Map<PersonId, PersonRating>
  ): Promise<PersonRating | undefined> {
    const pp = txAuthors.get(person)
    if (pp !== undefined) {
      return pp
    }
    if (person === core.account.System || person === core.account.ConfigUser || person === 'guest:account:Guest') {
      return undefined
    }
    if (this.missingPersons.has(person)) {
      return undefined
    }
    let accountUuid = this.socialIdTo.get(person)
    if (accountUuid === undefined) {
      try {
        const personData = await this.accountClient.findPersonBySocialId(person)
        if (personData === undefined) {
          this.missingPersons.add(person)
          return
        }

        accountUuid = personData as AccountUuid
        this.socialIdTo.set(person, accountUuid)
      } catch (err: any) {
        console.info('No person for', person)
        this.missingPersons.add(person)
      }
    }
    if (accountUuid === undefined) {
      return undefined
    }
    let p: PersonRating | undefined = this.persons.get(accountUuid) ?? this.modifiedPersons.get(accountUuid)
    if (p !== undefined) {
      return p
    }
    p = (
      await this.lowLevelStorage?.rawFindAll(DOMAIN_PERSON_RATING, {
        accountId: accountUuid
      })
    )?.shift() as PersonRating

    if (p !== undefined) {
      this.persons.set(accountUuid, p)
      return p
    }
    const r = this.newPersonRating(accountUuid)
    this.persons.set(accountUuid, r)
    return r
  }

  private async getSysPerson (): Promise<PersonRating> {
    const existing =
      this.persons.get(systemAccountUuid) ??
      this.modifiedPersons.get(systemAccountUuid) ??
      ((
        await this.lowLevelStorage?.rawFindAll(DOMAIN_PERSON_RATING, {
          accountId: systemAccountUuid
        })
      )?.shift() as PersonRating) ??
      this.newPersonRating(systemAccountUuid)
    this.persons.set(systemAccountUuid, existing)
    this.modifiedPersons.set(systemAccountUuid, existing)
    return existing
  }

  async getPersons (ctx: MeasureContext, persons: PersonId[]): Promise<Map<PersonId, PersonRating>> {
    const accountMapping = new Map<PersonId, AccountUuid | null>()

    const toAccountFind: PersonId[] = []
    for (const person of persons) {
      if (person === core.account.System || person === core.account.ConfigUser || person === 'guest:account:Guest') {
        accountMapping.set(person, null)
        continue
      }
      if (this.missingPersons.has(person)) {
        accountMapping.set(person, null)
        continue
      }
      const accountUuid = this.socialIdTo.get(person)
      if (accountUuid === undefined) {
        if (person != null && person.trim() !== '') {
          try {
            Number.parseInt(person)
            toAccountFind.push(person)
          } catch (err: any) {
            // Ignore
            console.log('Invalid person id', person)
          }
        }
      } else {
        accountMapping.set(person, accountUuid)
      }
    }

    if (toAccountFind.length > 0) {
      try {
        const personData = new Map(
          Array.from(await this.accountClient.findFullSocialIds(toAccountFind)).map((it) => [it._id, it.personUuid])
        )
        for (const p of this.missingPersons) {
          const pid = personData.get(p)
          if (pid === undefined) {
            this.missingPersons.add(p)
          } else {
            accountMapping.set(p, pid as AccountUuid)
            this.socialIdTo.set(p, pid as AccountUuid)
          }
        }
      } catch (err: any) {
        console.info('Failed to get account info', { missing: toAccountFind })
      }
    }

    const accountsToFind: AccountUuid[] = []
    const result = new Map<PersonId, PersonRating>()

    for (const person of persons) {
      const accountUuid = accountMapping.get(person)
      if (accountUuid == null) {
        continue // Skip it is missing
      }
      const p: PersonRating | undefined = this.persons.get(accountUuid) ?? this.modifiedPersons.get(accountUuid)
      if (p !== undefined) {
        result.set(person, p)
      } else {
        accountsToFind.push(accountUuid)
      }
    }

    const records = new Map(
      Array.from(
        await this.lowLevelStorage?.rawFindAll<PersonRating>(DOMAIN_PERSON_RATING, {
          accountId: { $in: accountsToFind }
        })
      ).map((it) => [it.accountId, it])
    )

    for (const person of persons) {
      const accountUuid = accountMapping.get(person)
      if (accountUuid == null) {
        continue // Skip it is missing
      }
      const p: PersonRating | undefined =
        result.get(person) ?? records.get(accountUuid) ?? this.newPersonRating(accountUuid)
      result.set(person, p)
      this.persons.set(accountUuid, p)
    }
    return result
  }

  protected newPersonRating (person: AccountUuid): PersonRating {
    return {
      _id: generateId(),
      _class: rating.class.PersonRating,
      space: core.space.Workspace,
      modifiedBy: systemAccount.primarySocialId,
      rating: 0,
      accountId: person,
      months: [],
      reactions: 0,
      stars: 0,
      stats: {},
      socialIds: {},
      reactionsEarned: 0,
      starsEarned: 0,
      modifiedOn: Date.now()
    } satisfies PersonRating
  }

  classPluginMap = new Map<Ref<Class<Doc>>, string>()

  findPlugin (objectClass: Ref<Class<Doc>>): string | undefined {
    const h = this.pipeline.context.hierarchy
    const res = this.classPluginMap.get(objectClass)
    if (res !== undefined) {
      return res
    }
    let cl: Ref<Class<Doc>> | undefined = objectClass
    while (cl != null) {
      try {
        const _idInfo = _parseId(cl as any as Id)
        this.classPluginMap.set(cl, _idInfo.component)
        return _idInfo.component
      } catch (err: any) {
        // Ignore
        cl = h.getClass(cl).extends
      }
    }
  }

  updatePersonStats (
    person: PersonRating,
    createdOn: number,
    operation: 'create' | 'update' | 'delete',
    objectClass: Ref<Class<Doc>>,
    authorSocialId?: PersonId
  ): void {
    if (authorSocialId !== undefined) {
      person.socialIds[authorSocialId] = (person.socialIds[authorSocialId] ?? 0) + 1
    }

    const date = new Date(createdOn)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1

    // Determine index based on operation: [date, create, update, delete]
    const operationIndex = operation === 'create' ? 1 : operation === 'update' ? 2 : 3

    // Update months - keep only current year, clear previous years
    let m = person.months.find((m) => m[0] === year * 100 + month)
    if (m === undefined) {
      m = [year * 100 + month, 0, 0, 0]
      person.months.push(m)
      person.months.sort((a, b) => b[0] - a[0])
    }
    m[operationIndex]++

    const domain = this.findPlugin(objectClass)
    if (domain !== undefined) {
      const operationIndex = operation === 'create' ? 0 : operation === 'update' ? 1 : 2
      const stats = person.stats[domain] ?? [0, 0, 0]
      stats[operationIndex] += 1 // creates
      person.stats[domain] = stats
    }
  }

  checkAuthorInRage (accountId: AccountUuid, modifiedOn: number): boolean {
    const rage = this.rageAccounts.get(accountId)
    const result = modifiedOn - (rage ?? 0) > 1000 // One second delay between calculable
    this.rageAccounts.set(accountId, modifiedOn)
    return result
  }

  async calculate (ctx: MeasureContext, txes: Tx[], control?: ConsumerControl): Promise<void> {
    const cuds: TxCUD<Doc>[] = []

    let creates = 0
    // Process each document
    for (const tx of txes) {
      await control?.heartbeat()
      if (tx._class === core.class.TxCreateDoc) {
        creates++
      }
      if (TxProcessor.isExtendsCUD(tx._class)) {
        const cud = tx as TxCUD<Doc>
        const domain = this.pipeline.context.hierarchy.findDomain(cud.objectClass)
        const d = domain != null ? this.ratingDomains.get(domain) : undefined
        if ((d === undefined || !d.has(cud.objectClass)) && domain !== DOMAIN_RATING_REACTION) {
          continue
        }
        cuds.push(cud)
      }
    }
    if (cuds.length === 0) {
      return
    }

    // Pre find all possible parents, by groups, to prevent parallel requires
    const parentCache = new Map<Ref<Doc>, Doc>()

    const personIds = new Set(Array.from(cuds.map((it) => it.createdBy ?? it.modifiedBy)))

    if (creates > 0) {
      const byParentClass = groupByArray(
        cuds.filter((it) => it.attachedTo !== undefined && it.attachedToClass !== undefined),
        (it) => it.attachedToClass
      )

      for (const [_class, ids] of byParentClass.entries()) {
        // Check if class exists
        const d = this.pipeline.context.hierarchy.findDomain(_class as any) // just to be sure
        if (d === undefined) {
          continue
        }
        const parents = await this.pipeline.findAll(
          ctx,
          _class as any,
          { _id: { $in: ids.map((it) => it.attachedTo as any) } },
          {
            projection: {
              _id: 1,
              _class: 1,
              createdBy: 1,
              modifiedBy: 1
            }
          }
        )
        for (const p of parents) {
          parentCache.set(p._id as Ref<Doc>, p)
          if (p.createdBy != null) {
            personIds.add(p.createdBy)
          }
        }
      }
    }

    const txAuthors = await this.getPersons(ctx, Array.from(personIds))

    const sysRating = await this.getSysPerson()

    for (const tx of cuds) {
      await control?.heartbeat()
      switch (tx._class) {
        case core.class.TxCreateDoc: {
          this.updatePersonStats(sysRating, tx.createdOn ?? tx.modifiedOn, 'create', tx.objectClass)
          await this.handleRatingCreate(ctx, tx as TxCreateDoc<Doc>, parentCache, txAuthors)
          break
        }
        case core.class.TxUpdateDoc:
        case core.class.TxMixin: {
          this.updatePersonStats(sysRating, tx.createdOn ?? tx.modifiedOn, 'update', tx.objectClass)
          await this.handleRatingUpdate(ctx, tx as TxUpdateDoc<Doc>, txAuthors)
          break
        }
        case core.class.TxRemoveDoc: {
          this.updatePersonStats(sysRating, tx.createdOn ?? tx.modifiedOn, 'delete', tx.objectClass)
          await this.handleRatingDelete(ctx, tx as TxRemoveDoc<Doc>, txAuthors)
          break
        }
      }
    }

    sysRating.rating = calculatePersonRating(sysRating)
    this.modifiedPersons.set(systemAccountUuid, sysRating)
    await this.flushUpdates(ctx, Date.now(), new Map(), true)
  }

  async handleRatingCreate (
    ctx: MeasureContext,
    tx: TxCreateDoc<Doc>,
    parentCache: Map<Ref<Doc>, Doc>,
    txAuthors: Map<PersonId, PersonRating>
  ): Promise<void> {
    const personsToUpdate = new Map<Ref<PersonRating>, PersonRating>()
    // Parent rating

    // Update parent document
    const parentDoc = tx.attachedTo !== undefined ? parentCache.get(tx.attachedTo) : undefined
    if (parentDoc !== undefined) {
      // Update parent doc author rating
      const docAuthorRating =
        parentDoc.createdBy !== undefined ? await this.getPerson(ctx, parentDoc.createdBy, txAuthors) : undefined
      if (docAuthorRating !== undefined) {
        if (this.earnReactionsOnCreate(tx, docAuthorRating)) {
          personsToUpdate.set(docAuthorRating._id, docAuthorRating)
        }
      }
    }
    // Update transaction author rating
    const txAuthorRating = await this.getPerson(ctx, tx.createdBy ?? tx.modifiedBy, txAuthors)
    if (txAuthorRating !== undefined) {
      if (this.addCreatedReactions(tx, txAuthorRating)) {
        personsToUpdate.set(txAuthorRating._id, txAuthorRating)
      }

      if (this.checkAuthorInRage(txAuthorRating.accountId, tx.modifiedOn)) {
        this.updatePersonStats(txAuthorRating, tx.createdOn ?? tx.modifiedOn, 'create', tx.objectClass, tx.modifiedBy)
      } else {
        txAuthorRating.rageOperations = (txAuthorRating.rageOperations ?? 0) + 1
      }

      personsToUpdate.set(txAuthorRating._id, txAuthorRating)
    }

    await this.flushUpdates(ctx, tx.modifiedOn, personsToUpdate)
  }

  notifications = new Map<
  AccountUuid,
  {
    oldRating: number
    newRating: number
    person: PersonRating
  }
  >()

  private async flushUpdates (
    ctx: MeasureContext,
    tx: Timestamp,
    personsToUpdate: Map<Ref<PersonRating>, PersonRating>,
    force: boolean = false
  ): Promise<void> {
    for (const pu of personsToUpdate.values()) {
      const oldRating = pu.rating
      pu.rating = calculatePersonRating(pu)
      pu.modifiedOn = tx

      this.notifications.set(pu.accountId, {
        oldRating,
        newRating: pu.rating,
        person: pu
      })
      this.modifiedPersons.set(pu.accountId, pu)
      this.persons.set(pu.accountId, pu)
    }

    if (this.modifiedPersons.size > 1000 || (force && this.modifiedPersons.size > 0)) {
      const toStore = Array.from(this.modifiedPersons.values())
      const sysPerson = this.modifiedPersons.get(systemAccountUuid)
      this.modifiedPersons.clear()
      this.modifiedPersons.set(systemAccountUuid, sysPerson as PersonRating)
      await this.lowLevelStorage.upload(ctx, DOMAIN_PERSON_RATING, toStore)

      // Send rating update
      const txes: Tx[] = []
      for (const [, info] of this.notifications.entries()) {
        if (Math.round(info.oldRating * 100) !== Math.round(info.newRating * 100)) {
          // If level is changed, send notification
          const notification: TxUpdateDoc<PersonRating> = {
            _id: generateId(),
            _class: core.class.TxUpdateDoc,
            objectClass: rating.class.PersonRating,
            modifiedOn: info.person.modifiedOn,
            modifiedBy: systemAccount.primarySocialId,
            collection: '_rating',
            objectId: info.person._id,
            objectSpace: info.person.space,
            operations: {
              rating: info.person.rating
            },
            space: core.space.Workspace
          }
          txes.push(notification)
        }
      }
      this.notifications.clear()
      if (txes.length > 0) {
        this.sendTxToTransactor(txes)
      }
    }
  }

  private earnReactionsOnCreate (tx: TxCreateDoc<Doc>, docAuthorRating: PersonRating): boolean {
    if (tx.objectClass === rating.class.DocReaction) {
      const cr = tx as TxCreateDoc<DocReaction>
      switch (cr.attributes.reactionType) {
        case ReactionKind.Star:
          docAuthorRating.starsEarned += cr.attributes.value
          return true
        case ReactionKind.Emoji:
          docAuthorRating.reactionsEarned += 1
          return true
      }
    }
    return false
  }

  private addCreatedReactions (tx: TxCreateDoc<Doc>, doc: { stars: number, reactions: number }): boolean {
    if (tx.objectClass === rating.class.DocReaction) {
      const cr = tx as TxCreateDoc<DocReaction>
      switch (cr.attributes.reactionType) {
        case ReactionKind.Star:
          doc.stars += cr.attributes.value
          return true
        case ReactionKind.Emoji:
          doc.reactions += 1
          return true
      }
    }
    return false
  }

  async handleRatingDelete (
    ctx: MeasureContext,
    tx: TxRemoveDoc<Doc>,
    txAuthors: Map<PersonId, PersonRating>
  ): Promise<void> {
    const personsToUpdate = new Map<Ref<PersonRating>, PersonRating>()

    const txAuthorRating = await this.getPerson(ctx, tx.createdBy ?? tx.modifiedBy, txAuthors)
    if (txAuthorRating !== undefined) {
      // Update tx author
      if (this.checkAuthorInRage(txAuthorRating.accountId, tx.modifiedOn)) {
        this.updatePersonStats(txAuthorRating, tx.modifiedOn, 'delete', tx.objectClass, tx.modifiedBy)
      } else {
        txAuthorRating.rageOperations = (txAuthorRating.rageOperations ?? 0) + 1
      }
      personsToUpdate.set(txAuthorRating._id, txAuthorRating)
    }
    await this.flushUpdates(ctx, tx.modifiedOn, personsToUpdate)
  }

  async handleRatingUpdate (
    ctx: MeasureContext,
    tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>,
    txAuthors: Map<PersonId, PersonRating>
  ): Promise<void> {
    const personsToUpdate = new Map<Ref<PersonRating>, PersonRating>()

    const txAuthorRating = await this.getPerson(ctx, tx.createdBy ?? tx.modifiedBy, txAuthors)
    if (txAuthorRating !== undefined) {
      // Update tx author
      if (this.checkAuthorInRage(txAuthorRating.accountId, tx.modifiedOn)) {
        this.updatePersonStats(txAuthorRating, tx.modifiedOn, 'update', tx.objectClass, tx.modifiedBy)
      } else {
        txAuthorRating.rageOperations = (txAuthorRating.rageOperations ?? 0) + 1
      }
      personsToUpdate.set(txAuthorRating._id, txAuthorRating)
    }

    await this.flushUpdates(ctx, tx.modifiedOn, personsToUpdate)
  }

  async dropWorkspace (): Promise<void> {
    // await this.fulltext.dropWorkspace()
  }

  async doOperation (op: (indexer: RatingCalculator) => Promise<void>): Promise<boolean> {
    this.operations++
    try {
      await op(this)
    } finally {
      this.operations--
    }
    if (this.closing) {
      return await this.close()
    }
    return false
  }

  async close (): Promise<boolean> {
    this.closing = true
    if (this.flushTimeout != null) {
      clearInterval(this.flushTimeout)
    }
    if (this.operations === 0) {
      try {
        await this.pipeline.close()
        await this.communicationApi?.close()
      } catch (err: any) {
        console.error('error during closing', { err })
      }
      return true
    }
    return false
  }
}
