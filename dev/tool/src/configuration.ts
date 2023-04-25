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

import core, { BackupClient, Client as CoreClient, TxFactory, WorkspaceId } from '@hcengineering/core'
import { connect } from '@hcengineering/server-tool'

function toLen (val: string, sep: string, len: number): string {
  while (val.length < len) {
    val += sep
  }
  return val
}
export async function changeConfiguration (
  workspaceId: WorkspaceId,
  transactorUrl: string,
  cmd: { enable?: string, disable?: string, list?: boolean }
): Promise<void> {
  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const config = await connection.findAll(core.class.PluginConfiguration, {})
    if (cmd.list === true) {
      for (const c of config) {
        if (c.label !== undefined) {
          console.log(toLen(c.pluginId, '-', 20), c.enabled)
        }
      }
    }
    const enable = (cmd.enable ?? '').trim().split(',')
    console.log('enable', enable)
    const ops = new TxFactory(core.account.ConfigUser)
    if (enable.length > 0) {
      const p = config.filter((it) => enable.includes(it.pluginId) || enable.includes('*'))
      for (const pp of p) {
        if (!pp.enabled) {
          console.log('Enabling', pp.pluginId)
          await connection.tx(
            ops.createTxUpdateDoc(core.class.PluginConfiguration, core.space.Model, pp._id, { enabled: true })
          )
        }
      }
    }

    if ((cmd.disable ?? '').trim() !== '') {
      const p = config.find((it) => it.pluginId === (cmd.disable ?? '').trim())
      if (p !== undefined) {
        await connection.tx(
          ops.createTxUpdateDoc(core.class.PluginConfiguration, core.space.Model, p._id, { enabled: false })
        )
      }
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}
