import { type MasterTag } from '@hcengineering/card'
import core, { type Doc, type Ref, type Class, generateId } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import process from './plugin'

export function exportProcesses (_id: Ref<MasterTag>): {
  docs: Doc[]
  required: Array<Ref<Class<Doc>>>
} {
  const docs: Doc[] = []
  const client = getClient()
  const m = client.getModel()
  const processes = m.findAllSync(process.class.Process, { masterTag: _id })
  for (const proc of processes) {
    const res = exportProcess(proc)
    docs.push(...res.docs)
  }
  return { docs, required: [] }
}

export function exportProcess (proc: Doc): {
  docs: Doc[]
  required: Array<Ref<Class<Doc>>>
} {
  const docs: Doc[] = [proc]
  const client = getClient()
  const m = client.getModel()

  docs.push(...m.findAllSync(process.class.State, { process: proc._id as any }))
  docs.push(...m.findAllSync(process.class.Transition, { process: proc._id as any }))

  return { docs, required: [] }
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
