//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { DEFAULT_FULLTEXT_ANALYZER, getFulltextAnalyzer } from '../analyzer'

describe('getFulltextAnalyzer', () => {
  it('keeps the English default when not configured', () => {
    expect(DEFAULT_FULLTEXT_ANALYZER).toBe('rebuilt_english')
    expect(getFulltextAnalyzer({})).toBe('rebuilt_english')
    expect(getFulltextAnalyzer({ ELASTIC_ANALYZER: '' })).toBe('rebuilt_english')
    expect(getFulltextAnalyzer({ ELASTIC_ANALYZER: '   ' })).toBe('rebuilt_english')
  })

  it('uses the configured analyzer', () => {
    expect(getFulltextAnalyzer({ ELASTIC_ANALYZER: 'russian' })).toBe('russian')
    expect(getFulltextAnalyzer({ ELASTIC_ANALYZER: ' german ' })).toBe('german')
    expect(getFulltextAnalyzer({ ELASTIC_ANALYZER: 'icu_analyzer' })).toBe('icu_analyzer')
    expect(getFulltextAnalyzer({ ELASTIC_ANALYZER: 'rebuilt_english' })).toBe('rebuilt_english')
  })

  it('rejects values that are not analyzer names', () => {
    expect(() => getFulltextAnalyzer({ ELASTIC_ANALYZER: 'Russian' })).toThrow(/ELASTIC_ANALYZER/)
    expect(() => getFulltextAnalyzer({ ELASTIC_ANALYZER: 'russian german' })).toThrow(/ELASTIC_ANALYZER/)
    expect(() => getFulltextAnalyzer({ ELASTIC_ANALYZER: '{"type":"custom"}' })).toThrow(/ELASTIC_ANALYZER/)
  })
})
