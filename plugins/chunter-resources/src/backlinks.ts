import { Backlink, Comment } from '@anticrm/chunter'
import contact, { EmployeeAccount } from '@anticrm/contact'
import { Account, Class, Client, Data, Doc, DocumentQuery, Ref, TxOperations } from '@anticrm/core'
import chunter from './plugin'

export async function getUser (client: Client, user: Ref<EmployeeAccount> | Ref<Account>): Promise<EmployeeAccount | undefined> {
  return await client.findOne(contact.class.EmployeeAccount, { _id: user as Ref<EmployeeAccount> })
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
  return current.getDate() === target.getDate() && current.getMonth() === target.getMonth() && current.getFullYear() === target.getFullYear()
}

function extractBacklinks (backlinkId: Ref<Doc>, backlinkClass: Ref<Class<Doc>>, attachedDocId: Ref<Doc> | undefined, message: string, kids: NodeListOf<ChildNode>): Array<Data<Backlink>> {
  const result: Array<Data<Backlink>> = []

  const nodes: Array<NodeListOf<ChildNode>> = [kids]
  while (true) {
    const nds = nodes.shift()
    if (nds === undefined) {
      break
    }
    nds.forEach((kid) => {
      if (kid.nodeType === Node.ELEMENT_NODE && (kid as HTMLElement).localName === 'span') {
        const el = kid as HTMLElement
        const ato = el.getAttribute('data-id') as Ref<Doc>
        const atoClass = el.getAttribute('data-objectclass') as Ref<Class<Doc>>
        const e = result.find(e => e.attachedTo === ato && e.attachedToClass === atoClass)
        if (e === undefined) {
          result.push({
            attachedTo: ato,
            attachedToClass: atoClass,
            collection: 'backlinks',
            backlinkId,
            backlinkClass,
            message,
            attachedDocId
          })
        }
      }
      nodes.push(kid.childNodes)
    })
  }
  return result
}

export function getBacklinks (backlinkId: Ref<Doc>, backlinkClass: Ref<Class<Doc>>, attachedDocId: Ref<Doc> | undefined, content: string): Array<Data<Backlink>> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'application/xhtml+xml')
  return extractBacklinks(backlinkId, backlinkClass, attachedDocId, content, doc.childNodes as NodeListOf<HTMLElement>)
}

export async function createBacklinks (client: TxOperations, backlinkId: Ref<Doc>, backlinkClass: Ref<Class<Doc>>, attachedDocId: Ref<Doc> | undefined, content: string): Promise<void> {
  const backlinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)
  for (const backlink of backlinks) {
    const { attachedTo, attachedToClass, collection, ...adata } = backlink
    await client.addCollection(chunter.class.Backlink, chunter.space.Backlinks, attachedTo, attachedToClass, collection, adata)
  }
}
export async function updateBacklinks (client: TxOperations, backlinkId: Ref<Doc>, backlinkClass: Ref<Class<Doc>>, attachedDocId: Ref<Doc> | undefined, content: string): Promise<void> {
  const q: DocumentQuery<Backlink> = { backlinkId, backlinkClass }
  if (attachedDocId !== undefined) {
    q.attachedDocId = attachedDocId
  }
  const current = await client.findAll(chunter.class.Backlink, q)
  const backlinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)

  // We need to find ones we need to remove, and ones we need to update.
  for (const c of current) {
    // Find existing and check if we need to update message.
    const pos = backlinks.findIndex(b => b.backlinkId === c.backlinkId && b.backlinkClass === c.backlinkClass)
    if (pos !== -1) {
      // We need to check and update if required.
      const data = backlinks[pos]
      if (c.message !== data.message) {
        await client.updateCollection(c._class, c.space, c._id, c.attachedTo, c.attachedToClass, c.collection, { message: data.message })
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
    await client.addCollection(chunter.class.Backlink, chunter.space.Backlinks, attachedTo, attachedToClass, collection, adata)
  }
}
