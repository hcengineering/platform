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

import { ReconiDocument } from './types'

/**
 * @public
 */
export function getLineItems (items: string[], trim: boolean): string[] {
  return items.map((t) => {
    const r = t.split('\u00A0').join(' ')
    if (trim) {
      return r.trim()
    }
    return r
  })
}

/**
 * @public
 */
export function isPrivateCharCode (code: number): boolean {
  return code > 0xe000 && code < 0xf8ff
}

export function handleSkills (items: string[], resume: ReconiDocument, check?: (s: string) => boolean): void {
  for (const tt of items) {
    if (tt.trim().length > 1) {
      const v = tt.trim()
      if (
        (check === undefined || check(v)) &&
        resume.skills.findIndex((it) => it.toLowerCase() === v.toLowerCase()) === -1
      ) {
        resume.skills.push(v)
      }
    }
  }
}

export function capitalizeName (str: string): string {
  const words = str.split(/\s+/)
  const capitalizedWords = words.map((word) => {
    const firstLetter = word.charAt(0)
    const restOfWord = word.slice(1)
    return firstLetter.toLocaleUpperCase() + restOfWord.toLocaleLowerCase()
  })
  return capitalizedWords.join(' ')
}
