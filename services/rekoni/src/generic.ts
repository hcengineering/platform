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
import parsePhoneNumber from 'libphonenumber-js'
import { lowePossibleSkills, parseSkillsRaw } from './skills'
import { ReconiDocument, RekoniModel } from './types'
import { getLineItems, handleSkills } from './utils'

export function parseGenericResume (text: RekoniModel, resume: ReconiDocument): void {
  const sorted = [...text.lines]
  sorted.sort((a, b) => b.height - a.height)

  const title = sorted.shift()
  if (title !== undefined) {
    const titems = getLineItems(title.items, true).filter((t) => t.length > 0)
    if (titems.length >= 2) {
      resume.lastName = titems[0]
      resume.firstName = titems.slice(1).join(' ')
    } else if (titems.length === 1) {
      const ti = titems[0].split(' ')
      if (ti.length >= 2) {
        resume.lastName = ti[0]
        resume.firstName = ti.slice(1).join(' ')
      }
    }
  }
  let skillsHeight = 0
  let skills = false
  for (const t of text.lines) {
    const line = getLineItems(t.items, false).join('').trim()
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

    if (t.height !== skillsHeight) {
      if (skillsHeight === -1) {
        skillsHeight = t.height
      } else {
        skills = false
      }
    }
    if (t.items.length > 0) {
      const first = t.items[0].toLowerCase()
      if (first === 'навыки' || first === 'skills' || first === 'skills & expertise') {
        skills = true
        skillsHeight = t.height
        handleSkills(t.items.slice(1), resume, (ss) => lowePossibleSkills.has(ss.toLowerCase()))
        if (resume.skills.length === 0) {
          // No skills on this line, skipping it.
          skillsHeight = -1
        }
      } else if (skills) {
        handleSkills(t.items, resume, (ss) => lowePossibleSkills.has(ss.toLowerCase()))
      }
    }
  }
  parseSkillsRaw(resume, text)
}
