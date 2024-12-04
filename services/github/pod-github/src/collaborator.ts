//
// Copyright © 2024 Hardcore Engineering Inc.
//
//

import { CollaboratorClient, getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import { WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import config from './config'

/**
 * @public
 */
export function createCollaboratorClient (workspaceId: WorkspaceUuid): CollaboratorClient {
  const token = generateToken(config.SystemEmail, workspaceId, { service: 'github', mode: 'github' })

  return getCollaboratorClient(workspaceId, token, config.CollaboratorURL)
}
