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
  collaborativeDocChain,
  collaborativeDocUnchain,
  collaborativeDocFormat,
  collaborativeDocParse,
  collaborativeDocFromCollaborativeDoc,
  collaborativeDocFromLastVersion,
  collaborativeDocWithVersion,
  collaborativeDocWithLastVersion,
  collaborativeDocWithSource
} from '../collaboration'

describe('collaborative-doc', () => {
  describe('collaborativeDocChain', () => {
    it('chains one collaborative doc', async () => {
      expect(collaborativeDocChain('doc1:v1:v1' as CollaborativeDoc)).toEqual('doc1:v1:v1' as CollaborativeDoc)
    })
    it('chains multiple collaborative docs', async () => {
      expect(collaborativeDocChain('doc1:v1:v1' as CollaborativeDoc, 'doc2:v2:v2' as CollaborativeDoc)).toEqual(
        'doc1:v1:v1#doc2:v2:v2' as CollaborativeDoc
      )
    })
    it('chains multiple chained collaborative docs', async () => {
      expect(
        collaborativeDocChain('doc1:v1:v1#doc2:v2:v2' as CollaborativeDoc, 'doc3:v3:v3' as CollaborativeDoc)
      ).toEqual('doc1:v1:v1#doc2:v2:v2#doc3:v3:v3' as CollaborativeDoc)
    })
  })

  describe('collaborativeDocUnchain', () => {
    it('unchains one collaborative doc', async () => {
      expect(collaborativeDocUnchain('doc1:v1:v1' as CollaborativeDoc)).toEqual(['doc1:v1:v1'] as CollaborativeDoc[])
    })
    it('unchains multiple collaborative docs', async () => {
      expect(collaborativeDocUnchain('doc1:v1:v1#doc2:v2:v2' as CollaborativeDoc)).toEqual([
        'doc1:v1:v1',
        'doc2:v2:v2'
      ] as CollaborativeDoc[])
    })
  })

  describe('collaborativeDocParse', () => {
    it('parses collaborative doc id', async () => {
      expect(collaborativeDocParse('minioDocumentId' as CollaborativeDoc)).toEqual({
        documentId: 'minioDocumentId',
        versionId: 'HEAD',
        lastVersionId: 'HEAD',
        source: []
      })
    })
    it('parses collaborative doc id with versionId', async () => {
      expect(collaborativeDocParse('minioDocumentId:main' as CollaborativeDoc)).toEqual({
        documentId: 'minioDocumentId',
        versionId: 'main',
        lastVersionId: 'main',
        source: []
      })
    })
    it('parses collaborative doc id with versionId and lastVersionId', async () => {
      expect(collaborativeDocParse('minioDocumentId:HEAD:0' as CollaborativeDoc)).toEqual({
        documentId: 'minioDocumentId',
        versionId: 'HEAD',
        lastVersionId: '0',
        source: []
      })
    })
    it('parses collaborative doc id with versionId, lastVersionId, and source', async () => {
      expect(
        collaborativeDocParse('minioDocumentId:HEAD:0#minioDocumentId1:main#minioDocumentId2:HEAD' as CollaborativeDoc)
      ).toEqual({
        documentId: 'minioDocumentId',
        versionId: 'HEAD',
        lastVersionId: '0',
        source: ['minioDocumentId1:main' as CollaborativeDoc, 'minioDocumentId2:HEAD' as CollaborativeDoc]
      })
    })
  })

  describe('collaborativeDocFormat', () => {
    it('formats collaborative doc id', async () => {
      expect(
        collaborativeDocFormat({
          documentId: 'minioDocumentId',
          versionId: 'HEAD',
          lastVersionId: '0'
        })
      ).toEqual('minioDocumentId:HEAD:0')
    })
    it('formats collaborative doc id with sources', async () => {
      expect(
        collaborativeDocFormat({
          documentId: 'minioDocumentId',
          versionId: 'HEAD',
          lastVersionId: '0',
          source: ['minioDocumentId1:main' as CollaborativeDoc, 'minioDocumentId2:HEAD' as CollaborativeDoc]
        })
      ).toEqual('minioDocumentId:HEAD:0#minioDocumentId1:main#minioDocumentId2:HEAD')
    })
    it('formats collaborative doc id with invalid characters', async () => {
      expect(
        collaborativeDocFormat({
          documentId: 'doc:id',
          versionId: 'version#id',
          lastVersionId: 'last:version#id'
        })
      ).toEqual('doc%id:version%id:last%version%id')
    })
  })

  describe('collaborativeDocWithVersion', () => {
    it('updates collaborative doc version id', async () => {
      expect(collaborativeDocWithVersion('doc1:HEAD:HEAD' as CollaborativeDoc, 'v1')).toEqual('doc1:v1:v1')
      expect(collaborativeDocWithVersion('doc1:HEAD:v1' as CollaborativeDoc, 'v2')).toEqual('doc1:v2:v2')
      expect(collaborativeDocWithVersion('doc1:HEAD:v1#doc2:v1:v1' as CollaborativeDoc, 'v2')).toEqual(
        'doc1:v2:v2#doc2:v1:v1'
      )
    })
  })

  describe('collaborativeDocWithLastVersion', () => {
    it('updates collaborative doc version id', async () => {
      expect(collaborativeDocWithLastVersion('doc1:HEAD:HEAD' as CollaborativeDoc, 'v1')).toEqual('doc1:HEAD:v1')
      expect(collaborativeDocWithLastVersion('doc1:HEAD:v1' as CollaborativeDoc, 'v2')).toEqual('doc1:HEAD:v2')
      expect(collaborativeDocWithLastVersion('doc1:HEAD:v1#doc2:v1:v1' as CollaborativeDoc, 'v2')).toEqual(
        'doc1:HEAD:v2#doc2:v1:v1'
      )
      expect(collaborativeDocWithLastVersion('doc1:v1:v1' as CollaborativeDoc, 'v2')).toEqual(
        // cannot update last version for non HEAD
        'doc1:v1:v1'
      )
    })
  })

  describe('collaborativeDocWithSource', () => {
    it('updates collaborative doc version id', async () => {
      expect(
        collaborativeDocWithSource('doc1:HEAD:HEAD' as CollaborativeDoc, 'doc2:v1:v1' as CollaborativeDoc)
      ).toEqual('doc1:HEAD:HEAD#doc2:v1:v1' as CollaborativeDoc)
      expect(collaborativeDocWithSource('doc1:v1:v1' as CollaborativeDoc, 'doc2:v2:v2' as CollaborativeDoc)).toEqual(
        'doc1:v1:v1#doc2:v2:v2' as CollaborativeDoc
      )
      expect(
        collaborativeDocWithSource('doc1:v1:v1' as CollaborativeDoc, 'doc2:v2:v2#doc3:v3:v3' as CollaborativeDoc)
      ).toEqual('doc1:v1:v1#doc2:v2:v2#doc3:v3:v3' as CollaborativeDoc)
      expect(
        collaborativeDocWithSource('doc1:v1:v1#doc2:v2:v2' as CollaborativeDoc, 'doc3:v3:v3' as CollaborativeDoc)
      ).toEqual('doc1:v1:v1#doc3:v3:v3' as CollaborativeDoc)
    })
  })

  describe('collaborativeDocFromLastVersion', () => {
    it('returns valid collaborative doc id', async () => {
      expect(collaborativeDocFromLastVersion('doc1:HEAD:HEAD#doc2:main:v2#doc3:main:v3' as CollaborativeDoc)).toEqual(
        'doc1:HEAD:HEAD#doc2:main:v2#doc3:main:v3'
      )
      expect(collaborativeDocFromLastVersion('doc1:HEAD:v1#doc2:main:v2#doc3:main:v3' as CollaborativeDoc)).toEqual(
        'doc1:v1:v1#doc2:main:v2#doc3:main:v3'
      )
      expect(collaborativeDocFromLastVersion('doc1:v1:v1#doc2:main:v2#doc3:main:v3' as CollaborativeDoc)).toEqual(
        'doc1:v1:v1#doc2:main:v2#doc3:main:v3'
      )
      expect(collaborativeDocFromLastVersion('doc1:HEAD:v1' as CollaborativeDoc)).toEqual('doc1:v1:v1')
    })
  })

  describe('collaborativeDocFromCollaborativeDoc', () => {
    it('returns valid collaborative doc id', async () => {
      expect(
        collaborativeDocFromCollaborativeDoc(
          'doc1:HEAD:HEAD' as CollaborativeDoc,
          'doc2:HEAD:v2#doc3:v3:v3' as CollaborativeDoc
        )
      ).toEqual('doc1:HEAD:HEAD#doc2:v2:v2#doc3:v3:v3')

      expect(
        collaborativeDocFromCollaborativeDoc(
          'doc1:HEAD:HEAD' as CollaborativeDoc,
          'doc2:v2:v2#doc3:v3:v3' as CollaborativeDoc
        )
      ).toEqual('doc1:HEAD:HEAD#doc2:v2:v2#doc3:v3:v3')

      expect(
        collaborativeDocFromCollaborativeDoc(
          'doc1:HEAD:HEAD' as CollaborativeDoc,
          'doc2:HEAD:HEAD#doc3:v3:v3' as CollaborativeDoc
        )
      ).toEqual('doc1:HEAD:HEAD#doc2:HEAD:HEAD#doc3:v3:v3')
    })
  })
})
