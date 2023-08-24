import { Backlink } from '@hcengineering/chunter'
import { Data, DocumentQuery, TxOperations } from '@hcengineering/core'
import chunter from './plugin'

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
