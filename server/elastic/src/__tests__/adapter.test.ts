//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Account, Class, Doc, getWorkspaceId, MeasureMetricsContext, Ref, Space } from '@hcengineering/core'
import type { IndexedDoc } from '@hcengineering/server-core'
import { createElasticAdapter } from '../adapter'

describe('client', () => {
  it('should create document', async () => {
    const adapter = await createElasticAdapter(
      'http://localhost:9200/',
      getWorkspaceId('ws1', ''),
      new MeasureMetricsContext('-', {})
    )
    const doc: IndexedDoc = {
      id: 'doc1' as Ref<Doc>,
      _class: 'class1' as Ref<Class<Doc>>,
      modifiedBy: 'andrey' as Ref<Account>,
      modifiedOn: 0,
      space: 'space1' as Ref<Space>,
      content0: 'hey there!'
    }
    await adapter.index(doc)
    const hits = await adapter.search(['class1' as Ref<Class<Doc>>], {}, 1)
    console.log(hits)
  })

  // it('should find document', async () => {
  //   const adapter = await createElasticAdapter('http://localhost:9200/', 'ws1')
  // })
})
