//
// Copyright © 2025 Hardcore Engineering Inc.
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
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface PackedConfig {
  server?: string
  updatesChannelKey?: string
  _version?: string
}

/**
 * Reads a JSON config file, returning undefined on error.
 */
function readConfigFile (filePath: string): PackedConfig | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PackedConfig
  } catch (err) {
    console.error(`Failed to read config from ${filePath}:`, err)
    return undefined
  }
}

/**
 * Writes a JSON config file, logging errors.
 */
function writeConfigFile (filePath: string, config: PackedConfig): boolean {
  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error(`Failed to write config to ${filePath}:`, err)
    return false
  }
}

/**
 * Migrates and updates config from bundled resourcesPath to app-specific userData location.
 * Handles config updates when a new version is installed with a new bundled config.
 */
function migrateConfigIfNeeded (): void {
  try {
    const userDataConfigPath = path.join(app.getPath('userData'), 'config.json')
    const resourcesConfigPath = path.join(process.resourcesPath, 'config', 'config.json')

    const userDataDir = app.getPath('userData')
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true })
    }

    const bundledConfig = readConfigFile(resourcesConfigPath)
    if (bundledConfig === undefined) {
      return
    }

    bundledConfig._version = process.env.VERSION

    if (!fs.existsSync(userDataConfigPath)) {
      if (writeConfigFile(userDataConfigPath, bundledConfig)) {
        console.log('Migrated config from bundled location to app-specific userData:', userDataConfigPath)
      }
      return
    }

    const userDataConfig = readConfigFile(userDataConfigPath)
    if (userDataConfig === undefined) {
      writeConfigFile(userDataConfigPath, bundledConfig)
      return
    }

    const bundledVersion = bundledConfig._version ?? ''
    const userDataVersion = userDataConfig._version ?? ''
    if (bundledVersion !== userDataVersion && bundledVersion !== '') {
      const mergedConfig: PackedConfig = {
        ...userDataConfig,
        ...bundledConfig,
        _version: bundledVersion
      }
      if (writeConfigFile(userDataConfigPath, mergedConfig)) {
        console.log('Updated userData config with new bundled config values, version:', bundledVersion)
      }
    }
  } catch (err) {
    console.error('Failed to migrate config:', err)
  }
}

function getConfigPath (): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export function readPackedConfig (): PackedConfig | undefined {
  migrateConfigIfNeeded()

  const configPath = getConfigPath()
  const config = readConfigFile(configPath)
  if (config !== undefined) {
    return config
  }

  // Fallback to bundled config if userData config doesn't exist (shouldn't happen after migration)
  const resourcesConfigPath = path.join(process.resourcesPath, 'config', 'config.json')
  return readConfigFile(resourcesConfigPath)
}
