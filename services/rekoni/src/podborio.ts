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

import { parseSkillsRaw } from './skills'
import { ReconiDocument, RekoniModel } from './types'
import { getLineItems } from './utils'

export function isPodborIO (text: RekoniModel): boolean {
  for (const ann of text.annotations) {
    if (ann.type === 'link') {
      const url = ann.value
      if (url.includes('app.podbor.io')) {
        return true
      }
    }
  }
  return false
}

export function parsePodborIO (text: RekoniModel, resume: ReconiDocument): void {
  for (const ann of text.annotations) {
    if (ann.type === 'link') {
      const url = ann.value
      if (url.includes('linkedin.')) {
        resume.linkedin = url
      }
      if (url.includes('github.')) {
        resume.github = url
      }
    }
  }
  const sorted = [...text.lines].filter((a) => a.items.map((d) => d.trim()).join('').length > 0)
  sorted.sort((a, b) => b.height - a.height)
  const title = sorted.shift()
  if (title !== undefined) {
    const titems = getLineItems(title.items, true).filter((t) => t.length > 0)
    if (titems.length >= 2) {
      resume.firstName = titems[0] + titems.slice(2).join('')
      resume.lastName = titems[1]
    } else if (titems.length === 1) {
      const ti = titems[0].split(' ')
      if (ti.length >= 2) {
        resume.firstName = ti[0] + ti.slice(2).join(' ')
        resume.lastName = ti[1]
      }
    }
  }
  let socials = false
  let skills = false
  for (const t of text.lines) {
    const line = getLineItems(t.items, false).join('').trim()
    const twoDots = line.indexOf(':')
    let first = ''
    let value = ''
    if (twoDots > 0) {
      first = line.slice(0, twoDots).trim().toLowerCase()
      value = line.slice(twoDots + 1).trim()
    } else {
      first = t.items.length > 0 ? t.items[0].trim().toLowerCase() : ''
      value = t.items.length > 0 ? getLineItems(t.items.slice(1), false).join('').trim() : ''
    }
    parseAttribute(resume, first, value)

    if (first === 'соц.сети') {
      socials = true
      skills = false
      continue
    }
    if (first === 'навыки') {
      socials = false
      skills = true
      continue
    }
    if (first === 'опыт работы') {
      skills = false
      socials = false
      continue
    }

    if (skills) {
      for (const tt of t.items) {
        const ttv = tt.trim()
        if (ttv.length > 0 && resume.skills.findIndex((it) => it.toLowerCase() === ttv.toLowerCase()) === -1) {
          resume.skills.push(ttv)
        }
      }
    }

    if (socials) {
      for (const tt of t.items) {
        if (resume.linkedin === undefined && tt.includes('linkedin.')) {
          resume.linkedin = tt
        }
        if (resume.github === undefined && tt.includes('github.')) {
          resume.github = tt
        }
        if (resume.facebook === undefined && (tt.includes('facebook.') || tt.includes('fb.com'))) {
          resume.facebook = tt
        }
        if (resume.twitter === undefined && tt.includes('twitter.')) {
          resume.twitter = tt
        }
      }
    }
  }

  parseSkillsRaw(resume, text)
}
function parseAttribute (resume: ReconiDocument, first: string, value: string): void {
  if (first === 'город') {
    resume.city = value
  }
  if (first === 'текущие позиции') {
    const pos = value.indexOf(',')
    if (pos !== -1) {
      resume.title = value.substring(pos + 1).trim()
    } else {
      resume.title = value
    }
  }
  if (first === 'e-mail') {
    resume.email = value
  }
  if (first === 'skype') {
    resume.skype = value
  }
  if (first === 'телефон') {
    resume.phone = value
  }
  if (first === 'телеграм') {
    resume.telegram = value
  }
}
