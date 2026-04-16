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

/** @public */
export const WORKSPACE_MEMBER_STATUS_MESSAGE_MAX = 200

/**
 * Minimal shape for status helpers (see {@link WorkspaceMemberStatus}).
 */
interface WorkspaceMemberStatusLike {
  message: string
  clearAt?: number
}

/** @public */
export function trimWorkspaceMemberStatusMessage (message: string): string {
  const trimmed = message.trim()
  return Array.from(trimmed).slice(0, WORKSPACE_MEMBER_STATUS_MESSAGE_MAX).join('')
}

/** @public */
export function isWorkspaceMemberStatusVisible (
  s: WorkspaceMemberStatusLike | undefined,
  now: number = Date.now()
): boolean {
  if (s === undefined) return false
  if (s.clearAt !== undefined && s.clearAt <= now) return false
  const m = s.message?.trim() ?? ''
  return m !== ''
}

/**
 * Plain-text line for member lists / tooltips (full stored message, including any leading emoji).
 * @public
 */
export function getWorkspaceMemberStatusSubtitle (
  s: WorkspaceMemberStatusLike | undefined,
  now: number = Date.now()
): string | undefined {
  if (!isWorkspaceMemberStatusVisible(s, now)) return undefined
  return s?.message?.trim() ?? ''
}

const EMOJI_HEAD = /^\p{Extended_Pictographic}/u

/**
 * Returns the first emoji sequence at the start of the status message (after trim), or undefined.
 * Handles variation selectors, skin tones, and ZWJ sequences (e.g. family emoji).
 * @public
 */
export function extractLeadingStatusEmoji (raw: string | undefined): string | undefined {
  const text = raw?.trim() ?? ''
  if (text === '') return undefined

  try {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    const segments = [...seg.segment(text)].map((x) => x.segment)
    if (segments.length === 0) return undefined
    if (!EMOJI_HEAD.test(segments[0])) return undefined

    let out = segments[0]
    let i = 1
    while (i < segments.length) {
      const s = segments[i]
      if (s === '\u200D' && i + 1 < segments.length && EMOJI_HEAD.test(segments[i + 1])) {
        out += s + segments[i + 1]
        i += 2
        continue
      }
      if (s === '\uFE0F' || /^[\u{1F3FB}-\u{1F3FF}]$/u.test(s)) {
        out += s
        i++
        continue
      }
      break
    }
    return out
  } catch {
    const m = text.match(/^(\p{Extended_Pictographic})/u)
    return m?.[1]
  }
}
