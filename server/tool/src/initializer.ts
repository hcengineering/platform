import { saveCollabJson } from '@hcengineering/collaboration'
import core, {
  AttachedDoc,
  Class,
  Data,
  Doc,
  generateId,
  makeCollabId,
  MeasureContext,
  Mixin,
  Ref,
  Space,
  TxOperations,
  WorkspaceIdWithUrl
} from '@hcengineering/core'
import { ModelLogger } from '@hcengineering/model'
import { makeRank } from '@hcengineering/rank'
import { StorageFileUploader, UnifiedFormatImporter } from '@hcengineering/importer'
import type { StorageAdapter } from '@hcengineering/server-core'
import { jsonToMarkup, parseMessageMarkdown } from '@hcengineering/text'
import { v4 as uuid } from 'uuid'
import path from 'path'

const fieldRegexp = /\${\S+?}/

export interface InitScript {
  name: string
  lang?: string
  default: boolean
  steps: InitStep<Doc>[]
}

export type InitStep<T extends Doc> =
  | CreateStep<T>
  | DefaultStep<T>
  | MixinStep<T, T>
  | UpdateStep<T>
  | FindStep<T>
  | UploadStep
  | ImportStep
export interface CreateStep<T extends Doc> {
  type: 'create'
  _class: Ref<Class<T>>
  data: Props<T>
  markdownFields?: string[]
  collabFields?: string[]
  resultVariable?: string
}

export interface DefaultStep<T extends Doc> {
  type: 'default'
  _class: Ref<Class<T>>
  data: Props<T>
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

export interface ImportStep {
  type: 'import'
  path: string
}

export type Props<T extends Doc> = Data<T> & Partial<Doc> & { space: Ref<Space> }

export class WorkspaceInitializer {
  private readonly imageUrl = 'image://'
  private readonly nextRank = '#nextRank'
  private readonly now = '#now'

  constructor (
    private readonly ctx: MeasureContext,
    private readonly storageAdapter: StorageAdapter,
    private readonly wsUrl: WorkspaceIdWithUrl,
    private readonly client: TxOperations,
    private readonly initRepoDir: string
  ) {}

  async processScript (
    script: InitScript,
    logger: ModelLogger,
    progress: (value: number) => Promise<void>
  ): Promise<void> {
    const vars: Record<string, any> = {}
    const defaults = new Map<Ref<Class<Doc>>, Props<Doc>>()
    for (let index = 0; index < script.steps.length; index++) {
      try {
        const step = script.steps[index]
        if (step.type === 'default') {
          await this.processDefault(step, defaults)
        } else if (step.type === 'create') {
          await this.processCreate(step, vars, defaults)
        } else if (step.type === 'update') {
          await this.processUpdate(step, vars)
        } else if (step.type === 'mixin') {
          await this.processMixin(step, vars)
        } else if (step.type === 'find') {
          await this.processFind(step, vars)
        } else if (step.type === 'upload') {
          await this.processUpload(step, vars, logger)
        } else if (step.type === 'import') {
          await this.processImport(step, vars, logger)
        }

        await progress(Math.round(((index + 1) * 100) / script.steps.length))
      } catch (error) {
        logger.error(`Error in script on step ${index}`, error)
        throw error
      }
    }
  }

  private async processDefault<T extends Doc>(
    step: DefaultStep<T>,
    defaults: Map<Ref<Class<T>>, Props<T>>
  ): Promise<void> {
    const obj = defaults.get(step._class) ?? {}
    defaults.set(step._class, { ...obj, ...step.data })
  }

  private async processUpload (step: UploadStep, vars: Record<string, any>, logger: ModelLogger): Promise<void> {
    try {
      const id = uuid()
      const resp = await fetch(step.fromUrl)
      const buffer = Buffer.from(await resp.arrayBuffer())
      await this.storageAdapter.put(this.ctx, this.wsUrl, id, buffer, step.contentType, buffer.length)
      if (step.resultVariable !== undefined) {
        vars[`\${${step.resultVariable}}`] = id
        vars[`\${${step.resultVariable}_size}`] = buffer.length
      }
    } catch (error) {
      logger.error('Upload failed', error)
      throw error
    }
  }

  private async processImport (step: ImportStep, vars: Record<string, any>, logger: ModelLogger): Promise<void> {
    try {
      const uploader = new StorageFileUploader(this.ctx, this.storageAdapter, this.wsUrl)
      const initPath = path.resolve(this.initRepoDir, step.path)
      const importer = new UnifiedFormatImporter(this.client, uploader, logger)
      await importer.importFolder(initPath)
    } catch (error) {
      logger.error('Import failed', error)
      throw error
    }
  }

  private async processFind<T extends Doc>(step: FindStep<T>, vars: Record<string, any>): Promise<void> {
    const query = this.fillProps(step.query, vars)
    const res = await this.client.findOne(step._class, { ...(query as any) })
    if (res === undefined) {
      throw new Error(`Document not found: ${JSON.stringify(query)}`)
    }
    if (step.resultVariable !== undefined) {
      vars[`\${${step.resultVariable}}`] = res
    }
  }

  private async processMixin<T extends Doc>(step: MixinStep<T, T>, vars: Record<string, any>): Promise<void> {
    const data = await this.fillPropsWithMarkdown(step.data, vars, step.markdownFields)
    const { _id, space, ...props } = data
    if (_id === undefined || space === undefined) {
      throw new Error('Mixin step must have _id and space')
    }
    await this.client.createMixin(_id, step._class, space, step.mixin, props)
  }

  private async processUpdate<T extends Doc>(step: UpdateStep<T>, vars: Record<string, any>): Promise<void> {
    const data = await this.fillPropsWithMarkdown(step.data, vars, step.markdownFields)
    const { _id, space, ...props } = data
    if (_id === undefined || space === undefined) {
      throw new Error('Update step must have _id and space')
    }
    await this.client.updateDoc(step._class, space, _id as Ref<Doc>, props)
  }

  private async processCreate<T extends Doc>(
    step: CreateStep<T>,
    vars: Record<string, any>,
    defaults: Map<Ref<Class<T>>, Props<T>>
  ): Promise<void> {
    const _id = generateId<T>()
    if (step.resultVariable !== undefined) {
      vars[`\${${step.resultVariable}}`] = _id
    }
    const data = await this.fillPropsWithMarkdown(
      { ...(defaults.get(step._class) ?? {}), ...step.data },
      vars,
      step.markdownFields
    )

    if (step.collabFields !== undefined) {
      for (const field of step.collabFields) {
        if ((data as any)[field] !== undefined) {
          const res = await this.createCollab((data as any)[field], step._class, _id, field)
          ;(data as any)[field] = res
        }
      }
    }

    await this.create(step._class, data, _id)
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
    vars: Record<string, any>,
    markdownFields?: string[]
  ): Promise<P> {
    data = await this.fillProps(data, vars)
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

  private async createCollab (
    data: string,
    objectClass: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    objectAttr: string
  ): Promise<string> {
    const doc = makeCollabId(objectClass, objectId, objectAttr)

    const json = parseMessageMarkdown(data ?? '', this.imageUrl)
    const markup = jsonToMarkup(json)

    return await saveCollabJson(this.ctx, this.storageAdapter, this.wsUrl, doc, markup)
  }

  private async fillProps<T extends Doc, P extends Partial<T> | Props<T>>(
    data: P,
    vars: Record<string, any>
  ): Promise<P> {
    for (const key in data) {
      const value = (data as any)[key]
      ;(data as any)[key] = await this.fillValue(value, vars)
    }
    return data
  }

  private async fillValue (value: any, vars: Record<string, any>): Promise<any> {
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return await Promise.all(value.map(async (v) => await this.fillValue(v, vars)))
      } else {
        return await this.fillProps(value, vars)
      }
    } else if (typeof value === 'string') {
      if (value === this.nextRank) {
        const rank = makeRank(vars[this.nextRank], undefined)
        vars[this.nextRank] = rank
        return rank
      } else if (value === this.now) {
        return new Date().getTime()
      } else {
        while (true) {
          const matched = fieldRegexp.exec(value)
          if (matched === null) break
          const result = vars[matched[0]]
          if (result === undefined) {
            throw new Error(`Variable ${matched[0]} not found`)
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
}
