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

import addrs from 'email-addresses'
import Jimp from 'jimp'
import parsePhoneNumber from 'libphonenumber-js'
import { parseSkillsRaw } from './skills'
import { type ReconiDocument, type RekoniModel } from './types'
import { getLineItems, handleSkills } from './utils'

export async function isHeadHunter (model: RekoniModel): Promise<boolean> {
  const hh1 =
    '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'
  const hh2 =
    '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'

  const hhLogo1 = await Jimp.read(Buffer.from(hh1, 'base64'))
  const hhLogo2 = await Jimp.read(Buffer.from(hh2, 'base64'))

  for (const imgData of model.images) {
    if (imgData.width < 15 || imgData.height < 15) {
      continue
    }
    const img = await Jimp.read(imgData.pngBuffer)
    const d1 = Jimp.diff(hhLogo1, img)
    const d2 = Jimp.diff(hhLogo2, img)
    if (d1.percent < 0.01 || d2.percent < 0.01) {
      imgData.potentialAvatar = false
      return true
    }
  }
  return false
}

export function parseHeadHunter (text: RekoniModel, resume: ReconiDocument): void {
  const sorted = [...text.lines]
  sorted.sort((a, b) => b.height - a.height)

  const title = sorted.shift()
  if (title !== undefined) {
    const titems = getLineItems(title.items, true).filter((t) => t.length > 0)
    if (titems.length >= 2) {
      resume.lastName = titems[0]
      resume.firstName = titems.slice(1).join(' ')
    }
    if (titems.length === 1) {
      const ti = titems[0].split(' ')
      if (ti.length >= 2) {
        resume.lastName = ti[0]
        resume.firstName = ti.slice(1).join(' ')
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const position = sorted.shift()
    if (position !== undefined) {
      const positionText = getLineItems(position.items, true).join('').trim()
      if (positionText.length > 0 && positionText.match(/\d\d+/) === null) {
        resume.title = positionText
        break
      }
    }
  }

  let skills = false
  let skillsHeight = 0
  let parseValues = true
  for (const t of text.lines) {
    const line = getLineItems(t.items, false).join('').trim()
    if (line.toLowerCase().includes('опыт работы')) {
      parseValues = false
      continue
    }
    if (parseValues) {
      if (resume.phone === undefined) {
        const phone = parsePhoneNumber(line)
        if (phone !== undefined) {
          resume.phone = phone.formatInternational()
        }
      }

      if (resume.email === undefined) {
        for (const ll of line.split(' ')) {
          const parsedddr = addrs.parseOneAddress(ll)
          if (parsedddr != null) {
            resume.email = ll
            break
          }
        }
      }

      const twoDots = line.indexOf(':')
      if (twoDots > 0) {
        const first = line.slice(0, twoDots).trim().toLowerCase()
        const value = line.slice(twoDots + 1).trim()
        if (first === 'проживает' || first === 'residential address' || first === 'reside in') {
          resume.city = value
        } else if (first === 'skype') {
          resume.skype = value
        } else if (first === 'linkedin') {
          resume.linkedin = value
        } else if (first === 'github') {
          resume.github = value
        } else if (first === 'facebook') {
          resume.facebook = value
        } else if (first.startsWith('другой сайт')) {
          if (value.includes('github.com')) {
            resume.github = value
          }
          if (value.includes('linkedin.')) {
            resume.linkedin = value
          }
        }
      }
    }
    if (t.height !== skillsHeight) {
      if (skillsHeight === -1) {
        skillsHeight = t.height
      } else {
        skills = false
      }
    }
    if (t.items.length > 0) {
      const first = t.items[0].toLowerCase()
      if (first === 'навыки' || first === 'skills') {
        skills = true
        skillsHeight = t.height
        handleSkills(t.items.slice(1), resume)
        if (resume.skills.length === 0) {
          // No skills on this line, skipping it.
          skillsHeight = -1
        }
      } else if (skills) {
        handleSkills(t.items, resume)
      }
    }
  }
  parseSkillsRaw(resume, text)
}
