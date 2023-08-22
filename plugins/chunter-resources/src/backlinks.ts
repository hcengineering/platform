import { Backlink, getBacklinks } from '@hcengineering/chunter'
import contact, { PersonAccount } from '@hcengineering/contact'
import { Account, Class, Client, Data, Doc, DocumentQuery, Ref, TxOperations } from '@hcengineering/core'
import chunter from './plugin'

export async function getUser (
  client: Client,
  user: Ref<PersonAccount> | Ref<Account>
): Promise<PersonAccount | undefined> {
  return await client.findOne(contact.class.PersonAccount, { _id: user as Ref<PersonAccount> })
}

export function getTime (time: number): string {
  let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  if (!isToday(time)) {
    options = {
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  }

  return new Date(time).toLocaleString('default', options)
}

export function isToday (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return (
    current.getDate() === target.getDate() &&
    current.getMonth() === target.getMonth() &&
    current.getFullYear() === target.getFullYear()
  )
}

/**
 * @public
 */
export async function updateBacklinks (
  client: TxOperations,
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Promise<void> {
  const q: DocumentQuery<Backlink> = { backlinkId, backlinkClass, collection: 'backlinks' }
  if (attachedDocId !== undefined) {
    q.attachedDocId = attachedDocId
  }
  const backlinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)

  await updateBacklinksList(client, q, backlinks)
}
/**
 * @public
 */
export async function updateBacklinksList (
  client: TxOperations,
  q: DocumentQuery<Backlink>,
  backlinks: Array<Data<Backlink>>
): Promise<void> {
  const current = await client.findAll(chunter.class.Backlink, q)

  // We need to find ones we need to remove, and ones we need to update.
  for (const c of current) {
    // Find existing and check if we need to update message.
    const pos = backlinks.findIndex(
      (b) => b.backlinkId === c.backlinkId && b.backlinkClass === c.backlinkClass && b.attachedTo === c.attachedTo
    )
    if (pos !== -1) {
      // We need to check and update if required.
      const data = backlinks[pos]
      if (c.message !== data.message) {
        await client.updateCollection(c._class, c.space, c._id, c.attachedTo, c.attachedToClass, c.collection, {
          message: data.message
        })
      }
      backlinks.splice(pos, 1)
    } else {
      // We need to remove backlink.
      await client.removeCollection(c._class, c.space, c._id, c.attachedTo, c.attachedToClass, c.collection)
    }
  }
  // Add missing backlinks
  for (const backlink of backlinks) {
    const { attachedTo, attachedToClass, collection, ...adata } = backlink
    await client.addCollection(
      chunter.class.Backlink,
      chunter.space.Backlinks,
      attachedTo,
      attachedToClass,
      collection,
      adata
    )
  }
}
