import contact, { type Person } from '@hcengineering/contact'
import { type Doc, type Space, type Ref } from '@hcengineering/core'
import { type MarkupNode, MarkupNodeType } from '@hcengineering/text'

export interface MarkdownPreprocessor {
  process: (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>) => MarkupNode
}

export class NoopMarkdownPreprocessor implements MarkdownPreprocessor {
  process (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): MarkupNode {
    return json
  }
}

export abstract class BaseMarkdownPreprocessor implements MarkdownPreprocessor {
  protected readonly MENTION_REGEX = /@([A-Za-z]+ [A-Za-z]+)/g

  constructor (protected readonly personsByName: Map<string, Ref<Person>>) {}

  abstract process (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): MarkupNode

  protected processMentions (node: MarkupNode): void {
    if (node.type !== MarkupNodeType.paragraph || node.content === undefined) return

    const newContent: MarkupNode[] = []
    for (const childNode of node.content) {
      if (childNode.type === MarkupNodeType.text && childNode.text !== undefined) {
        this.processMentionTextNode(childNode, newContent)
      } else {
        newContent.push(childNode)
      }
    }
    node.content = newContent
  }

  protected processMentionTextNode (node: MarkupNode, newContent: MarkupNode[]): void {
    if (node.text === undefined) return

    let match
    let lastIndex = 0
    let hasMentions = false

    while ((match = this.MENTION_REGEX.exec(node.text)) !== null) {
      hasMentions = true
      this.addTextBeforeMention(newContent, node, lastIndex, match.index)
      this.addMentionNode(newContent, match[1], node)
      lastIndex = this.MENTION_REGEX.lastIndex
    }

    if (hasMentions) {
      this.addRemainingText(newContent, node, lastIndex)
    } else {
      newContent.push(node)
    }
  }

  protected addTextBeforeMention (newContent: MarkupNode[], node: MarkupNode, lastIndex: number, matchIndex: number): void {
    if (node.text === undefined) return
    if (matchIndex > lastIndex) {
      newContent.push({
        type: MarkupNodeType.text,
        text: node.text.slice(lastIndex, matchIndex),
        marks: node.marks,
        attrs: node.attrs
      })
    }
  }

  protected addMentionNode (newContent: MarkupNode[], name: string, originalNode: MarkupNode): void {
    const personRef = this.personsByName.get(name)
    if (personRef !== undefined) {
      newContent.push({
        type: MarkupNodeType.reference,
        attrs: {
          id: personRef,
          label: name,
          objectclass: contact.class.Person
        }
      })
    } else {
      newContent.push({
        type: MarkupNodeType.text,
        text: `@${name}`,
        marks: originalNode.marks,
        attrs: originalNode.attrs
      })
    }
  }

  protected addRemainingText (newContent: MarkupNode[], node: MarkupNode, lastIndex: number): void {
    if (node.text !== undefined && lastIndex < node.text.length) {
      newContent.push({
        type: MarkupNodeType.text,
        text: node.text.slice(lastIndex),
        marks: node.marks,
        attrs: node.attrs
      })
    }
  }
}
