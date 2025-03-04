//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { Branding, generateUuid, PersonUuid, TxOperations, WorkspaceIds, WorkspaceUuid } from '@hcengineering/core'
import { MarkupMarkType, MarkupNode, MarkupNodeType, traverseNode } from '@hcengineering/text'
import { getPublicLink } from '@hcengineering/server-guest-resources'
import { Task } from '@hcengineering/task'
import { generateToken } from '@hcengineering/server-token'

const githubLinkText = process.env.LINK_TEXT ?? 'Huly&reg;:'

const githubLinkTextOld = 'View in Huly'

export function hasHulyLinkText (text: string): boolean {
  return text.includes(githubLinkText) || text.includes(githubLinkTextOld)
}

export function hasHulyLink (href: string, guestLink: string): boolean {
  return href.includes(guestLink)
}

export async function stripGuestLink (markdown: MarkupNode): Promise<void> {
  const toRemove: MarkupNode[] = []

  traverseNode(markdown, (node) => {
    if (node.content === undefined) {
      return false
    }
    const oldLength = node.content.length
    node.content = node.content.filter((it) => it.type !== MarkupNodeType.subLink)

    // sub is an inline node hence tiptap wraps it with a paragraph
    // so we need to remove the parent paragraph node if it is empty
    if (node.content.length !== oldLength && node.type === MarkupNodeType.paragraph) {
      toRemove.push(node)
    }

    return true
  })

  // traverse nodes once again and remove empty parent node
  traverseNode(markdown, (node) => {
    if (node.content === undefined) {
      return false
    }
    node.content = node.content.filter((it) => !toRemove.includes(it))

    return true
  })
}
export async function appendGuestLink (
  client: TxOperations,
  doc: Task,
  markdown: MarkupNode,
  workspace: WorkspaceIds,
  branding: Branding | null
): Promise<void> {
  const publicLink = await getPublicLink(doc, client, workspace, false, branding)
  await stripGuestLink(markdown)
  appendGuestLinkToModel(markdown, publicLink, doc.identifier)
  appendGuestLinkToImage(markdown, workspace.uuid)
}

export function appendGuestLinkToModel (markdown: MarkupNode, publicLink: string, identifier: string): void {
  markdown.content = [
    ...(markdown.content ?? []),
    {
      type: MarkupNodeType.paragraph,
      content: [
        {
          type: MarkupNodeType.subLink,
          content: [
            {
              type: MarkupNodeType.text,
              text: githubLinkText.trim() + ' <b>' + identifier + '</b>',
              marks: [{ type: MarkupMarkType.link, attrs: { href: publicLink, _target: '_blank' } }]
            }
          ]
        }
      ]
    }
  ]
}

function findImageTags (node: MarkupNode): MarkupNode[] {
  if (node.type === MarkupNodeType.paragraph) {
    return node.content?.flatMap(findImageTags) ?? []
  }
  if (node.type === MarkupNodeType.image) {
    return [node]
  }
  return []
}

export function appendGuestLinkToImage (markdown: MarkupNode, workspace: WorkspaceUuid): void {
  const imageTags: MarkupNode[] = markdown.content?.flatMap(findImageTags) ?? []

  if (imageTags.length === 0) {
    return
  }

  const id = generateUuid() as PersonUuid
  const token = generateToken(id, workspace, { linkId: id, guest: 'true' })

  for (const imageTag of imageTags) {
    const src = imageTag.attrs?.src
    if (src !== undefined && imageTag.attrs !== undefined) {
      imageTag.attrs.token = token
    }
  }
}
