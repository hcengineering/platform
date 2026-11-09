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
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Writes `data` into a fresh temp directory under a file named `fileName`, runs `run` against it,
 * and guarantees the whole temp directory is removed afterwards — whether `run` succeeds or throws.
 *
 * Extractors shell out to external binaries (pdftotext, antiword, unrtf) that can fail on malformed
 * or unsupported input. Without a `finally`-guaranteed cleanup, a failed extraction leaks its temp
 * directory (including the uploaded file content) for the lifetime of the host.
 *
 * @public
 */
export async function withTempFile<T> (
  fileName: string,
  data: Buffer,
  run: (filePath: string, tempDir: string) => Promise<T>
): Promise<T> {
  const tempDir = await mkdtemp(join(tmpdir(), 'rekoni-'))
  try {
    const filePath = join(tempDir, fileName)
    await writeFile(filePath, data)
    return await run(filePath, tempDir)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
