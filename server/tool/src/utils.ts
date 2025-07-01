import { systemAccountUuid, type WorkspaceUuid } from '@hcengineering/core'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'

export function getToolToken (workspace?: WorkspaceUuid): string {
  return generateToken(systemAccountUuid, workspace, { service: 'tool', admin: 'true' })
}

export async function getWorkspaceTransactorEndpoint (
  workspace: WorkspaceUuid,
  type: 'external' | 'internal' = 'external'
): Promise<string> {
  return await getTransactorEndpoint(getToolToken(workspace), type)
}

export async function sendTransactorEvent (
  workspace: WorkspaceUuid,
  operation: 'force-maintenance' | 'force-close',
  type: 'external' | 'internal' = 'external'
): Promise<void> {
  const token = getToolToken(workspace)
  const serverEndpoint = (await getTransactorEndpoint(token, type))
    .replaceAll('wss://', 'https://')
    .replace('ws://', 'http://')

  try {
    console.info('send transactor event', operation, 'to', serverEndpoint)
    await fetch(serverEndpoint + `/api/v1/manage?token=${token}&operation=${operation}`, {
      method: 'PUT'
    })
  } catch (err: any) {
    // Ignore error if transactor is not yet ready
  }
}
