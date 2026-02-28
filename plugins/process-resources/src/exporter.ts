import { type MasterTag } from '@hcengineering/card'
import card from '@hcengineering/card'
import core, {
  type Doc,
  type Ref,
  type Class,
  generateId,
  type EnumOf,
  type RefTo,
  type ArrOf,
  type ModelDb,
  type Hierarchy,
  type Type
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { type Process, type Transition } from '@hcengineering/process'
import processPlugin from './plugin'

export function exportProcesses (_id: Ref<MasterTag>): {
  docs: Doc[]
  required: Array<Ref<Class<Doc>>>
} {
  const docs: Doc[] = []
  const required: Array<Ref<Class<Doc>>> = []
  const client = getClient()
  const m = client.getModel()
  const processes = m.findAllSync(processPlugin.class.Process, { masterTag: _id })
  for (const proc of processes) {
    const res = exportProcess(proc)
    docs.push(...res.docs)
    for (const req of res.required) {
      if (!required.includes(req)) required.push(req)
    }
  }
  return { docs, required }
}

export function exportProcess (proc: Doc): {
  docs: Doc[]
  required: Array<Ref<Class<Doc>>>
} {
  const docs: Doc[] = [proc]
  const required: Array<Ref<Class<Doc>>> = []
  const client = getClient()
  const m = client.getModel()
  const h = client.getHierarchy()

  docs.push(...m.findAllSync(processPlugin.class.State, { process: proc._id as any }))
  const transitions = m.findAllSync(processPlugin.class.Transition, { process: proc._id as any }) as Transition[]
  docs.push(...transitions)

  const processDoc = proc as Process

  for (const tr of transitions) {
    processParams(tr.triggerParams, processDoc.masterTag, docs, required, m, h)
    for (const action of tr.actions) {
      processParams(action.params, processDoc.masterTag, docs, required, m, h)
      if (action.results !== undefined) {
        for (const res of action.results) {
          processType(res.type, docs, required, m, h)
        }
      }
    }
  }

  if (processDoc.context !== undefined) {
    for (const key in processDoc.context) {
      const ctx = processDoc.context[key as any]
      if (ctx.type !== undefined) {
        processType(ctx.type, docs, required, m, h)
      }
    }
  }

  if (processDoc.resultType !== undefined) {
    processType(processDoc.resultType, docs, required, m, h)
  }

  return { docs, required }
}

function processType (type: Type<any>, docs: Doc[], required: Array<Ref<Class<Doc>>>, m: ModelDb, h: Hierarchy): void {
  if (type._class === core.class.EnumOf) {
    const enumRef = (type as EnumOf).of
    const enumDoc = m.findObject(enumRef)
    if (enumDoc !== undefined && !docs.some((d) => d._id === enumDoc._id)) {
      docs.push(enumDoc)
    }
  }
  if (type._class === core.class.RefTo) {
    const to = (type as RefTo<Doc>).to
    if (h.isDerived(to, card.class.Card) && !required.includes(to)) {
      required.push(to)
    }
  }
  if (type._class === core.class.ArrOf) {
    const of = (type as ArrOf<Doc>).of
    processType(of, docs, required, m, h)
  }
}

function processParams (
  params: Record<string, any> | undefined,
  masterTag: Ref<MasterTag>,
  docs: Doc[],
  required: Array<Ref<Class<Doc>>>,
  m: ModelDb,
  h: Hierarchy
): void {
  if (params === undefined) return
  for (const key in params) {
    if (key.startsWith('$')) {
      const val = params[key]
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'object' && item !== null) {
            processParams(item, masterTag, docs, required, m, h)
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        processParams(val, masterTag, docs, required, m, h)
      }
      continue
    }
    const attr = h.findAttribute(masterTag, key)
    if (attr !== undefined) {
      processType(attr.type, docs, required, m, h)
    }
  }
}

export async function importProcess (masterTag: Ref<MasterTag>, json: string): Promise<void> {
  try {
    const data = JSON.parse(json) as Doc[]
    if (data[0] === undefined) return
    const client = getClient()
    const m = client.getModel()
    const apply = client.apply('Import process')
    ;(data[0] as any).masterTag = masterTag
    ;(data[0] as any)._id = generateId()
    for (const elem of data) {
      if (m.findObject(elem._id) !== undefined) continue
      await apply.createDoc(elem._class, core.space.Model, stripData(elem), elem._id)
    }
    await apply.commit(true)
  } catch (e) {
    console.error('Failed to import process:', e)
  }
}

function stripData<T extends Doc> (
  doc: T
): Omit<T, '_id' | '_class' | 'space' | 'modifiedBy' | 'modifiedOn' | 'createdBy' | 'createdOn'> {
  const { _id, _class, space, modifiedBy, modifiedOn, createdBy, createdOn, ...rest } = doc
  return rest
}
