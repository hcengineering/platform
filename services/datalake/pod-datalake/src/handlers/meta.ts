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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type Request, type Response } from 'express'

import { type Datalake } from '../datalake'

export async function handleMetaGet (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

  const meta = await datalake.getMeta(ctx, workspace, name)
  if (meta == null) {
    res.status(404).send()
    return
  }

  res.status(200).json(meta)
}

export async function handleMetaPut (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

  const meta = req.body
  if (typeof meta !== 'object') {
    res.status(400).send()
    return
  }

  const current = await datalake.getMeta(ctx, workspace, name)
  if (current == null) {
    res.status(404).send()
    return
  }

  await datalake.setMeta(ctx, workspace, name, meta)
  ctx.info('meta-put', { workspace, name })

  res.status(200).json(meta)
}

export async function handleMetaPatch (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

  if (typeof req.body !== 'object') {
    res.status(400).send()
    return
  }

  const current = await datalake.getMeta(ctx, workspace, name)
  if (current == null) {
    res.status(404).send()
    return
  }

  const meta = { ...current, ...req.body }
  await datalake.setMeta(ctx, workspace, name, meta)
  ctx.info('meta-patch', { workspace, name })

  res.status(200).json(meta)
}
