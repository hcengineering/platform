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
import { stat } from 'fs/promises'
import { withTempFile } from '../tempfile'

async function exists (path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

describe('withTempFile', () => {
  it('removes the temp dir after a successful run', async () => {
    let capturedDir = ''
    const result = await withTempFile('content.txt', Buffer.from('hello'), async (filePath, tempDir) => {
      capturedDir = tempDir
      expect(await exists(filePath)).toBe(true)
      return 'ok'
    })

    expect(result).toBe('ok')
    expect(await exists(capturedDir)).toBe(false)
  })

  it('removes the temp dir even when the run callback throws', async () => {
    let capturedDir = ''

    await expect(
      withTempFile('content.txt', Buffer.from('hello'), async (_filePath, tempDir) => {
        capturedDir = tempDir
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    expect(capturedDir).not.toBe('')
    expect(await exists(capturedDir)).toBe(false)
  })
})
