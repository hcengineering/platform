import { Attrs, MarkupNode } from '@hcengineering/text-core'

export function traverseMarkupNode (node: MarkupNode, f: (el: MarkupNode) => void): void {
  f(node)
  node.content?.forEach((c) => {
    traverseMarkupNode(c, f)
  })
}

export function messageContent (node: MarkupNode): MarkupNode[] {
  return node?.content ?? []
}

export function nodeAttrs (node: MarkupNode): Attrs {
  return node.attrs ?? {}
}
