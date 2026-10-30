//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type ClientFactoryOptions } from '@hcengineering/client'
import { ClientConnectEvent } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'

type ConnectHandler = NonNullable<ClientFactoryOptions['onConnect']>

// The connection supplies (event, lastTx, data). Only data identifies the session;
// lastTx advances during ordinary use and must not invalidate the mounted shell.
// Core may turn a reconnect into Refresh/Upgraded. Maintenance carries statistics
// instead of a session ID and must leave the current identity alone.
export function withWorkbenchSession (handler: ConnectHandler): ConnectHandler {
  return async (event, lastTx, data) => {
    if (event !== ClientConnectEvent.Maintenance) {
      setMetadata(presentation.metadata.SessionId, typeof data === 'string' ? data : undefined)
    }
    await handler(event, lastTx, data)
  }
}
