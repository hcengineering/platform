import { type Doc, type Ref, type TxOperations } from '@hcengineering/core'
import { type Lead } from '@hcengineering/lead'
import lead from './plugin'

export async function getLeadTitle (client: TxOperations, ref: Ref<Doc>, doc?: Lead): Promise<string> {
  const object = doc ?? (await client.findOne(lead.class.Lead, { _id: ref as Ref<Lead> }))
  if (object === undefined) throw new Error(`Lead not found, _id: ${ref}`)
  return `LEAD-${object.number}`
}

export async function getLeadId (client: TxOperations, ref: Ref<Lead>, doc?: Lead): Promise<string> {
  const object = doc ?? (await client.findOne(lead.class.Lead, { _id: ref }))
  if (object === undefined) throw new Error(`Lead not found, _id: ${ref}`)
  return object.identifier
}
