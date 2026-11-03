//
// Copyright © 2026 TraceX SAS.
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

import core, { type Class, type Doc, type Ref } from '@hcengineering/core'
import { type IntlString } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLanguage } from '@hcengineering/theme'
import { buildModel, getObjectLinkFragment } from '@hcengineering/view-resources'
import { buildMarkdownTableFromDocs, buildTableData } from '../markdown'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    translate: jest.fn(async (str: unknown) => `translated:${String(str)}`),
    getMetadata: jest.fn((key: unknown) =>
      key != null && String(key).includes('FrontUrl') ? 'http://test.local:8080' : undefined
    )
  }
})

jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { FrontUrl: 'FrontUrl' } },
  getClient: jest.fn()
}))
jest.mock('@hcengineering/theme', () => ({ getCurrentLanguage: jest.fn(() => 'en') }))
jest.mock('@hcengineering/view-resources', () => ({
  copyMarkdown: jest.fn(),
  buildModel: jest.fn(),
  buildConfigLookup: jest.fn(() => ({})),
  buildConfigAssociation: jest.fn(),
  getObjectLinkFragment: jest.fn()
}))
jest.mock('@hcengineering/ui', () => ({
  addNotification: jest.fn(),
  NotificationSeverity: { Success: 'success', Error: 'error' },
  locationToUrl: jest.fn(() => 'workbench/w3/card/doc1'),
  getCurrentResolvedLocation: jest.fn(() => ({ path: ['workbench', 'w3', 'card', 'doc1'] }))
}))
jest.mock('@hcengineering/view', () => ({
  ...jest.requireActual('../../../view/src/table'),
  __esModule: true,
  default: {
    component: { EditDoc: 'view:component:EditDoc' },
    string: {},
    class: { Viewlet: 'view:class:Viewlet', ViewletPreference: 'view:class:ViewletPreference' },
    viewlet: { Table: 'view:viewlet:Table' }
  }
}))

const CARD_CLASS = 'card:class:Card' as Ref<Class<Doc>>

describe('buildTableData', () => {
  let mockClient: any

  const doc = {
    _id: 'doc1',
    _class: CARD_CLASS,
    // Deliberately hostile: a pipe and brackets would be escaped by the markdown renderer.
    title: 'Sales | Q3 [draft]',
    note: 'a | b'
  } as unknown as Doc

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getObjectLinkFragment as jest.Mock).mockResolvedValue({ path: ['workbench', 'w3', 'card', 'doc1'] })

    const mockHierarchy = {
      getClass: jest.fn((ref: Ref<Class<Doc>>) => (ref === CARD_CLASS ? { _id: ref } : null)),
      findAttribute: jest.fn(() => ({ type: { _class: core.class.TypeString } })),
      as: jest.fn((d: Doc) => d),
      classHierarchyMixin: jest.fn(() => undefined)
    }
    mockClient = {
      getHierarchy: () => mockHierarchy,
      findAll: jest.fn(async () => []),
      findOne: jest.fn(async () => null)
    }
    ;(getClient as jest.Mock).mockReturnValue(mockClient)
    ;(getCurrentLanguage as jest.Mock).mockReturnValue('en')
    ;(buildModel as jest.Mock).mockResolvedValue([
      { key: '', label: 'card:string:Card' as IntlString, displayProps: {}, attribute: undefined },
      { key: 'note', label: 'Note', displayProps: {}, attribute: undefined }
    ])
  })

  function withConfig (): void {
    mockClient.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ config: ['', 'note'] }])
  }

  it('retains headers when the query has no documents', async () => {
    const data = await buildTableData([], { cardClass: CARD_CLASS }, mockClient)
    expect(data.headers).toHaveLength(2)
    expect(data.rows).toEqual([])
    expect(data.columnIds).toHaveLength(2)
  })

  it('stores the config entries the columns were built from, presenters included', async () => {
    const config = [{ key: '', presenter: 'tracker:component:TitlePresenter' as AnyComponent }, 'note']
    const data = await buildTableData([doc], { cardClass: CARD_CLASS, config }, mockClient)
    // A refresh rebuilds the columns from this config, so it must not lose what selects the presenter.
    expect(data.config).toEqual(config)
  })

  it('produces one row per document with the configured columns', async () => {
    withConfig()
    const data = await buildTableData([doc], { cardClass: CARD_CLASS }, mockClient)
    expect(data.headers).toHaveLength(2)
    expect(data.rows).toHaveLength(1)
    expect(data.rows[0]).toHaveLength(2)
    expect(data.docs[0]._id).toBe('doc1')
  })

  it('keeps cell text plain when a plain element formatter is passed', async () => {
    // This is what the export path does: markdown link markup must not leak into a csv cell.
    withConfig()
    const data = await buildTableData([doc], { cardClass: CARD_CLASS }, mockClient, async (_d, title) => title)
    const flat = data.rows[0].join(' ')
    expect(flat).toContain('Sales | Q3 [draft]')
    expect(flat).not.toContain('\\|')
    expect(flat).not.toContain('](')
  })

  it('defaults to the markdown flavour, so existing callers are unaffected', async () => {
    withConfig()
    const data = await buildTableData([doc], { cardClass: CARD_CLASS }, mockClient)
    // The renderer adds the object link exactly once.
    expect(data.rows[0][0]).toBe('Sales | Q3 [draft]')
  })

  it('marks the object column so a renderer can link it', async () => {
    withConfig()
    const data = await buildTableData([doc], { cardClass: CARD_CLASS }, mockClient)
    expect(data.linkColumns).toEqual([0])
  })

  it('markdown still escapes — the split moved that step, it did not drop it', async () => {
    withConfig()
    const markdown = await buildMarkdownTableFromDocs([doc], { cardClass: CARD_CLASS }, mockClient)
    expect(markdown).toContain('\\|')
    expect(markdown).toMatch(/^\| /)
    expect(markdown).toContain('---')
  })
})
