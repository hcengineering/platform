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

import {
  CollaborativeDoc,
  formatCollaborativeDoc,
  formatCollaborativeDocVersion,
  parseCollaborativeDoc,
  updateCollaborativeDoc
} from '../collaboration'

describe('collaborative-doc', () => {
  describe('parseCollaborativeDoc', () => {
    it('parses collaborative doc id', async () => {
      expect(parseCollaborativeDoc('minioDocumentId:HEAD:0' as CollaborativeDoc)).toEqual({
        documentId: 'minioDocumentId',
        versionId: 'HEAD',
        lastVersionId: '0'
      })
    })
    it('parses collaborative doc version id', async () => {
      expect(parseCollaborativeDoc('minioDocumentId:main' as CollaborativeDoc)).toEqual({
        documentId: 'minioDocumentId',
        versionId: 'main',
        lastVersionId: 'main'
      })
    })
  })

  describe('formatCollaborativeDoc', () => {
    it('returns valid collaborative doc id', async () => {
      expect(
        formatCollaborativeDoc({
          documentId: 'minioDocumentId',
          versionId: 'HEAD',
          lastVersionId: '0'
        })
      ).toEqual('minioDocumentId:HEAD:0')
    })
  })

  describe('formatCollaborativeDocVersion', () => {
    it('returns valid collaborative doc id', async () => {
      expect(
        formatCollaborativeDocVersion({
          documentId: 'minioDocumentId',
          versionId: 'versionId'
        })
      ).toEqual('minioDocumentId:versionId')
    })
  })

  describe('updateCollaborativeDoc', () => {
    it('returns valid collaborative doc id', async () => {
      expect(updateCollaborativeDoc('minioDocumentId:HEAD:0' as CollaborativeDoc, '1')).toEqual(
        'minioDocumentId:HEAD:1'
      )
    })
  })
})
