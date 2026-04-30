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

import core, {
  type Class,
  type Data,
  type Doc,
  getDefaultPluginConfigurations as parseDefaultPluginConfigurations,
  type PluginConfiguration,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type WorkspaceConfiguration
} from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'

const WORKBENCH_APPLICATION_CLASS = 'workbench:class:Application' as Ref<Class<Doc>>

/**
 * In-process snapshot of the default `PluginConfiguration` set for this
 * installation. Set once at service startup from the model bundle (see
 * {@link initDefaultPluginConfigurations}); served as-is by the
 * `getDefaultPluginConfigurations` RPC.
 *
 * Module-local state is fine here because the model is immutable for the
 * lifetime of the process: a new build = a new pod start.
 */
let defaults: Data<PluginConfiguration>[] | null = null

/**
 * Initialize the in-process snapshot from the platform model.
 *
 * @public
 */
export function initDefaultPluginConfigurations (txes: Tx[]): void {
  const txById = new Map<Ref<Doc>, Tx>(txes.map((t) => [t._id, t]))
  const isApplicationProvider = (pc: PluginConfiguration): boolean => {
    for (const txId of pc.transactions) {
      const tx = txById.get(txId)
      if (tx === undefined) continue
      if (tx._class !== core.class.TxCreateDoc) continue
      if ((tx as TxCreateDoc<Doc>).objectClass === WORKBENCH_APPLICATION_CLASS) {
        return true
      }
    }
    return false
  }

  const configs = parseDefaultPluginConfigurations(txes)
  defaults = configs
    .filter((pc) => pc.system !== true && pc.hidden !== true)
    .filter((pc) => pc.enabled)
    .filter(isApplicationProvider)
    .map(toData)
}

/**
 * Returns the snapshot set by {@link initDefaultPluginConfigurations}, or
 * `null` if the snapshot was never initialized (e.g. an older account-pod
 * version that doesn't pass `txes` into {@link serveAccount}).
 *
 * @public
 */
export function getDefaultPluginConfigurations (): Data<PluginConfiguration>[] | null {
  return defaults
}

/**
 * Test-only: clear the in-process snapshot. Production code should never call this.
 *
 * @internal
 */
export function resetDefaultPluginConfigurations (): void {
  defaults = null
}

/**
 * Sanitizes a `WorkspaceConfiguration` provided by an untrusted client. Filters
 * `disabledPlugins` against the in-process default snapshot.
 *
 * Returns `undefined` if, after sanitization, there is nothing left to apply.

 * @public
 */
export function validateWorkspaceConfiguration (
  config: WorkspaceConfiguration | undefined
): WorkspaceConfiguration | undefined {
  if (config === undefined) return undefined

  const result: WorkspaceConfiguration = {}
  if (config.withDemoContent !== undefined) {
    result.withDemoContent = config.withDemoContent
  }

  if (config.disabledPlugins !== undefined && config.disabledPlugins.length > 0) {
    if (defaults !== null) {
      const allowed = new Set<Plugin>(defaults.map((pc) => pc.pluginId))
      const filtered = config.disabledPlugins.filter((p) => allowed.has(p))
      if (filtered.length > 0) {
        result.disabledPlugins = filtered
      }
    }
  }

  if (result.withDemoContent === undefined && result.disabledPlugins === undefined) {
    return undefined
  }
  return result
}

function toData (pc: PluginConfiguration): Data<PluginConfiguration> {
  // Strip Doc-level fields. Spread + omit is awkward across TS versions, so
  // we project explicitly — keeps the wire payload predictable.
  const data: Data<PluginConfiguration> = {
    pluginId: pc.pluginId,
    transactions: pc.transactions,
    label: pc.label,
    enabled: pc.enabled,
    beta: pc.beta
  }
  if (pc.icon !== undefined) data.icon = pc.icon
  if (pc.description !== undefined) data.description = pc.description
  if (pc.system === true) data.system = true
  if (pc.hidden !== undefined) data.hidden = pc.hidden
  if (pc.classFilter !== undefined) data.classFilter = pc.classFilter
  return data
}
