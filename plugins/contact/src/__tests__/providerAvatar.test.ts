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

import contact, { AvatarType } from '..'
import { getAvatarProviderId, getExternalAvatarUrl, getProviderAvatarUpdate } from '../utils'

const url = 'https://idp.example.com/avatar.png'
const external = { avatarType: AvatarType.EXTERNAL, avatarProps: { url } }

describe('getProviderAvatarUpdate', () => {
  it('uses the provider avatar for a new person', () => {
    expect(getProviderAvatarUpdate(undefined, url)).toEqual(external)
  })

  it('ignores missing or non-http avatar urls', () => {
    expect(getProviderAvatarUpdate(undefined, undefined)).toBeUndefined()
    expect(getProviderAvatarUpdate(undefined, 'javascript:alert(1)')).toBeUndefined()
    expect(getProviderAvatarUpdate({ avatarType: AvatarType.COLOR }, 'ftp://idp.example.com/a.png')).toBeUndefined()
  })

  it('replaces the default color avatar', () => {
    expect(getProviderAvatarUpdate({ avatarType: AvatarType.COLOR }, url)).toEqual(external)
    expect(getProviderAvatarUpdate({ avatarType: AvatarType.COLOR, avatar: null, avatarProps: {} }, url)).toEqual(
      external
    )
  })

  it('refreshes a previously synced external avatar', () => {
    expect(
      getProviderAvatarUpdate(
        { avatarType: AvatarType.EXTERNAL, avatarProps: { url: 'https://old.example.com/a' } },
        url
      )
    ).toEqual(external)
    expect(getProviderAvatarUpdate(external, url)).toBeUndefined()
  })

  it('keeps an avatar chosen by the user', () => {
    expect(
      getProviderAvatarUpdate({ avatarType: AvatarType.COLOR, avatarProps: { color: 'Sky' } }, url)
    ).toBeUndefined()
    expect(getProviderAvatarUpdate({ avatarType: AvatarType.IMAGE, avatar: 'blob' as any }, url)).toBeUndefined()
    expect(
      getProviderAvatarUpdate({ avatarType: AvatarType.GRAVATAR, avatarProps: { url: 'gravatar-id' } }, url)
    ).toBeUndefined()
  })
})

describe('getAvatarProviderId', () => {
  it('resolves every avatar type to its own provider', () => {
    expect(getAvatarProviderId(AvatarType.COLOR)).toBe(contact.avatarProvider.Color)
    expect(getAvatarProviderId(AvatarType.IMAGE)).toBe(contact.avatarProvider.Image)
    expect(getAvatarProviderId(AvatarType.GRAVATAR)).toBe(contact.avatarProvider.Gravatar)
    expect(getAvatarProviderId(AvatarType.EXTERNAL)).toBe(contact.avatarProvider.External)
  })

  it('uses distinct provider ids', () => {
    const ids = Object.values(AvatarType).map((type) => getAvatarProviderId(type))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getExternalAvatarUrl', () => {
  it('returns http(s) avatar urls', () => {
    expect(getExternalAvatarUrl({ avatarProps: { url } })).toBe(url)
    expect(getExternalAvatarUrl({ avatarProps: { url: 'http://avatars.example.com/u/1?v=4' } })).toBe(
      'http://avatars.example.com/u/1?v=4'
    )
  })

  it('never returns unsafe or missing urls', () => {
    expect(getExternalAvatarUrl({})).toBeUndefined()
    expect(getExternalAvatarUrl({ avatarProps: {} })).toBeUndefined()
    expect(getExternalAvatarUrl({ avatarProps: { url: 'javascript:alert(1)' } })).toBeUndefined()
    expect(getExternalAvatarUrl({ avatarProps: { url: 'data:image/svg+xml;base64,AAAA' } })).toBeUndefined()
    expect(getExternalAvatarUrl({ avatarProps: { url: '/files/avatar.png' } })).toBeUndefined()
  })
})
