import { type MasterTag } from '@hcengineering/card'
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import process from './plugin'

export function exportProcess (_id: Ref<MasterTag>): {
  docs: Doc[]
  required: Array<Ref<Class<Doc>>>
} {
  const docs: Doc[] = []
  const client = getClient()
  const m = client.getModel()
  const processes = m.findAllSync(process.class.Process, { masterTag: _id })
  for (const proc of processes) {
    docs.push(proc)

    docs.push(...m.findAllSync(process.class.State, { process: proc._id }))

    docs.push(...m.findAllSync(process.class.Transition, { process: proc._id }))
  }
  return { docs, required: [] }
}
