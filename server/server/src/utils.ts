//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { ConnectionSocket } from '@hcengineering/server-core'

import { type Response } from '@hcengineering/rpc'
import type { Token } from '@hcengineering/server-token'
import type { Session, SessionManager } from './types'
import type { Workspace } from './workspace'

export interface WebsocketData {
  connectionSocket?: ConnectionSocket
  payload: Token
  token: string
  session: Promise<Session> | Session | undefined
  url: string
}

export function doSessionOp (data: WebsocketData, op: (session: Session, msg: Buffer) => void, msg: Buffer): void {
  if (data.session instanceof Promise) {
    // We need to copy since we will out of protected buffer area
    const msgCopy = Buffer.copyBytesFrom(new Uint8Array(msg))
    void data.session
      .then((_session) => {
        data.session = _session
        op(data.session, msgCopy)
      })
      .catch((err) => {
        console.error({ message: 'Failed to process session operation', err })
      })
  } else {
    if (data.session !== undefined) {
      op(data.session, msg)
    }
  }
}

export function processRequest (
  ctx: MeasureContext,
  session: Session,
  cs: ConnectionSocket,
  buff: any,
  sessions: SessionManager
): void {
  try {
    const request = cs.readRequest(buff, session.binaryMode)
    void sessions.handleRequest(ctx, session, cs, request).catch((err) => {
      ctx.error('failed to handle request', { err })
    })
  } catch (err: any) {
    if (((err.message as string) ?? '').includes('Data read, but end of buffer not reached')) {
      // ignore it
    } else {
      throw err
    }
  }
}

export function sendResponse (
  ctx: MeasureContext,
  session: Session,
  socket: ConnectionSocket,
  resp: Response<any>
): Promise<void> {
  return socket.send(ctx, resp, session.binaryMode, session.useCompression)
}

export function getLastHashInfo (workspaces: Workspace[]): {
  lastTx: Record<WorkspaceUuid, string | undefined>
  lastHash: Record<WorkspaceUuid, string | undefined>
} {
  const lastTx: Record<WorkspaceUuid, string | undefined> = {}
  for (const workspace of workspaces) {
    lastTx[workspace.wsId.uuid] = workspace.getLastTx()
  }

  const lastHash: Record<WorkspaceUuid, string | undefined> = {}
  for (const workspace of workspaces) {
    lastHash[workspace.wsId.uuid] = workspace.getLastHash()
  }
  return { lastTx, lastHash }
}
