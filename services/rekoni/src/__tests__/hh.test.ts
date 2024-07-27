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
import { extractDocument } from '../process'

describe('pdf-parse', () => {
  it('check hh6', async () => {
    const data = await readFile('./demo/hh_err1.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.format).toBe('unknown')
    expect(resume.firstName).toBe('Prosolupov')
    expect(resume.lastName).toBe('Dmitry')
    expect(resume.email).toBe('dmpros1987@gmail.com')
    expect(resume.phone).toBe('+7 919 117 62 97')
    expect(resume.avatarName).toBe('img_p0_1.jpeg')
  })
})
