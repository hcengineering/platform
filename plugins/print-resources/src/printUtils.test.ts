//
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
//

import type { Client, Doc, Ref, Class, Space, PersonId, TxOperations } from '@hcengineering/core'
import { printToPDF } from '@hcengineering/print'
import { signPDF } from '@hcengineering/sign'
import { printAll, type PrintAllOptions } from './printUtils'

jest.mock('@hcengineering/analytics', () => ({ Analytics: { handleError: jest.fn() } }))
jest.mock('@hcengineering/platform', () => ({ getMetadata: jest.fn(() => 'token') }))
jest.mock('@hcengineering/print', () => ({ printToPDF: jest.fn() }))
jest.mock('@hcengineering/sign', () => ({ signPDF: jest.fn() }))
jest.mock('@hcengineering/view-resources', () => ({ getDocTitle: jest.fn(async () => 'Document') }))
jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { Token: 'token' } },
  getFileUrl: jest.fn()
}))

const doc: Doc = {
  _id: 'document' as Ref<Doc>,
  _class: 'test:class:Document' as Ref<Class<Doc>>,
  space: 'space' as Ref<Space>,
  modifiedBy: 'person' as PersonId,
  modifiedOn: 1
}
const client: Partial<Client> & Pick<TxOperations, 'createDoc'> = { findOne: jest.fn(), createDoc: jest.fn() }
const options: PrintAllOptions = { onProgress: jest.fn(), getCancelled: () => false }

describe('authenticated document printing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(printToPDF).mockResolvedValue('pdf')
    jest.mocked(signPDF).mockResolvedValue('signed-pdf')
  })

  it('prints the target without creating or looking up public links', async () => {
    const result = await printAll(client as Client, [doc], false, options)
    expect(printToPDF).toHaveBeenCalledWith(doc, 'token')
    expect(client.findOne).not.toHaveBeenCalled()
    expect(client.createDoc).not.toHaveBeenCalled()
    expect(result).toEqual([{ blobId: 'pdf', title: 'Document.pdf', error: undefined }])
  })

  it('signs only the successfully rendered PDF', async () => {
    const result = await printAll(client as Client, [doc], true, options)
    expect(signPDF).toHaveBeenCalledWith('pdf', 'token')
    expect(result[0].blobId).toBe('signed-pdf')
  })

  it('reports per-document failures without attempting a signature', async () => {
    jest.mocked(printToPDF).mockRejectedValue(new Error('Document unavailable'))
    const result = await printAll(client as Client, [doc], true, options)
    expect(result[0].error).toContain('Document unavailable')
    expect(result[0].blobId).toBe('')
    expect(signPDF).not.toHaveBeenCalled()
  })

  it('does not begin a cancelled export', async () => {
    const result = await printAll(client as Client, [doc], false, { ...options, getCancelled: () => true })
    expect(result).toEqual([])
    expect(printToPDF).not.toHaveBeenCalled()
  })
})
