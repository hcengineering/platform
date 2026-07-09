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

import { sanitizeSpaceFileName } from '../exporter'

describe('sanitizeSpaceFileName', () => {
  it('should keep ordinary names unchanged', () => {
    expect(sanitizeSpaceFileName('DEV')).toBe('DEV')
    expect(sanitizeSpaceFileName('Wellness Vault')).toBe('Wellness Vault')
  })

  it('should replace path separators to avoid nested directories', () => {
    expect(sanitizeSpaceFileName('UI/UX Portfolio')).toBe('UI_UX Portfolio')
    expect(sanitizeSpaceFileName('Ventas/Marketing')).toBe('Ventas_Marketing')
    expect(sanitizeSpaceFileName('back\\slash')).toBe('back_slash')
  })

  it('should prevent path traversal', () => {
    expect(sanitizeSpaceFileName('../../etc/passwd')).not.toContain('..')
    expect(sanitizeSpaceFileName('../../etc/passwd')).not.toContain('/')
    expect(sanitizeSpaceFileName('..')).toBe('_')
  })

  it('should strip control characters and reserved characters', () => {
    expect(sanitizeSpaceFileName('name with\u0007control')).toBe('name withcontrol')
    expect(sanitizeSpaceFileName('a:b*c?d"e<f>g|h')).toBe('a_b_c_d_e_f_g_h')
  })

  it('should not produce hidden files from leading dots', () => {
    expect(sanitizeSpaceFileName('.hidden')).toBe('hidden')
  })

  it('should fall back to a placeholder for empty results', () => {
    expect(sanitizeSpaceFileName('')).toBe('unnamed')
    expect(sanitizeSpaceFileName('\u0000\u0001')).toBe('unnamed')
  })
})
