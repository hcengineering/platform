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
  type MeasureContext,
  type PluginConfiguration,
  type Ref,
  type TxOperations,
  type WorkspaceConfiguration
} from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'

import { applyWorkspaceConfiguration, shouldRunInitScript } from '../configuration'

const mockCtx = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
} as unknown as MeasureContext

function makePc (pluginId: string, overrides: Partial<PluginConfiguration> = {}): PluginConfiguration {
  return {
    _id: ('plugin-configuration-' + pluginId) as Ref<PluginConfiguration>,
    _class: core.class.PluginConfiguration,
    space: core.space.Model,
    modifiedBy: 'core:account:System' as any,
    modifiedOn: 0,
    pluginId: pluginId as Plugin,
    transactions: [] as Ref<any>[],
    label: ('plugin:string.' + pluginId) as any,
    enabled: true,
    beta: false,
    ...overrides
  }
}

interface MockClient {
  findAll: jest.Mock
  update: jest.Mock
}

function makeMockClient (configs: PluginConfiguration[]): MockClient {
  return {
    findAll: jest.fn().mockResolvedValue(configs),
    update: jest.fn().mockResolvedValue(undefined)
  }
}

describe('applyWorkspaceConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('does nothing when configuration is null', async () => {
    const client = makeMockClient([makePc('tracker')])
    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, null)
    expect(client.findAll).not.toHaveBeenCalled()
    expect(client.update).not.toHaveBeenCalled()
  })

  test('does nothing when configuration is undefined', async () => {
    const client = makeMockClient([makePc('tracker')])
    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, undefined)
    expect(client.findAll).not.toHaveBeenCalled()
    expect(client.update).not.toHaveBeenCalled()
  })

  test('does nothing when disabledPlugins is empty', async () => {
    const client = makeMockClient([makePc('tracker')])
    const config: WorkspaceConfiguration = { withDemoContent: false }
    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, config)
    expect(client.findAll).not.toHaveBeenCalled()
    expect(client.update).not.toHaveBeenCalled()
  })

  test('disables the requested plugin configurations', async () => {
    const tracker = makePc('tracker')
    const drive = makePc('drive')
    const recruit = makePc('recruit')
    const client = makeMockClient([tracker, drive, recruit])

    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, {
      disabledPlugins: ['tracker' as any, 'recruit' as any]
    })

    expect(client.findAll).toHaveBeenCalledTimes(1)
    expect(client.update).toHaveBeenCalledTimes(2)
    expect(client.update).toHaveBeenCalledWith(tracker, { enabled: false })
    expect(client.update).toHaveBeenCalledWith(recruit, { enabled: false })
    expect(client.update).not.toHaveBeenCalledWith(drive, expect.anything())
  })

  test('refuses to disable system plugins (defense in depth)', async () => {
    const systemPc = makePc('core', { system: true })
    const tracker = makePc('tracker')
    const client = makeMockClient([systemPc, tracker])

    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, {
      disabledPlugins: ['core' as any, 'tracker' as any]
    })

    expect(client.update).toHaveBeenCalledTimes(1)
    expect(client.update).toHaveBeenCalledWith(tracker, { enabled: false })
  })

  test('is idempotent: already-disabled plugins are not updated again', async () => {
    const tracker = makePc('tracker', { enabled: false })
    const client = makeMockClient([tracker])

    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, {
      disabledPlugins: ['tracker' as any]
    })

    expect(client.update).not.toHaveBeenCalled()
  })

  test('ignores unknown pluginIds (no error, no update)', async () => {
    const tracker = makePc('tracker')
    const client = makeMockClient([tracker])

    await applyWorkspaceConfiguration(mockCtx, client as unknown as TxOperations, {
      disabledPlugins: ['nonexistent' as any]
    })

    expect(client.update).not.toHaveBeenCalled()
  })
})

describe('shouldRunInitScript', () => {
  test('returns true when configuration is null (legacy default)', () => {
    expect(shouldRunInitScript(null)).toBe(true)
  })

  test('returns true when configuration is undefined (legacy default)', () => {
    expect(shouldRunInitScript(undefined)).toBe(true)
  })

  test('returns true when withDemoContent is unspecified', () => {
    expect(shouldRunInitScript({ disabledPlugins: ['tracker' as any] })).toBe(true)
  })

  test('returns true when withDemoContent is explicitly true', () => {
    expect(shouldRunInitScript({ withDemoContent: true })).toBe(true)
  })

  test('returns false only when withDemoContent is explicitly false', () => {
    expect(shouldRunInitScript({ withDemoContent: false })).toBe(false)
  })
})
