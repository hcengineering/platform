//
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
//

import { expect } from '@playwright/test'
import { readFile } from 'fs/promises'
import { PDFDocument } from 'pdf-lib'

const PDF_MAGIC = Buffer.from('%PDF-')

/** Minimum file size so we do not treat a tiny error payload as a valid print result. */
const MIN_PDF_BYTES = 2048

/**
 * Loads a PDF from disk and asserts it is non-empty and has at least `minPages` pages.
 * @returns Parsed page count
 */
export async function assertPdfHasMinPages (filePath: string, minPages: number): Promise<number> {
  const bytes = await readFile(filePath)
  expect(bytes.byteLength, 'downloaded print file should not be trivially small').toBeGreaterThanOrEqual(MIN_PDF_BYTES)
  expect(Buffer.compare(bytes.subarray(0, PDF_MAGIC.length), PDF_MAGIC), 'downloaded file should be a PDF').toBe(0)

  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()
  expect(pageCount, `printed PDF should have at least ${minPages} page(s)`).toBeGreaterThanOrEqual(minPages)
  return pageCount
}
