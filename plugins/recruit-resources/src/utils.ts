import core, { Doc, Ref, TxOperations } from '@anticrm/core'
import { translate } from '@anticrm/platform'
import { Applicant } from '@anticrm/recruit'
import recruit from './plugin'

export async function getApplicationTitle (client: TxOperations, ref: Ref<Doc>): Promise<string> {
  const object = await client.findOne(
    recruit.class.Applicant,
    { _id: ref as Ref<Applicant> },
    { lookup: { _class: core.class.Class } }
  )
  if (object?.$lookup?._class?.shortLabel === undefined) {
    throw new Error(`Application shortLabel not found, _id: ${ref}`)
  }
  const label = await translate(object.$lookup._class.shortLabel, {})
  return `${label}-${object.number}`
}
