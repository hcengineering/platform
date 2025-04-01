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

import { wrapETag, unwrapETag } from '../utils'

describe('unwrapETag', () => {
  it('should unwrap weak validator prefix', () => {
    expect(unwrapETag('W/"abc"')).toBe('abc')
  })

  it('should unwrap strong validator prefix', () => {
    expect(unwrapETag('"abc"')).toBe('abc')
  })

  it('should unwrap no validator prefix', () => {
    expect(unwrapETag('abc')).toBe('abc')
  })
})

describe('wrapETag', () => {
  it('should wrap strong validator prefix', () => {
    expect(wrapETag('abc')).toBe('"abc"')
  })

  it('should wrap weak validator prefix', () => {
    expect(wrapETag('abc', true)).toBe('W/"abc"')
  })
})
