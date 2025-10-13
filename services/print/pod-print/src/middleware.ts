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
import { type Response, type Request, type NextFunction, type RequestHandler } from 'express'

export interface MeasueContextOptions {
  ctx: MeasureContext
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: MeasureContext
    }
  }
}

export const withMeasureContext = (options: MeasueContextOptions): RequestHandler => {
  const { ctx } = options
  return (req: Request, res: Response, next: NextFunction) => {
    const reqId = `${req.method} ${req.path}`
    ctx
      .with(
        reqId,
        { method: req.method, route: req.route },
        (ctx) => {
          req.ctx = ctx
          next()
        },
        { method: req.method, params: req.params, query: req.query }
      )
      .catch(next)
  }
}
