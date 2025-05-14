//
// Copyright © 2025 Hardcore Engineering Inc.
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
import EMOJI_REGEX from 'emojibase-regex'
import EMOTICON_REGEX from 'emojibase-regex/emoticon'
import SHORTCODE_REGEX from 'emojibase-regex/shortcode'

export { fetchEmojis, fetchMessages, type Locale } from 'emojibase'

export const emojiRegex = EMOJI_REGEX
export const emojiGlobalRegex = new RegExp(emojiRegex.source, EMOJI_REGEX.flags + 'g')

export const emoticonRegex = EMOTICON_REGEX
export const emoticonGlobalRegex = new RegExp(emoticonRegex.source, EMOTICON_REGEX.flags + 'g')

export const shortcodeRegex = SHORTCODE_REGEX
export const shortcodeGlobalRegex = new RegExp(shortcodeRegex.source, SHORTCODE_REGEX.flags + 'g')
