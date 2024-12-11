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

import { Class, Doc, MeasureMetricsContext, Ref, Space } from '@hcengineering/core'
import type { FullTextAdapter, IndexedDoc } from '@hcengineering/server-core'

import { createElasticAdapter } from '../adapter'

describe('Elastic Adapter', () => {
  let adapter: FullTextAdapter
  const ctx = new MeasureMetricsContext('-', {})
  const ws1 = 'ws1'
  beforeEach(async () => {
    adapter = await createElasticAdapter(process.env.ELASTIC_URL ?? 'http://localhost:9200/')
  })

  afterEach(async () => {
    await adapter.close()
  })

  it('should init', () => {
    expect(adapter).toBeTruthy()
  })

  it('should create document', async () => {
    const doc: IndexedDoc = {
      id: 'doc1' as Ref<Doc>,
      _class: ['class1' as Ref<Class<Doc>>],
      modifiedBy: 'andrey',
      modifiedOn: 0,
      space: 'space1' as Ref<Space>,
      content0: 'hey there!'
    }
    await adapter.index(ctx, ws1, doc)
    const hits = await adapter.search(ctx, ws1, ['class1' as Ref<Class<Doc>>], {}, 1)
    console.log(hits)
  })

  it('should find document with raw search', async () => {
    const result = await adapter.searchString(
      ctx,
      ws1,
      {
        query: 'hey'
      },
      {}
    )
    console.log(result)
  })
})
