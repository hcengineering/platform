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

import { DocumentId, parseDocumentId } from '@hcengineering/collaborator-client'
import { isReadonlyDoc } from '@hcengineering/collaboration'
import { MeasureContext } from '@hcengineering/core'
import { Extension, onAuthenticatePayload } from '@hocuspocus/server'

import { getWorkspaceInfo } from '../account'
import { Context, buildContext } from '../context'
import { Controller } from '../platform'

export interface AuthenticationConfiguration {
  ctx: MeasureContext
  controller: Controller
}

export class AuthenticationExtension implements Extension {
  private readonly configuration: AuthenticationConfiguration

  constructor (configuration: AuthenticationConfiguration) {
    this.configuration = configuration
  }

  async onAuthenticate (data: onAuthenticatePayload): Promise<Context> {
    this.configuration.ctx.measure('authenticate', 1)

    const { workspaceUrl, collaborativeDoc } = parseDocumentId(data.documentName as DocumentId)

    // verify workspace can be accessed with the token
    const workspaceInfo = await getWorkspaceInfo(data.token)

    // verify workspace url in the document matches the token
    if (workspaceInfo.workspace !== workspaceUrl) {
      throw new Error('documentName must include workspace')
    }

    data.connection.readOnly = isReadonlyDoc(collaborativeDoc)

    return buildContext(data, this.configuration.controller)
  }
}
