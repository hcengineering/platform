
import { Backlink, Class, Data, Doc, Ref } from './classes'

/**
 * @public
 */
export const BACKLINK_COLLECTION = 'backlinks'

/**
 * @public
 */
export function extractBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Array<Data<Backlink>> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'application/xhtml+xml')
  return parseBacklinks(backlinkId, backlinkClass, attachedDocId, content, doc.childNodes as NodeListOf<HTMLElement>)
}

function parseBacklinks (
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
      if (kid.nodeType === Node.ELEMENT_NODE && (kid as HTMLElement).localName === 'span') {
        const el = kid as HTMLElement
        const ato = el.getAttribute('data-id') as Ref<Doc>
        const atoClass = el.getAttribute('data-objectclass') as Ref<Class<Doc>>
        const e = result.find((e) => e.attachedTo === ato && e.attachedToClass === atoClass)
        if (e === undefined) {
          result.push({
            attachedTo: ato,
            attachedToClass: atoClass,
            collection: BACKLINK_COLLECTION,
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
