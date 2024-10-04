//
// Copyright © 2024 Hardcore Engineering Inc.
//
//

import { Doc, concatLink } from '@hcengineering/core'
import { Document, documentId } from '@hcengineering/document'
import { getMetadata } from '@hcengineering/platform'
import { workbenchId } from '@hcengineering/workbench'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import slugify from 'slugify'

function getDocumentId (doc: Document): string {
  const slug = slugify(doc.title, { lower: true })
  return `${slug}-${doc._id}`
}

/**
 * @public
 */
export async function documentHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const document = doc as Document
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.workspaceUrl}/${documentId}/${getDocumentId(document)}`
  const link = concatLink(front, path)
  return `<a href="${link}">${document.title}</a>`
}

export async function documentLinkIdProvider (doc: Document): Promise<string> {
  return getDocumentId(doc)
}

/**
 * @public
 */
export async function documentTextPresenter (doc: Doc): Promise<string> {
  const document = doc as Document
  return document.title
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    DocumentHTMLPresenter: documentHTMLPresenter,
    DocumentTextPresenter: documentTextPresenter,
    DocumentLinkIdProvider: documentLinkIdProvider
  }
})
