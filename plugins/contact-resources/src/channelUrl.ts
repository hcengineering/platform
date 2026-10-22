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

import contact, { type ChannelProvider } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'

const nicknameProfileUrls = new Map<Ref<ChannelProvider>, string>([
  [contact.channelProvider.GitHub, 'https://github.com/'],
  [contact.channelProvider.Twitter, 'https://x.com/'],
  [contact.channelProvider.Telegram, 'https://t.me/']
])

/**
 * Build a link for a channel value that is not a URL itself:
 * a phone number (tel:), an e-mail address (mailto:) or a nickname of a provider with known profile pages.
 * Returns undefined when the value has to be treated as a regular URL.
 */
export function getChannelProviderUrl (provider: Ref<ChannelProvider>, value: string): string | undefined {
  const text = value.trim()
  if (text === '') return undefined

  if (provider === contact.channelProvider.Phone) {
    const phone = text.replace(/[\s().-]/g, '')
    return /^\+?\d+$/.test(phone) ? `tel:${phone}` : undefined
  }

  if (provider === contact.channelProvider.Email) {
    const email = text.replace(/^mailto:/i, '')
    return /^[^\s@/]+@[^\s@/]+$/.test(email) ? `mailto:${email}` : undefined
  }

  const profileUrl = nicknameProfileUrls.get(provider)
  if (profileUrl !== undefined) {
    const nickname = /^@?([\w-]+)$/.exec(text)?.[1]
    return nickname !== undefined ? `${profileUrl}${nickname}` : undefined
  }

  return undefined
}
