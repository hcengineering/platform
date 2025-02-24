//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
import { readFile } from 'fs/promises'
import { lookup } from 'mime-types'
import { extract } from '../extractors'

describe('extractor-tests', () => {
  it('check docx', async () => {
    const fName = './demo/Резюме Власова Анатолия.docx'
    const data = await readFile(fName)
    const type = lookup(fName)

    const { matched, content } = await extract(fName, type, data)

    expect(matched).toBe(true)
    expect(content).toContain('садовник')
    expect(content).toContain('Власов Анатолий')
  })
  it('check pdf', async () => {
    const fName = './demo/pdf1.pdf'
    const data = await readFile(fName)
    const type = lookup(fName)

    const { matched, content } = await extract(fName, type, data)

    expect(matched).toBe(true)
    expect(content).toContain('kibana')
    expect(content).toContain('Automation tests')
  })
})
