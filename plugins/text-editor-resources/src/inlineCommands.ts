import { jsonToMarkup, type MarkupNode, MarkupNodeType, markupToJSON } from '@hcengineering/text'
import type { Markup } from '@hcengineering/core'

function excludeNodesByType (node: MarkupNode, nodeTypeToExclude: MarkupNodeType): MarkupNode {
  const filterNodes = (node: MarkupNode): MarkupNode | undefined => {
    if (node.type !== nodeTypeToExclude) {
      const children: MarkupNode[] = []

      ;(node.content ?? []).forEach((child) => {
        const filteredChild = filterNodes(child)
        if (filteredChild != null) {
          children.push(filteredChild)
        }
      })

      return {
        ...node,
        content: children
      }
    }

    return undefined
  }

  return filterNodes(node) ?? node
}

export function parseInlineCommands (
  markup: Markup,
  argsCount: number
): {
    args: string[]
    markup: Markup
  } {
  const markupNode = markupToJSON(markup)
  const firstParagraph = (markupNode.content ?? [])[0]
  if (firstParagraph?.content === undefined) {
    return { args: [], markup }
  }
  const args: string[] = []

  let nodeIndex = 0
  let needArgs = argsCount

  for (const node of firstParagraph.content) {
    if (needArgs <= 0) break
    const text = node.type === MarkupNodeType.text ? node.text?.trim() ?? '' : ''

    if (text !== '') {
      const newArgs = text.split(' ').slice(0, needArgs)
      const textArgs = newArgs.join(' ')
      needArgs -= newArgs.length
      args.push(...newArgs)
      if (firstParagraph.content[nodeIndex]?.text != null) {
        const newText = text.substring(textArgs.length)
        if (newText === '') {
          firstParagraph.content = firstParagraph.content.filter((x, i) => nodeIndex !== i)
        } else {
          firstParagraph.content[nodeIndex].text = newText === '' ? ' ' : newText
        }
      }
    }
    nodeIndex++
  }

  return { args, markup: jsonToMarkup(excludeNodesByType(markupNode, MarkupNodeType.inlineCommand)) }
}
