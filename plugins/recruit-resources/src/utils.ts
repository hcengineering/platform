import core, { Doc, Ref, TxOperations } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { Applicant, Candidate } from '@hcengineering/recruit'
import { getPanelURI } from '@hcengineering/ui'
import view from '@hcengineering/view'
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

export async function objectIdProvider (doc: Applicant | Candidate): Promise<string> {
  const client = getClient()
  return await getApplicationTitle(client, doc._id)
}

export async function objectLinkProvider (doc: Applicant | Candidate): Promise<string> {
  return await Promise.resolve(
    `${window.location.href}#${getPanelURI(view.component.EditDoc, doc._id, doc._class, 'content')}`
  )
}
