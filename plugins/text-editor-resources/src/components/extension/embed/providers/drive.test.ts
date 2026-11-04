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

import drive, { type File, type FileVersion } from '@hcengineering/drive'
import presentation, { getClient, FilePreview } from '@hcengineering/presentation'
import { setMetadata } from '@hcengineering/platform'
import { getCurrentLocation, type Location } from '@hcengineering/ui'
import type { Editor } from '@tiptap/core'
import { SvelteRenderer } from '../../../node-view'
import { parseReferenceUrl } from '../../reference'
import { DriveEmbedProvider } from './drive'

jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { FrontUrl: 'front-url' } },
  FilePreview: 'file-preview',
  getClient: jest.fn()
}))
jest.mock('@hcengineering/ui', () => ({
  getCurrentLocation: jest.fn(),
  locationToUrl: jest.fn(() => '/workbench/workspace/drive/file/file')
}))
jest.mock('../../../node-view', () => ({
  SvelteRenderer: jest.fn(() => ({ destroy: jest.fn() }))
}))
jest.mock('../../reference', () => ({ parseReferenceUrl: jest.fn() }))
jest.mock('../../toolbar/toolbar', () => ({ setLoadingState: jest.fn() }))

describe('Drive embedded preview mounting', () => {
  it('passes the inherited rendering context without selecting a print-specific viewer', async () => {
    setMetadata(presentation.metadata.FrontUrl, 'https://front.example')
    const file: Partial<File> = { _id: 'file' as File['_id'], version: 1 }
    const version: Partial<FileVersion> = {
      file: 'blob' as FileVersion['file'],
      type: 'application/pdf',
      title: 'file.pdf'
    }
    const reference: NonNullable<ReturnType<typeof parseReferenceUrl>> = {
      id: file._id!,
      objectclass: drive.class.File,
      label: 'file'
    }
    const client: Partial<ReturnType<typeof getClient>> = {
      findOne: jest.fn().mockResolvedValueOnce(file).mockResolvedValueOnce(version)
    }
    const location: Location = { path: ['print', 'workspace'] }
    jest.mocked(getClient).mockReturnValue(client as ReturnType<typeof getClient>)
    jest.mocked(getCurrentLocation).mockReturnValue(location)
    jest.mocked(parseReferenceUrl).mockReturnValue(reference)
    const view = await DriveEmbedProvider().buildView('reference')
    expect(view).toBeDefined()
    const context = new Map<unknown, unknown>([[Symbol('inherited-context'), 'value']])
    const editor: Partial<Editor> = {}
    const root: Partial<HTMLDivElement> = {}
    view?.(editor as Editor, root as HTMLDivElement, () => 0, context)
    expect(SvelteRenderer).toHaveBeenCalledWith(
      FilePreview,
      expect.objectContaining({
        context,
        props: expect.objectContaining({ file: version.file, contentType: version.type })
      })
    )
    const passed = jest.mocked(SvelteRenderer).mock.calls[0][1]
    expect(passed.context).toBe(context)
    expect(passed.props).not.toHaveProperty('printContext')
  })
})
