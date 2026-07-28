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

import { accessLevelRank, hasAtLeast } from '../accessLevel'

describe('accessLevel helper', () => {
  describe('accessLevelRank', () => {
    it('ranks read < write < admin', () => {
      expect(accessLevelRank('read')).toBe(1)
      expect(accessLevelRank('write')).toBe(2)
      expect(accessLevelRank('admin')).toBe(3)
    })

    it('treats undefined as read (rank 1)', () => {
      expect(accessLevelRank(undefined)).toBe(1)
    })
  })

  describe('hasAtLeast', () => {
    it('read does not satisfy write', () => {
      expect(hasAtLeast('read', 'write')).toBe(false)
    })

    it('write satisfies write', () => {
      expect(hasAtLeast('write', 'write')).toBe(true)
    })

    it('admin satisfies write', () => {
      expect(hasAtLeast('admin', 'write')).toBe(true)
    })

    it('undefined satisfies read (minimal)', () => {
      expect(hasAtLeast(undefined, 'read')).toBe(true)
    })

    it('undefined does not satisfy write', () => {
      expect(hasAtLeast(undefined, 'write')).toBe(false)
    })

    it('admin satisfies admin', () => {
      expect(hasAtLeast('admin', 'admin')).toBe(true)
    })

    it('write does not satisfy admin', () => {
      expect(hasAtLeast('write', 'admin')).toBe(false)
    })
  })
})
