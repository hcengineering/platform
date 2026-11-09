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
import type { EmojiWithGroup } from '@hcengineering/emoji'
import { emojiMatchesSearch, searchEmojisForSuggestion } from '../search'

function unicode (emoji: string, label: string, shortcodes: string[], tags: string[] = []): EmojiWithGroup {
  return { emoji, label, shortcodes, tags, hexcode: label, key: 'smileys-people' } as any
}

function custom (shortcode: string): EmojiWithGroup {
  return { _id: shortcode, shortcode, image: `${shortcode}-blob`, key: 'custom' } as any
}

const sob = unicode('😭', 'loudly crying face', ['sob'], ['cry', 'sad'])
const joy = unicode('😂', 'face with tears of joy', ['joy'], ['face', 'joy', 'laugh', 'tear'])
const joystick = unicode('🕹️', 'joystick', ['joystick'], ['game', 'video game'])
const catJoy = unicode('😹', 'cat with tears of joy', ['joy_cat'], ['cat', 'joy'])
const thumbsUp = unicode('👍', 'thumbs up', ['+1', 'thumbsup'], ['+1', 'hand', 'up'])
const partyParrot = custom('party_parrot')

const emojis = [sob, catJoy, joystick, joy, thumbsUp, partyParrot]

describe('searchEmojisForSuggestion', () => {
  it('requires at least two characters after the colon', () => {
    expect(searchEmojisForSuggestion(emojis, '')).toEqual([])
    expect(searchEmojisForSuggestion(emojis, 'j')).toEqual([])
    expect(searchEmojisForSuggestion(emojis, 'jo').length).toBeGreaterThan(0)
  })

  it('ignores text that cannot be a shortcode, like emoticons', () => {
    expect(searchEmojisForSuggestion(emojis, '-)')).toEqual([])
    expect(searchEmojisForSuggestion(emojis, 'jo)')).toEqual([])
    expect(searchEmojisForSuggestion(emojis, '//example')).toEqual([])
  })

  it('lists exact shortcode matches first, then shortcode prefixes, then other matches', () => {
    expect(searchEmojisForSuggestion(emojis, 'joy')).toEqual([joy, catJoy, joystick])
    expect(searchEmojisForSuggestion(emojis, 'jo')).toEqual([catJoy, joystick, joy])
  })

  it('matches tags and labels like the emoji picker', () => {
    expect(searchEmojisForSuggestion(emojis, 'cry')).toEqual([sob])
    expect(searchEmojisForSuggestion(emojis, 'tears')).toEqual([catJoy, joy])
  })

  it('is case insensitive and supports shortcodes with + and _', () => {
    expect(searchEmojisForSuggestion(emojis, 'JOY')[0]).toBe(joy)
    expect(searchEmojisForSuggestion(emojis, '+1')[0]).toBe(thumbsUp)
    expect(searchEmojisForSuggestion(emojis, 'joy_')).toEqual([catJoy])
  })

  it('finds custom emojis by shortcode', () => {
    expect(searchEmojisForSuggestion(emojis, 'party')).toEqual([partyParrot])
    expect(searchEmojisForSuggestion(emojis, 'parrot')).toEqual([partyParrot])
  })

  it('limits the number of results', () => {
    expect(searchEmojisForSuggestion(emojis, 'jo', 2)).toEqual([catJoy, joystick])
  })
})

describe('emojiMatchesSearch', () => {
  it('matches shortcode and tag prefixes and label substrings', () => {
    expect(emojiMatchesSearch(joystick, 'joy')).toBe(true)
    expect(emojiMatchesSearch(joystick, 'vid')).toBe(true)
    expect(emojiMatchesSearch(sob, 'crying')).toBe(true)
    expect(emojiMatchesSearch(sob, 'ob')).toBe(false)
  })
})
