//
// Copyright © 2026 Hardcore Engineering Inc.
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

import core, { type MeasureContext, type TxOperations, type WorkspaceConfiguration } from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'

/**
 * Applies the user's initial-state choices captured at workspace creation to a
 * freshly-initialized workspace. Currently only honors `disabledPlugins`:
 * marks each requested `core.class.PluginConfiguration` as `enabled: false`.
 * @public
 */
export async function applyWorkspaceConfiguration (
  ctx: MeasureContext,
  client: TxOperations,
  config: WorkspaceConfiguration | null | undefined
): Promise<void> {
  const disabledPlugins = config?.disabledPlugins
  if (disabledPlugins === undefined || disabledPlugins === null || disabledPlugins.length === 0) {
    return
  }

  const requested = new Set<Plugin>(disabledPlugins)
  const allConfigs = await client.findAll(core.class.PluginConfiguration, {})

  for (const pc of allConfigs) {
    if (!requested.has(pc.pluginId)) continue
    if (pc.system === true) continue
    if (!pc.enabled) continue
    await client.update(pc, { enabled: false })
  }
}

/**
 * Returns whether the workspace init script should be executed for a freshly
 * created workspace, given the user's `pendingConfiguration`. Defaults to
 * `true` (legacy behavior) when not specified.
 *
 * @public
 */
export function shouldRunInitScript (config: WorkspaceConfiguration | null | undefined): boolean {
  return config?.withDemoContent !== false
}
