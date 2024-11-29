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

import core, { CollaborativeDoc, Doc, Ref } from '@hcengineering/core'
import { encodeDocumentId, decodeDocumentId } from '../utils'

describe('utils', () => {
  it('encodeDocumentId', () => {
    const doc: CollaborativeDoc = {
      objectClass: core.class.Card,
      objectId: 'doc1' as Ref<Doc>,
      objectAttr: 'description'
    }
    expect(encodeDocumentId('ws1', doc)).toEqual('ws1|core:class:Card|doc1|description')
  })

  describe('decodeDocumentId', () => {
    expect(decodeDocumentId('ws1|core:class:Card|doc1|description')).toEqual({
      workspaceId: 'ws1',
      documentId: {
        objectClass: core.class.Card,
        objectId: 'doc1' as Ref<Doc>,
        objectAttr: 'description'
      }
    })
  })
})
