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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { normalizeEscapedMarkdownLinks } from './tablePaste'

describe('normalizeEscapedMarkdownLinks', () => {
  it('normalizes partially escaped markdown links', () => {
    const input = '| \\[Label\\](https://example.com/a\\|b) |'
    const output = normalizeEscapedMarkdownLinks(input)
    expect(output).toBe('| [Label](https://example.com/a|b) |')
  })

  it('normalizes fully escaped markdown links', () => {
    const input = '| \\[Label\\]\\(https://example.com/a\\|b\\) |'
    const output = normalizeEscapedMarkdownLinks(input)
    expect(output).toBe('| [Label](https://example.com/a|b) |')
  })

  it('keeps non-link text unchanged', () => {
    const input = '| plain \\| text |'
    const output = normalizeEscapedMarkdownLinks(input)
    expect(output).toBe(input)
  })
})
