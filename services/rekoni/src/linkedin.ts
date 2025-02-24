//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { findPhoneNumbersInText } from 'libphonenumber-js'
import { parseSkillsRaw } from './skills'
import { ReconiDocument, RekoniItem, RekoniModel } from './types'
import { getLineItems, handleSkills } from './utils'

export async function isLinkedin (model: RekoniModel): Promise<boolean> {
  return model.author === 'LinkedIn'
}

export function parseLinkedin (text: RekoniModel, resume: ReconiDocument): void {
  let titleIndex = -1
  let titleSize = -1
  for (let index = 0; index < text.lines.length; index++) {
    const line = text.lines[index]
    if (titleSize < line.height) {
      titleSize = line.height
      titleIndex = index
    }
  }
  const leftBlock = text.lines.slice(0, titleIndex)
  const main = text.lines.slice(titleIndex)
  const title = main.shift()
  if (title !== undefined) {
    const titems = getLineItems(title.items, true).filter((t) => t.length > 0)
    if (titems.length >= 2) {
      resume.lastName = titems[titems.length - 1]
      resume.firstName = titems.slice(0, titems.length - 1).join(' ')
    }
    if (titems.length === 1) {
      const ti = titems[0].split(' ')
      if (ti.length >= 2) {
        resume.lastName = ti[ti.length - 1]
        resume.firstName = ti.slice(0, ti.length - 1).join(' ')
      }
    }
  }

  const position = main.shift()
  if (position !== undefined) {
    const positionText = getLineItems(position.items, true).join('').trim()
    if (positionText.length > 0 && positionText.match(/\d\d+/) === null) {
      resume.title = positionText
    }
  }
  const location = main.shift()
  if (location !== undefined) {
    const locationText = getLineItems(location.items, true).join('').trim()
    if (locationText.length > 0 && locationText.match(/\d\d+/) === null) {
      resume.city = locationText
    }
  }

  let leftCaptionSize = -1
  for (const t of leftBlock) {
    leftCaptionSize = Math.max(t.height, leftCaptionSize)
  }

  const contactBlock = getBlock(leftCaptionSize, leftBlock, ['способы связаться', 'contact'])
  const skillsBlock = getBlock(leftCaptionSize, leftBlock, ['top skills', 'основные навыки'])

  for (let index = 0; index < contactBlock.length; index++) {
    if (resume.phone === undefined) {
      const t = contactBlock[index]
      const line = getLineItems(t.items, false).join('').trim()
      const trimmed = tryExtractNumbers(line)
      if (trimmed !== null) {
        const phone = findPhoneNumbersInText(trimmed[0])
        if (phone.length > 0) {
          resume.phone = phone[0].number.formatInternational()
          break
        }
      }
    }
  }

  for (const line of text.annotations) {
    const val = line.value
    if (resume.email === undefined) {
      const split = val.split(':')
      if (split.length >= 2 && split[0] === 'mailto') {
        split.shift()
        resume.email = split.join(':')
      }
    }
    if (val.includes('linkedin')) {
      resume.linkedin = val.split('?')[0]
    }
    if (val.includes('github')) {
      resume.github = val
    }

    if (val.includes('facebook')) {
      resume.facebook = val
    }
    if (val.includes('twitter')) {
      resume.twitter = val
    }
  }

  // skills parse
  for (const t of skillsBlock) {
    if (t.items.length > 0) {
      handleSkills(t.items, resume)
    }
  }
  parseSkillsRaw(resume, text)
}

function tryExtractNumbers (text: string): RegExpMatchArray | null {
  const regex = /[\d()+\-./\s]{7,20}/g
  const matches = text.match(regex)
  return matches
}

function getBlock (captionSize: number, items: RekoniItem[], searchStrings: string[]): RekoniItem[] {
  let startIndex: number | undefined
  let endIndex: number | undefined
  for (let index = 0; index < items.length; index++) {
    const element = items[index]
    if (element.height === captionSize) {
      if (startIndex === undefined) {
        const line = getLineItems(element.items, false).join('').trim().toLowerCase()
        const match = searchStrings.some((p) => line.includes(p))
        if (match) {
          startIndex = index
        }
      } else {
        endIndex = index
        break
      }
    }
  }
  if (startIndex !== undefined) {
    return items.slice(startIndex + 1, endIndex)
  }
  return []
}
