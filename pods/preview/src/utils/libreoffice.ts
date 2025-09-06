//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type MeasureContext } from '@hcengineering/core'

import { spawn } from 'child_process'
import { access, mkdtemp, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { tmpdir } from 'os'

import { replaceExt } from './utils'

export async function docToPdf (ctx: MeasureContext, docFile: string): Promise<string> {
  const pdfDir = dirname(docFile)
  const pdfFile = replaceExt(docFile, '.pdf')

  const profileDir = await ctx.with('mkdtemp', {}, () => {
    return mkdtemp(join(tmpdir(), 'libreoffice-'))
  })

  try {
    const proc = spawn(
      'libreoffice',
      [
        '--headless',
        '--nologo',
        '--nodefault',
        '--nolockcheck',
        '--norestore',
        `-env:UserInstallation=file://${profileDir}`,
        '--convert-to',
        'pdf',
        '--outdir',
        pdfDir,
        docFile
      ],
      {
        env: {
          SAL_DISABLE_JAVA: '1',
          HOME: process.env.HOME ?? profileDir
        }
      }
    )

    ctx.info('starting LibreOffice', { cmd: proc.spawnfile, args: proc.spawnargs, docFile, pdfFile })

    await new Promise<void>((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          ctx.error('LibreOffice failed', { code, stdout, stderr, docFile, pdfFile })
          reject(new Error(`LibreOffice exited with code ${code}`))
        } else {
          resolve()
        }
      })

      proc.on('error', (err) => {
        ctx.error('LibreOffice failed', { stdout, stderr, docFile, pdfFile })
        reject(new Error(`Failed to start LibreOffice: ${err.message}`))
      })
    })
  } finally {
    await rm(profileDir, { recursive: true })
  }

  try {
    await access(pdfFile)
  } catch (err: any) {
    throw new Error(`Failed to create PDF: ${err.message}`)
  }

  return pdfFile
}
