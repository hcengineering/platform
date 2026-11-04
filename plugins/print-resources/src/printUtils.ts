// Copyright © 2026 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
import { Analytics } from '@hcengineering/analytics'
import { getDocTitle } from '@hcengineering/view-resources'
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
      let blobId: string = await printToPDF(doc, token)
      if (signed) {
        blobId = await signPDF(blobId, token)
      }
      const title = await getDocTitleForPdf(client, doc._id, doc._class, doc)
      results.push({ blobId, title, error: undefined })
    } catch (err: any) {
      Analytics.handleError(err)
      const title = await getDocTitleForPdf(client, doc._id, doc._class, doc).catch(() => 'document')
      const errMessage = err?.message ?? String(err)
      results.push({ blobId: '', title, error: `${errMessage} (doc ${doc._id}, class ${doc._class})` })
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
