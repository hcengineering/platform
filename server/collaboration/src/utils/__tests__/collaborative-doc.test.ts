//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { collaborativeDocFormat } from '@hcengineering/core'
import { collaborativeHistoryDocId, isEditableDoc, isEditableDocVersion } from '../collaborative-doc'

describe('collaborative-doc', () => {
  describe('collaborativeHistoryDocId', () => {
    it('returns valid history doc id', async () => {
      expect(collaborativeHistoryDocId('documentId')).toEqual('documentId#history')
    })

    it('returns valid history doc id for history doc id', async () => {
      expect(collaborativeHistoryDocId('documentId#history')).toEqual('documentId#history')
    })
  })

  describe('isEditableDoc', () => {
    it('returns true for HEAD version', async () => {
      const doc = collaborativeDocFormat({
        documentId: 'example',
        versionId: 'HEAD',
        lastVersionId: '0'
      })
      expect(isEditableDoc(doc)).toBeTruthy()
    })

    it('returns false for other versions', async () => {
      const doc = collaborativeDocFormat({
        documentId: 'example',
        versionId: 'main',
        lastVersionId: '0'
      })
      expect(isEditableDoc(doc)).toBeFalsy()
    })
  })

  describe('isEditableDocVersion', () => {
    it('returns true for HEAD version', async () => {
      expect(isEditableDocVersion('HEAD')).toBeTruthy()
    })

    it('returns false for other versions', async () => {
      expect(isEditableDocVersion('')).toBeFalsy()
      expect(isEditableDocVersion('main')).toBeFalsy()
      expect(isEditableDocVersion('head')).toBeFalsy()
    })
  })
})
