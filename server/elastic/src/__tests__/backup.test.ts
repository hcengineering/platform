import { DbAdapter } from '@hcengineering/server-core'
import { Domain, getWorkspaceId, Hierarchy, MeasureMetricsContext } from '@hcengineering/core'
import { createElasticBackupDataAdapter } from '../backup'

import { Client } from '@elastic/elasticsearch'

describe('Elastic Data Adapter', () => {
  const url = process.env.ELASTIC_URL ?? 'http://localhost:9200/'
  const domain = 'test' as Domain

  let adapter: DbAdapter

  beforeEach(async () => {
    adapter = await createElasticBackupDataAdapter(
      new MeasureMetricsContext('test', {}),
      new Hierarchy(),
      url,
      getWorkspaceId('ws1', '')
    )
  })

  afterEach(async () => {
    await adapter.close()
  })

  it('should init', () => {
    expect(adapter).toBeTruthy()
  })

  describe('Scroll Contexts', () => {
    let client: Client

    beforeEach(async () => {
      client = new Client({ node: url })
      await client.cluster.putSettings({
        body: {
          persistent: { 'search.max_open_scroll_context': '2' },
          transient: { 'search.max_open_scroll_context': '2' }
        }
      })
    })

    // Use afterEach() to make sure we clean up even if test fail
    afterEach(async () => {
      await client.cluster.putSettings({
        body: {
          persistent: { 'search.max_open_scroll_context': null },
          transient: { 'search.max_open_scroll_context': null }
        }
      })
      await client.close()
    })

    it('should get properly closed', async () => {
      for (let i = 0; i <= 3; i++) {
        const cursor = adapter.find(domain)
        await cursor.next()
        await cursor.close()
      }
    })
  })
})
