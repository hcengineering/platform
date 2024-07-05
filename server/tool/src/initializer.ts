import core, {
  AttachedDoc,
  Class,
  Client,
  Data,
  Doc,
  MeasureContext,
  Mixin,
  Ref,
  Space,
  TxOperations,
  WorkspaceId
} from '@hcengineering/core'
import { ModelLogger } from '@hcengineering/model'
import { makeRank } from '@hcengineering/rank'
import { AggregatorStorageAdapter } from '@hcengineering/server-core'
import { v4 as uuid } from 'uuid'

const fieldRegexp = /\${\S+?}/

export interface InitScript {
  name: string
  lang?: string
  default: boolean
  steps: InitStep<Doc>[]
}

export type InitStep<T extends Doc> = CreateStep<T> | MixinStep<T, T> | UpdateStep<T> | FindStep<T> | UploadStep

export interface CreateStep<T extends Doc> {
  type: 'create'
  _class: Ref<Class<T>>
  data: Props<T>
  resultVariable?: string
}

export interface MixinStep<T extends Doc, M extends T> {
  type: 'mixin'
  _class: Ref<Class<T>>
  mixin: Ref<Mixin<M>>
  data: Props<T>
}

export interface UpdateStep<T extends Doc> {
  type: 'update'
  _class: Ref<Class<T>>
  data: Props<T>
}

export interface FindStep<T extends Doc> {
  type: 'find'
  _class: Ref<Class<T>>
  query: Partial<T>
  resultVariable?: string
}

export interface UploadStep {
  type: 'upload'
  fromUrl: string
  contentType: string
  size?: number
  resultVariable?: string
}

export type Props<T extends Doc> = Data<T> & Partial<Doc> & { space: Ref<Space> }

const nextRank = '#nextRank'
const now = '#now'

export async function createWorkspaceData (
  ctx: MeasureContext,
  connection: Client,
  storageAdapter: AggregatorStorageAdapter,
  workspaceId: WorkspaceId,
  script: InitScript,
  logger: ModelLogger,
  progress: (value: number) => Promise<void>
): Promise<void> {
  const client = new TxOperations(connection, core.account.System)
  const vars: Record<string, any> = {}
  for (let index = 0; index < script.steps.length; index++) {
    const step = script.steps[index]
    if (step.type === 'create') {
      await processCreate(client, step, vars)
    } else if (step.type === 'update') {
      await processUpdate(client, step, vars)
    } else if (step.type === 'mixin') {
      await processMixin(client, step, vars)
    } else if (step.type === 'find') {
      await processFind(client, step, vars)
    } else if (step.type === 'upload') {
      await processUpload(ctx, storageAdapter, workspaceId, step, vars, logger)
    }

    await progress(Math.round(((index + 1) * 100) / script.steps.length))
  }
}

async function processUpload (
  ctx: MeasureContext,
  storageAdapter: AggregatorStorageAdapter,
  workspaceId: WorkspaceId,
  step: UploadStep,
  vars: Record<string, any>,
  logger: ModelLogger
): Promise<void> {
  try {
    const id = uuid()
    const resp = await fetch(step.fromUrl)
    const buffer = Buffer.from(await resp.arrayBuffer())
    await storageAdapter.put(ctx, workspaceId, id, buffer, step.contentType, step.size)
    if (step.resultVariable !== undefined) {
      vars[step.resultVariable] = id
    }
  } catch (error) {
    logger.error('Upload failed', error)
  }
}

async function processFind<T extends Doc> (
  client: TxOperations,
  step: FindStep<T>,
  vars: Record<string, any>
): Promise<void> {
  const query = fillProps(step.query, vars)
  const res = await client.findOne(step._class, { ...(query as any) })
  if (res === undefined) {
    throw new Error(`Document not found: ${JSON.stringify(query)}`)
  }
  if (step.resultVariable !== undefined) {
    vars[step.resultVariable] = res
  }
}

async function processMixin<T extends Doc> (
  client: TxOperations,
  step: MixinStep<T, T>,
  vars: Record<string, any>
): Promise<void> {
  const data = fillProps(step.data, vars)
  const { _id, space, ...props } = data
  if (_id === undefined || space === undefined) {
    throw new Error('Mixin step must have _id and space')
  }
  await client.createMixin(_id, step._class, space, step.mixin, props)
}

async function processUpdate<T extends Doc> (
  client: TxOperations,
  step: UpdateStep<T>,
  vars: Record<string, any>
): Promise<void> {
  const data = fillProps(step.data, vars)
  const { _id, space, ...props } = data
  if (_id === undefined || space === undefined) {
    throw new Error('Update step must have _id and space')
  }
  await client.updateDoc(step._class, space, _id as Ref<Doc>, props)
}

async function processCreate<T extends Doc> (
  client: TxOperations,
  step: CreateStep<T>,
  vars: Record<string, any>
): Promise<void> {
  const data = fillProps(step.data, vars)
  const res = await create(client, step._class, data)
  if (step.resultVariable !== undefined) {
    vars[step.resultVariable] = res
  }
}

async function create<T extends Doc> (client: TxOperations, _class: Ref<Class<T>>, data: Props<T>): Promise<Ref<T>> {
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(_class, core.class.AttachedDoc)) {
    const { space, attachedTo, attachedToClass, collection, ...props } = data as unknown as Props<AttachedDoc>
    if (attachedTo === undefined || space === undefined || attachedToClass === undefined || collection === undefined) {
      throw new Error('Add collection step must have attachedTo, attachedToClass, collection and space')
    }
    return (await client.addCollection(
      _class,
      space,
      attachedTo,
      attachedToClass,
      collection,
      props
    )) as unknown as Ref<T>
  } else {
    const { space, ...props } = data
    if (space === undefined) {
      throw new Error('Create step must have space')
    }
    return await client.createDoc<T>(_class, space, props as Data<T>)
  }
}

function fillProps<T extends Doc, P extends Partial<T> | Props<T>> (data: P, vars: Record<string, any>): P {
  for (const key in data) {
    let value = (data as any)[key]
    if (typeof value === 'object') {
      ;(data as any)[key] = fillProps(value, vars)
    } else if (typeof value === 'string') {
      if (value === nextRank) {
        const rank = makeRank(vars[nextRank], undefined)
        ;(data as any)[key] = rank
        vars[nextRank] = rank
      } else if (value === now) {
        ;(data as any)[key] = new Date().getTime()
      } else {
        while (true) {
          const matched = fieldRegexp.exec(value)
          if (matched === null) break
          const result = vars[matched[0]]
          if (result !== undefined && typeof result === 'string') {
            value = value.replaceAll(matched[0], result)
            fieldRegexp.lastIndex = 0
          }
        }
        ;(data as any)[key] = value
      }
    }
  }
  return data
}
