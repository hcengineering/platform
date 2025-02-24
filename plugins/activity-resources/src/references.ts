import core, {
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
