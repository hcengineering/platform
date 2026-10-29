//
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
//
import { emoticonBeforeSpaceRegex, emoticonRegex } from '@hcengineering/emoji'
import { isWordLikeEmoticon } from './emoticon'

// Mirrors the two emoticon input rules of the emoji extension: returns the emoticon that would be converted
// after typing the last character of `textBefore`
function convertedEmoticon (textBefore: string): string | undefined {
  const immediate = textBefore.match(emoticonRegex)?.[1]
  if (immediate !== undefined && !isWordLikeEmoticon(immediate)) return immediate
  const beforeSpace = textBefore.match(emoticonBeforeSpaceRegex)?.[1]
  if (beforeSpace !== undefined && isWordLikeEmoticon(beforeSpace)) return beforeSpace
  return undefined
}

describe('isWordLikeEmoticon', () => {
  it('detects emoticons ending with a letter or digit', () => {
    expect(isWordLikeEmoticon(':p')).toBe(true)
    expect(isWordLikeEmoticon(':D')).toBe(true)
    expect(isWordLikeEmoticon(':-o')).toBe(true)
    expect(isWordLikeEmoticon(':3')).toBe(true)
    expect(isWordLikeEmoticon(':)')).toBe(false)
    expect(isWordLikeEmoticon(';-(')).toBe(false)
    expect(isWordLikeEmoticon(':/')).toBe(false)
  })
})

describe('emoticon input rules', () => {
  it('does not convert while a shortcode is being typed', () => {
    const typing = [':j', ':jo', ':s', ':sm', ':o', ':ok', ':p', ':pi', ':c', ':l', ':x', ':z', ':D', ':3', 'hi :j']
    for (const text of typing) {
      expect(convertedEmoticon(text)).toBeUndefined()
    }
  })

  it('converts letter emoticons once a whitespace follows', () => {
    expect(convertedEmoticon(':p ')).toBe(':p')
    expect(convertedEmoticon('hi :D ')).toBe(':D')
    expect(convertedEmoticon(':joy ')).toBeUndefined()
    expect(convertedEmoticon('word:p ')).toBeUndefined()
  })

  it('keeps converting other emoticons immediately', () => {
    expect(convertedEmoticon(':)')).toBe(':)')
    expect(convertedEmoticon('ok :-(')).toBe(':-(')
    expect(convertedEmoticon('10:30')).toBeUndefined()
  })
})
