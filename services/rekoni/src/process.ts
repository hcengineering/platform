//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { type TypedArray } from 'pdfjs-dist/types/src/display/api'
import { extractData } from './extractpdf'
import { parseGenericResume } from './generic'
import { isHeadHunter, parseHeadHunter } from './headhunter'
import { isPodborIO, parsePodborIO } from './podborio'
import { type ReconiDocument, type RekoniModel } from './types'
import { isLinkedin, parseLinkedin } from './linkedin'
import { capitalizeName } from './utils'

export async function extractDocument (
  data: string | TypedArray
): Promise<{ resume: ReconiDocument, model: RekoniModel }> {
  const resume: ReconiDocument = {
    format: 'unknown',
    firstName: '',
    lastName: '',
    skills: []
  }

  const text = await extractData(data)

  let format: 'headhunter' | 'unknown' | 'podbor' | 'linkedin' = 'unknown'

  if (isPodborIO(text)) {
    format = 'podbor'
  } else if (await isHeadHunter(text)) {
    format = 'headhunter'
  } else if (await isLinkedin(text)) {
    format = 'linkedin'
  }
  resume.format = format

  const curWh = { width: 0, height: 0 }
  for (const imgData of text.images) {
    if (imgData.width > 5 * imgData.height) {
      // skip, non avatar images.
      continue
    }
    if (!imgData.potentialAvatar) {
      continue
    }
    if (resume.avatar === undefined || (imgData.width > curWh.width && imgData.height > curWh.height)) {
      resume.avatar = imgData.buffer.toString('base64')
      resume.avatarName = imgData.name
      resume.avatarFormat = imgData.format
      curWh.width = imgData.width
      curWh.height = imgData.height
    }
  }

  if (format === 'podbor') {
    parsePodborIO(text, resume)
  } else if (format === 'headhunter') {
    parseHeadHunter(text, resume)
  } else if (format === 'linkedin') {
    parseLinkedin(text, resume)
  } else {
    // Try parse generic resume
    parseGenericResume(text, resume)
  }
  resume.lastName = capitalizeName(resume.lastName)
  resume.firstName = capitalizeName(resume.firstName)
  return { resume, model: text }
}
