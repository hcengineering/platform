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

const wordLikeEndRegex = /[\p{L}\p{N}]$/u

/**
 * Emoticons ending with a letter or digit (":p", ":D", ":3", ":-o") may just be the beginning of a word
 * or of a ':' shortcode search (":pizza", ":joy"), so they are converted only once a whitespace follows.
 * Other emoticons (":)", ";-(", "<3") are converted as soon as they are typed.
 */
export function isWordLikeEmoticon (emoticon: string): boolean {
  return wordLikeEndRegex.test(emoticon)
}
