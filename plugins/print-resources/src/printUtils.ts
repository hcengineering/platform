// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Class, Client, Doc, Ref } from '@hcengineering/core'
import type { Location } from '@hcengineering/ui'
import { Analytics } from '@hcengineering/analytics'
import guest, { type PublicLink, createPublicLink } from '@hcengineering/guest'
import view from '@hcengineering/view'
import { getDocTitle, getObjectLinkFragment } from '@hcengineering/view-resources'
import { getMetadata } from '@hcengineering/platform'
import presentation, { getFileUrl } from '@hcengineering/presentation'
import { printToPDF } from '@hcengineering/print'
import { signPDF } from '@hcengineering/sign'

export interface PdfResult {
  blobId: string
  title: string
  error?: string
}

export interface PrintAllOptions {
  onProgress: (current: number, total?: number) => void
  getCancelled: () => boolean
}

/**
 * Get or create a public link for a document (for print/share).
 * Returns the link if it exists or after creating it; the link's url may be set asynchronously by the server.
 */
export async function ensurePublicLink (client: Client, doc: Doc): Promise<PublicLink | undefined> {
  const existing = await client.findOne(guest.class.PublicLink, { attachedTo: doc._id })
  if (existing?.url !== undefined && existing.url !== '') {
    return existing
  }
  if (existing === undefined) {
    const location = await getObjectLocation(client, doc)
    await createPublicLink(client as any, doc, location)
  }
  const link = await client.findOne(guest.class.PublicLink, { attachedTo: doc._id })
  return link?.url !== undefined && link.url !== '' ? link : undefined
}

async function getObjectLocation (client: Client, obj: Doc): Promise<Location> {
  const hierarchy = client.getHierarchy()
  const panelComponent = hierarchy.classHierarchyMixin(obj._class, view.mixin.ObjectPanel)
  const comp = panelComponent?.component ?? view.component.EditDoc
  return await getObjectLinkFragment(hierarchy, obj, {}, comp)
}

/**
 * Get a document title suitable for use as PDF filename (with .pdf extension).
 */
export async function getDocTitleForPdf (
  client: Client,
  docId: Ref<Doc>,
  docClass: Ref<Class<Doc>>,
  doc?: Doc
): Promise<string> {
  const value = (await getDocTitle(client, docId, docClass, doc)) ?? ''
  return value !== '' ? value + '.pdf' : 'document.pdf'
}

/**
 * Print multiple documents to PDF (one per document). Calls onProgress and getCancelled for progress and cancellation.
 */
export async function printAll (
  client: Client,
  docs: Doc[],
  signed: boolean,
  options: PrintAllOptions
): Promise<PdfResult[]> {
  const token = getMetadata(presentation.metadata.Token) ?? ''
  const results: PdfResult[] = []
  for (let i = 0; i < docs.length; i++) {
    if (options.getCancelled()) break
    options.onProgress(i + 1, docs.length)
    const doc = docs[i]
    try {
      const link = await ensurePublicLink(client, doc)
      if (link?.url === undefined || link.url === '') {
        results.push({ blobId: '', title: '', error: 'Could not get public link' })
        continue
      }
      let blobId: string = await printToPDF(link.url, token)
      if (signed) {
        blobId = await signPDF(blobId, token)
      }
      const title = await getDocTitleForPdf(client, doc._id, doc._class, doc)
      results.push({ blobId, title, error: undefined })
    } catch (err: any) {
      Analytics.handleError(err)
      const title = await getDocTitleForPdf(client, doc._id, doc._class, doc).catch(() => 'document')
      results.push({ blobId: '', title, error: err?.message ?? String(err) })
    }
  }
  return results
}

/**
 * Trigger browser download of a single PDF result.
 */
export function downloadPdf (result: PdfResult): void {
  if (result.error !== undefined) return
  const url = getFileUrl(result.blobId, result.title)
  const a = document.createElement('a')
  a.href = url
  a.download = result.title
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Download all successful PDFs at once by triggering a download for each file
 * with a short delay between each so the browser does not block them.
 */
export async function downloadAllPdfs (results: PdfResult[]): Promise<void> {
  const successResults = results.filter((r) => r.error === undefined)
  if (successResults.length === 0) return
  for (let i = 0; i < successResults.length; i++) {
    const r = successResults[i]
    downloadPdf(r)
    if (i < successResults.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }
}
