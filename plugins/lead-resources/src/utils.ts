import { Doc, Ref, TxOperations } from '@hcengineering/core'
import { Lead } from '@hcengineering/lead'
import lead from './plugin'

export async function getLeadTitle (client: TxOperations, ref: Ref<Doc>): Promise<string> {
  const object = await client.findOne(lead.class.Lead, { _id: ref as Ref<Lead> })
  if (object === undefined) throw new Error(`Lead not found, _id: ${ref}`)
  return `LEAD-${object.number}`
}
