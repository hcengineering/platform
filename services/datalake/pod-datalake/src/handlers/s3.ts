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

import { MeasureContext } from '@hcengineering/core'
import { type Request, type Response } from 'express'

import { type Datalake } from '../datalake'

export async function handleS3CreateBlobParams (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace } = req.params
  const { location, bucket } = await datalake.selectStorage(workspace)
  res.status(200).json({ location, bucket: bucket.bucket })
}

export async function handleS3CreateBlob (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name } = req.params
  const filename = req.body.filename as string
  if (filename == null) {
    res.status(400).send('missing filename')
    return
  }

  try {
    await datalake.create(workspace, name, filename)
    res.status(200).send()
  } catch (err: any) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('failed to create blob', { workspace, name, error })
    res.status(500).send()
  }
}
