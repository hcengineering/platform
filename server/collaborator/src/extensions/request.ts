//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Extension, onRequestPayload } from '@hocuspocus/server'
import { MeasureContext } from '@hcengineering/core'
import { RequestListener } from 'http'

export interface RequestConfiguration {
  ctx: MeasureContext
  handler: RequestListener
}

export class RequestExtension implements Extension {
  private readonly configuration: RequestConfiguration

  constructor (configuration: RequestConfiguration) {
    this.configuration = configuration
  }

  async onRequest (data: onRequestPayload): Promise<void> {
    this.configuration.ctx.measure('request', 1)

    const { request, response } = data
    this.configuration.handler(request, response)
  }
}
