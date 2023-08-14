import { Class, Data, Doc, Ref, TxOperations } from '@hcengineering/core'
import chunter, { Backlink } from '.'

function extractBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  message: string,
  kids: NodeListOf<ChildNode>
): Array<Data<Backlink>> {
  const result: Array<Data<Backlink>> = []

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
        if (e === undefined && ato !== attachedDocId && ato !== backlinkId) {
          result.push({
            attachedTo: ato,
            attachedToClass: atoClass,
            collection: 'backlinks',
            backlinkId,
            backlinkClass,
            message: el.parentElement?.innerHTML ?? '',
            attachedDocId
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
export function getBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Array<Data<Backlink>> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')
  return extractBacklinks(backlinkId, backlinkClass, attachedDocId, content, doc.childNodes as NodeListOf<HTMLElement>)
}

/**
 * @public
 */
export async function createBacklinks (
  client: TxOperations,
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Promise<void> {
  const backlinks = getBacklinks(backlinkId, backlinkClass, attachedDocId, content)
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
