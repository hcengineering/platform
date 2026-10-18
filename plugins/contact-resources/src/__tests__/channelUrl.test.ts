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

import { getChannelProviderUrl } from '../channelUrl'

jest.mock('@hcengineering/contact', () => ({
  __esModule: true,
  default: {
    channelProvider: {
      Email: 'contact:channelProvider:Email',
      Phone: 'contact:channelProvider:Phone',
      LinkedIn: 'contact:channelProvider:LinkedIn',
      Twitter: 'contact:channelProvider:Twitter',
      Telegram: 'contact:channelProvider:Telegram',
      GitHub: 'contact:channelProvider:GitHub',
      Homepage: 'contact:channelProvider:Homepage'
    }
  }
}))

const provider = (name: string): any => `contact:channelProvider:${name}`

describe('getChannelProviderUrl', () => {
  it('builds tel: links for phone numbers', () => {
    expect(getChannelProviderUrl(provider('Phone'), '+1 555 333 7777')).toBe('tel:+15553337777')
    expect(getChannelProviderUrl(provider('Phone'), '(555) 333-77.77')).toBe('tel:5553337777')
    expect(getChannelProviderUrl(provider('Phone'), 'call me')).toBeUndefined()
  })

  it('builds mailto: links for e-mail addresses', () => {
    expect(getChannelProviderUrl(provider('Email'), ' mail@example.com ')).toBe('mailto:mail@example.com')
    expect(getChannelProviderUrl(provider('Email'), 'mailto:mail@example.com')).toBe('mailto:mail@example.com')
    expect(getChannelProviderUrl(provider('Email'), 'not an email')).toBeUndefined()
  })

  it('builds profile links for nicknames', () => {
    expect(getChannelProviderUrl(provider('GitHub'), '@appleseed')).toBe('https://github.com/appleseed')
    expect(getChannelProviderUrl(provider('GitHub'), 'apple-seed')).toBe('https://github.com/apple-seed')
    expect(getChannelProviderUrl(provider('Twitter'), '@apple_seed')).toBe('https://x.com/apple_seed')
    expect(getChannelProviderUrl(provider('Telegram'), 'appleseed')).toBe('https://t.me/appleseed')
  })

  it('keeps values that are already URLs', () => {
    expect(getChannelProviderUrl(provider('GitHub'), 'https://github.com/appleseed')).toBeUndefined()
    expect(getChannelProviderUrl(provider('GitHub'), 'github.com/appleseed')).toBeUndefined()
    expect(getChannelProviderUrl(provider('Homepage'), 'https://appleseed.com')).toBeUndefined()
    expect(getChannelProviderUrl(provider('LinkedIn'), 'appleseed')).toBeUndefined()
  })

  it('ignores empty values', () => {
    expect(getChannelProviderUrl(provider('Phone'), '  ')).toBeUndefined()
    expect(getChannelProviderUrl(provider('GitHub'), '')).toBeUndefined()
  })
})
