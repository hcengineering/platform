import type { Collection } from 'mongodb'
import { getDB } from './storage'
import { LastMsgRecord, TgUser, User, UserRecord, WorkspaceChannel } from './types'
import { WorkspaceWorker } from './workspace'
import { StorageAdapter } from '@hcengineering/server-core'
import { MeasureContext } from '@hcengineering/core'

export class PlatformWorker {
  private constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: StorageAdapter,
    private readonly clientMap: Map<string, WorkspaceWorker>,
    private readonly storage: Collection<UserRecord>
  ) {}

  async close (): Promise<void> {
    await Promise.all(
      [...this.clientMap.values()].map(async (worker) => {
        await worker.close()
      })
    )
  }

  async addUser (tgUser: TgUser): Promise<void> {
    const { workspace, phone } = tgUser as any // TODO: FIXME
    const res = await this.storage.findOne({ phone, workspace })

    if (res !== null) {
      throw Error('Phone number is already used')
    }

    let wsWorker = this.clientMap.get(workspace)

    if (wsWorker === undefined) {
      const [userStorage, lastMsgStorage, channelStorage] = await PlatformWorker.createStorages()
      wsWorker = await WorkspaceWorker.create(
        this.ctx,
        this.storageAdapter,
        workspace,
        userStorage,
        lastMsgStorage,
        channelStorage
      )
      this.clientMap.set(workspace, wsWorker)
    }

    await wsWorker.addUser(tgUser)
  }

  async getTarget ({ workspace, email }: User): Promise<[UserRecord, WorkspaceWorker | undefined]> {
    const res = await this.storage.findOne({ email, workspace })

    if (res === null) {
      throw Error('User is not signed in')
    }

    return [res, this.clientMap.get(workspace)]
  }

  async removeUser (user: User): Promise<void> {
    const [res, wsWorker] = await this.getTarget(user)

    if (wsWorker === undefined) {
      throw Error(`Invalid workspace: '${user.workspace}'`)
    }

    await wsWorker.removeUser({ phone: res.phone })
  }

  async getUserRecord ({ workspace, phone }: Pick<TgUser, 'workspace' | 'phone'>): Promise<UserRecord | undefined> {
    return (await this.storage.findOne({ phone, workspace })) ?? undefined
  }

  static async createStorages (): Promise<
  [Collection<UserRecord>, Collection<LastMsgRecord>, Collection<WorkspaceChannel>]
  > {
    const db = await getDB()
    const userStorage = db.collection<UserRecord>('integrations')
    const lastMsgStorage = db.collection<LastMsgRecord>('last-msgs')
    const channelStorage = db.collection<WorkspaceChannel>('channels')

    await userStorage.createIndex({ phone: 1, workspace: 1 }, { unique: true })
    await userStorage.createIndex({ email: 1, workspace: 1 }, { unique: true })

    try {
      await lastMsgStorage.dropIndex('phone_1_participantID_1_workspace_1')
    } catch {}

    await lastMsgStorage.createIndex({ phone: 1, participantID: 1, channelID: 1, workspace: 1 }, { unique: true })

    return [userStorage, lastMsgStorage, channelStorage]
  }

  static async create (ctx: MeasureContext, storageAdapter: StorageAdapter): Promise<PlatformWorker> {
    const [userStorage, lastMsgStorage, channelStorage] = await PlatformWorker.createStorages()
    const workspaces = new Set((await userStorage.find().toArray()).map((p) => p.workspace))
    const clients: Array<[string, WorkspaceWorker]> = []
    for (const workspace of workspaces) {
      try {
        const worker = await WorkspaceWorker.create(
          ctx,
          storageAdapter,
          workspace as any, // TODO: FIXME
          userStorage,
          lastMsgStorage,
          channelStorage
        )
        clients.push([workspace, worker])
        void worker.checkUsers()
      } catch (e) {
        console.error(`Failed to initialize workspace worker: ${workspace}`)
        console.error(e)
      }
    }

    const res = clients.filter((client): client is [string, WorkspaceWorker] => client !== undefined)

    const worker = new PlatformWorker(ctx, storageAdapter, new Map(res), userStorage)

    return worker
  }
}
