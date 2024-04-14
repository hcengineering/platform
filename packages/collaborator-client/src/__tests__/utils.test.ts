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

import { CollaborativeDoc } from '@hcengineering/core'
import { DocumentId } from '../types'
import { formatDocumentId, parseDocumentId } from '../utils'

describe('utils', () => {
  it('formatDocumentId', () => {
    expect(formatDocumentId('minio', 'ws1', 'doc1:HEAD:v1' as CollaborativeDoc)).toEqual(
      'minio://ws1/doc1:HEAD' as DocumentId
    )
    expect(formatDocumentId('minio', 'ws1', 'doc1:HEAD:v1#doc2:v2:v2' as CollaborativeDoc)).toEqual(
      'minio://ws1/doc1:HEAD/doc2:v2' as DocumentId
    )
  })

  describe('parseDocumentId', () => {
    expect(parseDocumentId('minio://ws1/doc1:HEAD' as DocumentId)).toEqual({
      storage: 'minio',
      workspaceUrl: 'ws1',
      collaborativeDoc: 'doc1:HEAD:HEAD' as CollaborativeDoc
    })
    expect(parseDocumentId('minio://ws1/doc1:HEAD/doc2:v2' as DocumentId)).toEqual({
      storage: 'minio',
      workspaceUrl: 'ws1',
      collaborativeDoc: 'doc1:HEAD:HEAD#doc2:v2:v2' as CollaborativeDoc
    })
  })
})
