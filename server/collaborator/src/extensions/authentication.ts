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

import { decodeDocumentId } from '@hcengineering/collaborator-client'
import { MeasureContext } from '@hcengineering/core'
import { decodeToken } from '@hcengineering/server-token'
import { Extension, onAuthenticatePayload } from '@hocuspocus/server'
import { getClient as getAccountClient } from '@hcengineering/account-client'

import { Context, buildContext } from '../context'

export interface AuthenticationConfiguration {
  ctx: MeasureContext
}

export class AuthenticationExtension implements Extension {
  private readonly configuration: AuthenticationConfiguration

  constructor (configuration: AuthenticationConfiguration) {
    this.configuration = configuration
  }

  async onAuthenticate (data: onAuthenticatePayload): Promise<Context> {
    const ctx = this.configuration.ctx
    const { workspaceId } = decodeDocumentId(data.documentName)

    return await ctx.with('authenticate', { workspaceId }, async () => {
      const token = decodeToken(data.token)

      ctx.info('authenticate', { workspaceId, mode: token.extra?.mode ?? '' })

      // verify workspace can be accessed with the token
      const workspaceInfo = await getAccountClient(data.token).getWorkspaceInfo()

      // verify workspace uuid in the document matches the token
      if (workspaceInfo.uuid !== workspaceId) {
        throw new Error('documentName must include workspace id')
      }

      return buildContext(data)
    })
  }
}
