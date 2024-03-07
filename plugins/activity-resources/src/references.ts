import core, {
  type Class,
  type Data,
  type Doc,
  type DocumentQuery,
  type Ref,
  type RelatedDocument,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import activity, { type ActivityReference } from '@hcengineering/activity'
import { type IntlString, translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import contact from '@hcengineering/contact'

async function updateReferencesList (
  client: TxOperations,
  q: DocumentQuery<ActivityReference>,
  references: Array<Data<ActivityReference>>,
  space: Ref<Space>
): Promise<void> {
  const currentRefs: ActivityReference[] = await client.findAll(activity.class.ActivityReference, q)

  // We need to find ones we need to remove, and ones we need to update.
  for (const c of currentRefs) {
    // Find existing and check if we need to update message.
    const pos = references.findIndex(
      (ref) => ref.srcDocId === c.srcDocId && ref.srcDocClass === c.srcDocClass && ref.attachedTo === c.attachedTo
    )
    if (pos !== -1) {
      // We need to check and update if required.
      const data = references[pos]
      if (c.message !== data.message) {
        await client.updateCollection(c._class, c.space, c._id, c.attachedTo, c.attachedToClass, c.collection, {
          message: data.message
        })
      }
      references.splice(pos, 1)
    } else {
      // We need to remove reference.
      await client.removeCollection(c._class, c.space, c._id, c.attachedTo, c.attachedToClass, c.collection)
    }
  }
  // Add missing references
  for (const ref of references) {
    const { attachedTo, attachedToClass, collection, ...adata } = ref
    await client.addCollection(activity.class.ActivityReference, space, attachedTo, attachedToClass, collection, adata)
  }
}

export async function updateReferences (
  source: Doc,
  key: string,
  target: RelatedDocument[],
  msg: IntlString
): Promise<void> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const message = await translate(msg, {})
  const references: Array<Data<ActivityReference>> = target
    .filter((it) => !hierarchy.isDerived(it._class, contact.class.Person))
    .map((it) => ({
      srcDocId: source._id,
      srcDocClass: source._class,
      attachedTo: it._id,
      attachedToClass: it._class,
      message,
      collection: key
    }))

  const query: DocumentQuery<ActivityReference> = { srcDocId: source._id, srcDocClass: source._class, collection: key }
  const space: Ref<Space> = hierarchy.isDerived(source._class, core.class.Space)
    ? (source._id as Ref<Space>)
    : source.space

  await updateReferencesList(client, query, references, space)
}

function extractReferences (
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  attachedDocClass: Ref<Class<Doc>> | undefined,
  kids: NodeListOf<ChildNode>
): Array<Data<ActivityReference>> {
  const result: Array<Data<ActivityReference>> = []

  const nodes: Array<NodeListOf<ChildNode>> = [kids]
  while (true) {
    const nds = nodes.shift()
    if (nds === undefined) {
      break
    }
    nds.forEach((kid) => {
      if (
        kid.nodeType === Node.ELEMENT_NODE &&
        (kid as HTMLElement).localName === 'span' &&
        (kid as HTMLElement).getAttribute('data-type') === 'reference'
      ) {
        const el = kid as HTMLElement
        const ato = el.getAttribute('data-id') as Ref<Doc>
        const atoClass = el.getAttribute('data-objectclass') as Ref<Class<Doc>>
        const e = result.find((e) => e.attachedTo === ato && e.attachedToClass === atoClass)
        if (e === undefined && ato !== attachedDocId && ato !== srcDocId) {
          result.push({
            attachedTo: ato,
            attachedToClass: atoClass,
            collection: 'references',
            srcDocId,
            srcDocClass,
            message: el.parentElement?.innerHTML ?? '',
            attachedDocId,
            attachedDocClass
          })
        }
      }
      nodes.push(kid.childNodes)
    })
  }
  return result
}

/**
 * @public
 */
export function getReferences (
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  attachedDocClass: Ref<Class<Doc>> | undefined,
  content: string
): Array<Data<ActivityReference>> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')

  return extractReferences(
    srcDocId,
    srcDocClass,
    attachedDocId,
    attachedDocClass,
    doc.childNodes as NodeListOf<HTMLElement>
  )
}

/**
 * @public
 */
export async function createReferences (
  client: TxOperations,
  srcDocId: Ref<Doc>,
  srcDocClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  attachedDocClass: Ref<Class<Doc>> | undefined,
  content: string,
  space: Ref<Space>
): Promise<void> {
  const hierarchy = client.getHierarchy()

  const references = getReferences(srcDocId, srcDocClass, attachedDocId, attachedDocClass, content)
  for (const ref of references) {
    if (hierarchy.isDerived(ref.attachedToClass, contact.class.Person)) {
      continue
    }

    const { attachedTo, attachedToClass, collection, ...adata } = ref
    await client.addCollection(activity.class.ActivityReference, space, attachedTo, attachedToClass, collection, adata)
  }
}
