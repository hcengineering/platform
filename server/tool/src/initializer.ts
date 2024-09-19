import { saveCollaborativeDoc } from '@hcengineering/collaboration'
import core, {
  AttachedDoc,
  Class,
  CollaborativeDoc,
  Data,
  Doc,
  generateId,
  MeasureContext,
  Mixin,
  Ref,
  Space,
  TxOperations,
  WorkspaceIdWithUrl
} from '@hcengineering/core'
import { ModelLogger } from '@hcengineering/model'
import { makeRank } from '@hcengineering/rank'
import { AggregatorStorageAdapter } from '@hcengineering/server-core'
import { jsonToYDocNoSchema, parseMessageMarkdown } from '@hcengineering/text'
import { v4 as uuid } from 'uuid'
import { contentType } from 'mime-types'
import * as yaml from 'js-yaml'

const fieldRegexp = /\${\S+?}/

export interface InitScript {
  name: string
  lang?: string
  default: boolean
  from?: string
  steps: InitStep<Doc>[]
}

export type InitStep<T extends Doc> =
  | CreateStep<T>
  | DefaultStep<T>
  | MixinStep<T, T>
  | UpdateStep<T>
  | FindStep<T>
  | UploadStep
  | VarsStep
  | CreateFrom

export interface CreateStep<T extends Doc> {
  type: 'create'
  _class: Ref<Class<T>>
  data: Props<T>
  markdownFields?: string[]
  collabFields?: string[]
  resultVariable?: string
}

export interface CreateFrom {
  type: 'createFrom'
  fromUrl: string
}

export interface VarsStep {
  type: 'vars'
  vars: Record<string, any>
}

export interface DefaultStep<T extends Doc> extends Defaults<T> {
  type: 'default'
  _class: Ref<Class<T>>
}

export interface MixinStep<T extends Doc, M extends T> {
  type: 'mixin'
  _class: Ref<Class<T>>
  mixin: Ref<Mixin<M>>
  markdownFields?: string[]
  collabFields?: string[]
  data: Props<T>
}

export interface UpdateStep<T extends Doc> {
  type: 'update'
  _class: Ref<Class<T>>
  markdownFields?: string[]
  collabFields?: string[]
  data: Props<T>
}

export interface FindStep<T extends Doc> {
  type: 'find'
  _class: Ref<Class<T>>
  query: Partial<T>
  resultVariable: string
}

export interface UploadStep {
  type: 'upload'
  fromUrl: string
  contentType: string
  resultVariable?: string
}

type PostOp = (id: Ref<Doc>, clazz: Ref<Class<Doc>>) => Promise<void>

interface Defaults<T extends Doc> {
  markdownFields?: string[]
  collabFields?: string[]
  data: Props<T>
}

function concatArrs (a: string[] | undefined, b: string[] | undefined): string[] {
  return a !== undefined && b !== undefined ? [...a, ...b] : a ?? b ?? []
}

export type Props<T extends Doc> = Data<T> & Partial<Doc> & { space: Ref<Space> }

export class WorkspaceInitializer {
  private readonly imageUrl = 'image://'
  private readonly nextRank = '#nextRank'
  private readonly now = '#now'
  private readonly vars: Record<string, any> = {}
  private readonly defaults = new Map<Ref<Class<Doc>>, Defaults<Doc>>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: AggregatorStorageAdapter,
    private readonly wsUrl: WorkspaceIdWithUrl,
    private readonly client: TxOperations,
    private readonly baseUrl: string
  ) {}

  async getBase (logger: ModelLogger): Promise<InitStep<Doc>[]> {
    try {
      const req = await fetch(`${this.baseUrl}/base.yaml`)
      const text = await req.text()
      const script = yaml.load(text) as any as InitStep<Doc>[]
      return script
    } catch (err) {
      logger.error('Error getting base script', err)
      return []
    }
  }

  async getScript (url: string, logger: ModelLogger): Promise<InitStep<Doc>[]> {
    try {
      const req = await fetch(url)
      const text = await req.text()
      const script = yaml.load(text) as any as InitStep<Doc>[]
      return script
    } catch (err) {
      logger.error('Error getting base script', err)
      throw err
    }
  }

  async processScript (
    script: InitScript,
    logger: ModelLogger,
    progress: (value: number) => Promise<void>
  ): Promise<void> {
    this.defaults.clear()
    const base = await this.getBase(logger)
    if (script.from !== undefined) {
      script.steps = [...(await this.getScript(script.from, logger)), ...script.steps]
    }
    const steps = [...base, ...script.steps]
    for (let index = 0; index < steps.length; index++) {
      try {
        const step = steps[index]
        if (step.type === 'vars') {
          for (const key in step.vars) {
            const value = step.vars[key]
            this.vars[`\${${key}}`] = value
          }
        } else if (step.type === 'default') {
          this.processDefault(step)
        } else if (step.type === 'createFrom') {
          await this.processCreateFrom(step)
        } else if (step.type === 'create') {
          await this.processCreate(step)
        } else if (step.type === 'update') {
          await this.processUpdate(step)
        } else if (step.type === 'mixin') {
          await this.processMixin(step)
        } else if (step.type === 'find') {
          await this.processFind(step)
        } else if (step.type === 'upload') {
          await this.processUpload(step, logger)
        }

        // await progress(Math.round(((index + 1) * 100) / steps.length))
      } catch (error) {
        logger.error(`Error in script on step ${index}`, error)
        throw error
      }
    }
  }

  private processDefault<T extends Doc>(step: DefaultStep<T>): void {
    const _class = this.vars[`\${${step._class}}`] ?? step._class
    const obj = this.defaults.get(_class)
    if (obj === undefined) {
      this.defaults.set(_class, {
        data: step.data,
        collabFields: step.collabFields,
        markdownFields: step.markdownFields
      })
    } else {
      const data = { ...obj.data, ...step.data }
      const collabFields = concatArrs(obj.collabFields, step.collabFields)
      const markdownFields = concatArrs(obj.markdownFields, step.markdownFields)
      this.defaults.set(_class, { data, collabFields, markdownFields })
    }
  }

  private getUrl (url: string): string {
    return url.startsWith('./') ? `${this.baseUrl}/${url.substring(2)}` : url
  }

  private async processUpload (step: UploadStep, logger: ModelLogger): Promise<void> {
    try {
      const id = uuid()
      const url = this.getUrl(step.fromUrl)
      const resp = await fetch(url)
      const buffer = Buffer.from(await resp.arrayBuffer())
      await this.storageAdapter.put(this.ctx, this.wsUrl, id, buffer, step.contentType, buffer.length)
      if (step.resultVariable !== undefined) {
        this.vars[`\${${step.resultVariable}}`] = id
        this.vars[`\${${step.resultVariable}_size}`] = buffer.length
      }
    } catch (error) {
      logger.error('Upload failed', error)
      throw error
    }
  }

  private async processFind<T extends Doc>(step: FindStep<T>): Promise<void> {
    const _class = this.vars[step._class] ?? step._class
    const query = this.fillProps(step.query)
    const res = await this.client.findOne(_class, { ...(query as any) })
    if (res === undefined) {
      throw new Error(`Document not found: ${JSON.stringify(query)}`)
    }
    if (step.resultVariable !== undefined) {
      this.vars[`\${${step.resultVariable}}`] = res
    }
  }

  private async processMixin<T extends Doc>(step: MixinStep<T, T>): Promise<void> {
    const _class = this.vars[`\${${step._class}}`] ?? step._class
    const markdownFields = concatArrs(this.defaults.get(_class)?.markdownFields, step.markdownFields)
    const data = await this.fillPropsWithMarkdown(step.data, markdownFields)
    const { _id, space, ...props } = data
    if (_id === undefined || space === undefined) {
      throw new Error('Mixin step must have _id and space')
    }
    await this.client.createMixin(_id, _class, space, step.mixin, props)
  }

  private async processUpdate<T extends Doc>(step: UpdateStep<T>): Promise<void> {
    const _class = this.vars[`\${${step._class}}`] ?? step._class
    const markdownFields = concatArrs(this.defaults.get(_class)?.markdownFields, step.markdownFields)
    const data = await this.fillPropsWithMarkdown(step.data, markdownFields)
    const { _id, space, ...props } = data
    if (_id === undefined || space === undefined) {
      throw new Error('Update step must have _id and space')
    }
    await this.client.updateDoc(_class, space, _id as Ref<Doc>, props)
  }

  private async processCreate<T extends Doc>(step: CreateStep<T>): Promise<void> {
    const _id = generateId<T>()
    if (step.resultVariable !== undefined) {
      this.vars[`\${${step.resultVariable}}`] = _id
    }
    const postOps: PostOp[] = []
    const _class = this.vars[`\${${step._class}}`] ?? step._class
    const markdownFields = concatArrs(this.defaults.get(_class)?.markdownFields, step.markdownFields)
    const collabFields = concatArrs(this.defaults.get(_class)?.collabFields, step.collabFields)

    const data = await this.fillPropsWithMarkdown(
      { ...(this.defaults.get(_class)?.data ?? {}), ...step.data },
      markdownFields,
      postOps
    )

    for (const field of collabFields) {
      if ((data as any)[field] !== undefined) {
        const res = await this.createCollab((data as any)[field], field, _id)
        ;(data as any)[field] = res
      }
    }

    await this.create(_class, data, _id)
    for (const op of postOps) {
      await op(_id, _class)
    }
  }

  private async processCreateFrom<T extends Doc>(step: CreateFrom): Promise<void> {
    const url = this.getUrl(step.fromUrl)
    const resp = await fetch(url)
    const text = await resp.text()
    const script = yaml.load(text) as any as Props<T>
    const { _class, ...props } = script
    if (_class === undefined) {
      throw new Error('CreateFrom step must have _class')
    }
    const _id = generateId<T>()
    const resultVariable = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
    this.vars[`\${${resultVariable}}`] = _id

    const clazz = this.vars[`\${${_class}}`] ?? _class
    const markdownFields = this.defaults.get(clazz)?.markdownFields
    const collabFields = this.defaults.get(clazz)?.collabFields
    const postOps: PostOp[] = []

    const data = await this.fillPropsWithMarkdown(
      { ...(this.defaults.get(clazz)?.data ?? {}), ...(props as Props<T>) },
      markdownFields,
      postOps
    )

    if (collabFields !== undefined) {
      for (const field of collabFields) {
        if ((data as any)[field] !== undefined) {
          const res = await this.createCollab((data as any)[field], field, _id)
          ;(data as any)[field] = res
        }
      }
    }

    await this.create(clazz, data, _id)
    for (const op of postOps) {
      await op(_id, clazz)
    }
  }

  private parseMarkdown (text: string): string {
    const json = parseMessageMarkdown(text ?? '', this.imageUrl)
    return JSON.stringify(json)
  }

  private async create<T extends Doc>(_class: Ref<Class<T>>, data: Props<T>, _id?: Ref<T>): Promise<Ref<T>> {
    const hierarchy = this.client.getHierarchy()

    if (hierarchy.isDerived(_class, core.class.AttachedDoc)) {
      const { space, attachedTo, attachedToClass, collection, ...props } = data as unknown as Props<AttachedDoc>
      if (
        attachedTo === undefined ||
        space === undefined ||
        attachedToClass === undefined ||
        collection === undefined
      ) {
        throw new Error('Add collection step must have attachedTo, attachedToClass, collection and space')
      }
      return (await this.client.addCollection(
        _class,
        space,
        attachedTo,
        attachedToClass,
        collection,
        props,
        _id as Ref<AttachedDoc> | undefined
      )) as unknown as Ref<T>
    } else {
      const { space, ...props } = data
      if (space === undefined) {
        throw new Error('Create step must have space')
      }
      return await this.client.createDoc<T>(_class, space, props as Data<T>, _id)
    }
  }

  private async fillPropsWithMarkdown<T extends Doc, P extends Partial<T> | Props<T>>(
    data: P,
    markdownFields?: string[],
    postOps?: PostOp[]
  ): Promise<P> {
    data = await this.fillProps(data, postOps)
    if (markdownFields !== undefined) {
      for (const field of markdownFields) {
        if ((data as any)[field] !== undefined) {
          try {
            const res = this.parseMarkdown((data as any)[field])
            ;(data as any)[field] = res
          } catch (error) {
            console.log(error)
          }
        }
      }
    }
    return data
  }

  private async createCollab (data: string, field: string, _id: Ref<Doc>): Promise<string> {
    const id = `${_id}%${field}`
    const collabId = `${id}:HEAD:0` as CollaborativeDoc

    const json = parseMessageMarkdown(data ?? '', this.imageUrl)
    const yDoc = jsonToYDocNoSchema(json, field)

    await saveCollaborativeDoc(this.storageAdapter, this.wsUrl, collabId, yDoc, this.ctx)
    return collabId
  }

  private async fillProps<T extends Doc, P extends Partial<T> | Props<T>>(data: P, postOps?: PostOp[]): Promise<P> {
    for (const key in data) {
      const value = (data as any)[key]
      ;(data as any)[key] = await this.fillValue(value, postOps)
    }
    return data
  }

  private async fillValue (value: any, postOps?: PostOp[]): Promise<any> {
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return await Promise.all(value.map(async (v) => await this.fillValue(v, postOps)))
      } else {
        return await this.fillProps(value, postOps)
      }
    } else if (typeof value === 'string') {
      if (value === this.nextRank) {
        const rank = makeRank(this.vars[this.nextRank], undefined)
        this.vars[this.nextRank] = rank
        return rank
      } else if (value === this.now) {
        return new Date().getTime()
      } else {
        while (true) {
          const matched = fieldRegexp.exec(value)
          if (matched === null) break
          const result = this.vars[matched[0]]
          if (result === undefined) {
            if (matched[0].startsWith('${file://')) {
              const val = matched[0].substring(9, matched[0].length - 1)
              const fileUrl = this.getUrl(val)
              const name = fileUrl.substring(fileUrl.lastIndexOf('/') + 1)
              const res = await this.getFile(fileUrl, name)
              if (postOps !== undefined) {
                postOps?.push(async (id, clazz) => {
                  await this.createAttachment(id, clazz, name)
                })
              }
              value = value.replaceAll(matched[0], res)
            } else {
              throw new Error(`Variable ${matched[0]} not found`)
            }
          } else {
            value = value.replaceAll(matched[0], result)
            fieldRegexp.lastIndex = 0
          }
        }
        return value
      }
    }
    return value
  }

  private async getFile (url: string, name: string): Promise<string> {
    const id = uuid()
    const resp = await fetch(url)
    const buffer = Buffer.from(await resp.arrayBuffer())
    const parsedType = contentType(name)
    const type = parsedType === false ? 'application/octet-stream' : parsedType
    await this.storageAdapter.put(this.ctx, this.wsUrl, id, buffer, type, buffer.length)
    this.vars[`\${${name}}`] = id
    this.vars[`\${${name}_size}`] = buffer.length
    this.vars[`\${${name}_type}`] = type
    return id
  }

  private async createAttachment (attachedTo: Ref<Doc>, _class: Ref<Class<Doc>>, fileName: string): Promise<void> {
    const clazz = 'attachment:class:Attachment' as Ref<Class<Doc>>
    const file = this.vars[`\${${fileName}}`]
    const size = this.vars[`\${${fileName}_size}`]
    const type = this.vars[`\${${fileName}_type}`]
    const props = {
      ...(this.defaults.get(clazz)?.data ?? {}),
      attachedTo,
      attachedToClass: _class,
      file,
      name: fileName,
      size,
      type
    }
    const data = await this.fillProps(props as Props<Doc>)
    await this.create(_class, data)
  }
}
