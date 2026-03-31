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

import { isStandaloneMathExpression } from './mathematics'

describe('isStandaloneMathExpression', () => {
  it('matches standalone inline math', () => {
    expect(isStandaloneMathExpression('$x + y$')).toBe(true)
    expect(isStandaloneMathExpression('   $E=mc^2$   ')).toBe(true)
  })

  it('matches standalone block math', () => {
    expect(isStandaloneMathExpression('$$x^2 + y^2 = z^2$$')).toBe(true)
    expect(isStandaloneMathExpression('  $$\\frac{a}{b}$$\n')).toBe(true)
  })

  it('does not match plain text containing dollar signs', () => {
    expect(isStandaloneMathExpression('price is $5 only')).toBe(false)
    expect(isStandaloneMathExpression('Total: $5 and $7')).toBe(false)
  })

  it('does not match markdown table content', () => {
    const table = `| A | B |
| --- | --- |
| value $1 | text |`
    expect(isStandaloneMathExpression(table)).toBe(false)
  })

  it('does not match empty input', () => {
    expect(isStandaloneMathExpression('')).toBe(false)
  })
})
