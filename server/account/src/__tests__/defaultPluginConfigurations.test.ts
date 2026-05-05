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
  type Data,
  generateId,
  type PluginConfiguration,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type WorkspaceConfiguration
} from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'

import {
  getDefaultPluginConfigurations,
  initDefaultPluginConfigurations,
  resetDefaultPluginConfigurations,
  validateWorkspaceConfiguration
} from '../defaultPluginConfigurations'

const SYSTEM_ACCOUNT = 'core:account:System' as any
const WORKBENCH_APPLICATION_CLASS = 'workbench:class:Application' as any

interface PluginFixture {
  configTx: TxCreateDoc<PluginConfiguration>
  appTx?: TxCreateDoc<any>
  /** All txes in this fixture, in the order they should be added to the model. */
  allTxes: Tx[]
}

function makePluginFixture (
  pluginId: string,
  options: {
    overrides?: Partial<Data<PluginConfiguration>>
    withApp?: boolean
  } = {}
): PluginFixture {
  const { overrides = {}, withApp = true } = options

  const appTx: TxCreateDoc<any> | undefined = withApp
    ? ({
        _id: generateId() as any,
        _class: core.class.TxCreateDoc,
        space: core.space.Tx,
        modifiedOn: Date.now(),
        modifiedBy: SYSTEM_ACCOUNT,
        objectId: generateId() as any,
        objectClass: WORKBENCH_APPLICATION_CLASS,
        objectSpace: core.space.Model,
        attributes: {}
      } as any)
    : undefined

  const configTx: TxCreateDoc<PluginConfiguration> = {
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    space: core.space.Tx,
    modifiedOn: Date.now(),
    modifiedBy: SYSTEM_ACCOUNT,
    objectId: ('plugin-configuration-' + pluginId) as Ref<PluginConfiguration>,
    objectClass: core.class.PluginConfiguration,
    objectSpace: core.space.Model,
    attributes: {
      pluginId: pluginId as Plugin,
      transactions: appTx !== undefined ? [appTx._id] : [],
      label: ('plugin:string.' + pluginId) as any,
      enabled: true,
      beta: false,
      ...overrides
    }
  }

  return {
    configTx,
    appTx,
    allTxes: appTx !== undefined ? [appTx, configTx] : [configTx]
  }
}

function makePcCreateTx (pluginId: string, overrides: Partial<Data<PluginConfiguration>> = {}): Tx[] {
  return makePluginFixture(pluginId, { overrides }).allTxes
}

describe('defaultPluginConfigurations module', () => {
  beforeEach(() => {
    resetDefaultPluginConfigurations()
  })

  test('returns null before init (older account-pod)', () => {
    expect(getDefaultPluginConfigurations()).toBeNull()
  })

  test('returns null after reset', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))
    resetDefaultPluginConfigurations()
    expect(getDefaultPluginConfigurations()).toBeNull()
  })

  test('after init, returns Data projection of PluginConfigurations from the model', () => {
    const txes: Tx[] = [...makePcCreateTx('tracker'), ...makePcCreateTx('drive')]
    initDefaultPluginConfigurations(txes)

    const list = getDefaultPluginConfigurations()
    expect(list).not.toBeNull()
    expect(list?.map((p) => p.pluginId)).toEqual(expect.arrayContaining(['tracker', 'drive']))
    expect(list?.length).toBe(2)
  })

  test('strips Doc-level fields, keeps only Data<PluginConfiguration> shape', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))

    const list = getDefaultPluginConfigurations()
    const item = list?.[0] as any
    expect(item).toBeDefined()
    expect(item._id).toBeUndefined()
    expect(item._class).toBeUndefined()
    expect(item.space).toBeUndefined()
    expect(item.modifiedBy).toBeUndefined()
    expect(item.modifiedOn).toBeUndefined()
    expect(item.pluginId).toBe('tracker')
    expect(item.label).toBe('plugin:string.tracker')
    expect(item.enabled).toBe(true)
    expect(item.beta).toBe(false)
  })

  test('filters out system: true plugins', () => {
    initDefaultPluginConfigurations([...makePcCreateTx('tracker'), ...makePcCreateTx('core', { system: true })])

    const list = getDefaultPluginConfigurations()
    expect(list?.map((p) => p.pluginId)).toEqual(['tracker'])
  })

  test('filters out hidden: true plugins', () => {
    initDefaultPluginConfigurations([...makePcCreateTx('tracker'), ...makePcCreateTx('experimental', { hidden: true })])

    const list = getDefaultPluginConfigurations()
    expect(list?.map((p) => p.pluginId)).toEqual(['tracker'])
  })

  test('filters out enabled: false plugins (opted-out by default in the model)', () => {
    initDefaultPluginConfigurations([...makePcCreateTx('tracker'), ...makePcCreateTx('survey', { enabled: false })])

    const list = getDefaultPluginConfigurations()
    expect(list?.map((p) => p.pluginId)).toEqual(['tracker'])
  })

  test('filters out integration-only plugins (no workbench Application createDoc)', () => {
    // Integration-style plugin: PluginConfiguration but no workbench Application
    // among its transactions. Mirrors how gmail/telegram are wired.
    const integrationOnly = makePluginFixture('gmail', { withApp: false })
    initDefaultPluginConfigurations([...makePcCreateTx('tracker'), ...integrationOnly.allTxes])

    const list = getDefaultPluginConfigurations()
    expect(list?.map((p) => p.pluginId)).toEqual(['tracker'])
  })

  test('ignores non-PluginConfiguration createDoc transactions', () => {
    const unrelatedTx: Tx = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      modifiedOn: Date.now(),
      modifiedBy: SYSTEM_ACCOUNT,
      objectId: generateId(),
      objectClass: core.class.Class,
      objectSpace: core.space.Model,
      attributes: {}
    } as any

    initDefaultPluginConfigurations([unrelatedTx, ...makePcCreateTx('tracker')])

    const list = getDefaultPluginConfigurations()
    expect(list?.map((p) => p.pluginId)).toEqual(['tracker'])
  })

  test('preserves optional metadata fields when present', () => {
    const txes = makePcCreateTx('drive', {
      icon: 'plugin:icon.Drive' as any,
      description: 'plugin:string.DriveDesc' as any,
      classFilter: ['plugin:class.Foo' as any]
    })
    initDefaultPluginConfigurations(txes)

    const item = getDefaultPluginConfigurations()?.[0] as any
    expect(item.icon).toBe('plugin:icon.Drive')
    expect(item.description).toBe('plugin:string.DriveDesc')
    expect(item.classFilter).toEqual(['plugin:class.Foo'])
  })
})

describe('validateWorkspaceConfiguration', () => {
  beforeEach(() => {
    resetDefaultPluginConfigurations()
  })

  test('returns undefined when no configuration is given', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))
    expect(validateWorkspaceConfiguration(undefined)).toBeUndefined()
  })

  test('passes withDemoContent through unchanged', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))
    const config: WorkspaceConfiguration = { withDemoContent: false }
    expect(validateWorkspaceConfiguration(config)).toEqual({ withDemoContent: false })
  })

  test('keeps disabledPlugins that exist in the snapshot', () => {
    initDefaultPluginConfigurations([...makePcCreateTx('tracker'), ...makePcCreateTx('drive')])
    const config: WorkspaceConfiguration = {
      disabledPlugins: ['tracker' as any, 'drive' as any]
    }
    const validated = validateWorkspaceConfiguration(config)
    expect(validated?.disabledPlugins).toEqual(expect.arrayContaining(['tracker', 'drive']))
    expect(validated?.disabledPlugins?.length).toBe(2)
  })

  test('drops disabledPlugins that are unknown to the snapshot', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))
    const config: WorkspaceConfiguration = {
      disabledPlugins: ['tracker' as any, 'nonexistent' as any, 'malicious' as any]
    }
    const validated = validateWorkspaceConfiguration(config)
    expect(validated?.disabledPlugins).toEqual(['tracker'])
  })

  test('drops disabledPlugins that are system in the model (filtered before snapshot)', () => {
    // initDefaultPluginConfigurations already strips system: true, so
    // such pluginIds never make it into the snapshot and are rejected here.
    initDefaultPluginConfigurations([...makePcCreateTx('tracker'), ...makePcCreateTx('core', { system: true })])
    const config: WorkspaceConfiguration = {
      disabledPlugins: ['tracker' as any, 'core' as any]
    }
    const validated = validateWorkspaceConfiguration(config)
    expect(validated?.disabledPlugins).toEqual(['tracker'])
  })

  test('drops disabledPlugins entirely when snapshot is null (cannot validate)', () => {
    // No init — snapshot is null.
    const config: WorkspaceConfiguration = {
      disabledPlugins: ['tracker' as any],
      withDemoContent: false
    }
    const validated = validateWorkspaceConfiguration(config)
    expect(validated).toEqual({ withDemoContent: false })
    expect(validated?.disabledPlugins).toBeUndefined()
  })

  test('drops empty disabledPlugins array', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))
    const config: WorkspaceConfiguration = { disabledPlugins: [] }
    const validated = validateWorkspaceConfiguration(config)
    expect(validated?.disabledPlugins).toBeUndefined()
  })

  test('returns undefined when configuration ends up empty after validation', () => {
    initDefaultPluginConfigurations(makePcCreateTx('tracker'))
    const config: WorkspaceConfiguration = { disabledPlugins: ['unknown' as any] }
    expect(validateWorkspaceConfiguration(config)).toBeUndefined()
  })
})
