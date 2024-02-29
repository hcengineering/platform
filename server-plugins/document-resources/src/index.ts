//
// Copyright © 2024 Hardcore Engineering Inc.
//
//

import { Doc, concatLink } from '@hcengineering/core'
import { Document, documentId } from '@hcengineering/document'
import { getMetadata } from '@hcengineering/platform'
import { workbenchId } from '@hcengineering/workbench'
import serverCore, { TriggerControl } from '@hcengineering/server-core'

/**
 * @public
 */
export async function documentHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const document = doc as Document
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.workspaceUrl}/${documentId}/${doc._id}`
  const link = concatLink(front, path)
  return `<a href="${link}">${document.name}</a>`
}

/**
 * @public
 */
export async function documentTextPresenter (doc: Doc): Promise<string> {
  const document = doc as Document
  return document.name
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    DocumentHTMLPresenter: documentHTMLPresenter,
    DocumentTextPresenter: documentTextPresenter
  }
})
