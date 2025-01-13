//
// Copyright © 2024 Hardcore Engineering Inc.
//
//

import { CollaboratorClient, getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import { systemAccountEmail, WorkspaceId } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import config from './config'

/**
 * @public
 */
export function createCollaboratorClient (workspaceId: WorkspaceId): CollaboratorClient {
  const token = generateToken(systemAccountEmail, workspaceId, { mode: 'github' })
  return getCollaboratorClient(workspaceId, token, config.CollaboratorURL)
}
