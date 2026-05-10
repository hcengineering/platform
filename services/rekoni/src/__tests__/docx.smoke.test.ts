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

import { readFile } from 'fs/promises'
import { join } from 'path'
import { extract } from '../extractors'

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

describe('docx extractor smoke', () => {
  it('extracts plain text from a minimal docx', async () => {
    const fName = join(__dirname, 'fixtures', 'minimal-smoke.docx')
    const data = await readFile(fName)

    const { matched, content, error } = await extract('minimal-smoke.docx', DOCX_TYPE, data)

    expect(error).toBeUndefined()
    expect(matched).toBe(true)
    expect(content).toContain('Hello DOCX smoke test')
  })
})
