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
import { concatLink, TxOperations } from '@hcengineering/core'
import {
  ClickupImporter,
  defaultDocumentPreprocessors,
  DocumentConverter,
  FrontFileUploader,
  importNotion,
  UnifiedFormatImporter,
  type DocumentConverterOptions,
  type FileUploader,
  type Logger
} from '@hcengineering/importer'
import { setMetadata } from '@hcengineering/platform'
import serverClientPlugin, {
  createClient,
  getUserWorkspaces,
  login,
  selectWorkspace
} from '@hcengineering/server-client'
import { program } from 'commander'
import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import mammoth from 'mammoth'
import { join } from 'path'

class ConsoleLogger implements Logger {
  log (msg: string, data?: any): void {
    console.log(msg, data)
  }

  warn (msg: string, data?: any): void {
    console.warn(msg, data)
  }

  error (msg: string, data?: any): void {
    console.error(msg, data)
  }
}

/**
 * @public
 */
export function importTool (): void {
  function getFrontUrl (): string {
    const frontUrl = process.env.FRONT_URL
    if (frontUrl === undefined) {
      console.error('please provide front url')
      process.exit(1)
    }
    return frontUrl
  }

  program.version('0.0.1')

  async function authorize (
    user: string,
    password: string,
    workspaceUrl: string,
    f: (client: TxOperations, uploader: FileUploader) => Promise<void>
  ): Promise<void> {
    if (workspaceUrl === '' || user === '' || password === '') {
      return
    }
    const config = await (await fetch(concatLink(getFrontUrl(), '/config.json'))).json()
    console.log('Setting up Accounts URL: ', config.ACCOUNTS_URL)
    setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
    console.log('Trying to login user: ', user)
    const { account, token } = await login(user, password, workspaceUrl)
    if (token === undefined || account === undefined) {
      console.log('Login failed for user: ', user)
      return
    }

    console.log('Looking for workspace: ', workspaceUrl)
    const allWorkspaces = await getUserWorkspaces(token)
    const workspaces = allWorkspaces.filter((ws) => ws.url === workspaceUrl)
    if (workspaces.length < 1) {
      console.log('Workspace not found: ', workspaceUrl)
      return
    }
    console.log('Workspace found')
    const selectedWs = await selectWorkspace(token, workspaces[0].url)
    console.log(selectedWs)

    console.log('Connecting to Transactor URL: ', selectedWs.endpoint)
    const connection = await createClient(selectedWs.endpoint, selectedWs.token)
    const client = new TxOperations(connection, account)
    const fileUploader = new FrontFileUploader(getFrontUrl(), selectedWs.workspace, selectedWs.token)
    try {
      await f(client, fileUploader)
    } catch (err: any) {
      console.error(err)
    }
    await connection.close()
  }

  // import-notion-with-teamspaces /home/anna/work/notion/pages/exported --workspace ws1 --user user1 --password 1234
  program
    .command('import-notion-with-teamspaces <dir>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace url where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      const { workspace, user, password } = cmd
      await authorize(user, password, workspace, async (client, uploader) => {
        await importNotion(client, uploader, dir)
      })
    })

  // import-notion-to-teamspace /home/anna/work/notion/pages/exported --workspace ws1 --teamspace notion --user user1 --password 1234
  program
    .command('import-notion-to-teamspace <dir>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace url where the documents should be imported to')
    .requiredOption('-ts, --teamspace <teamspace>', 'new teamspace name where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      const { workspace, user, password, teamspace } = cmd
      await authorize(user, password, workspace, async (client, uploader) => {
        await importNotion(client, uploader, dir, teamspace)
      })
    })

  // import-clickup-tasks /home/anna/work/clickup/aleksandr/debug/tasks.csv --workspace ws1 --user user1 --password 1234
  program
    .command('import-clickup-tasks <file>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace url where the documents should be imported to')
    .action(async (file: string, cmd) => {
      const { workspace, user, password } = cmd
      await authorize(user, password, workspace, async (client, uploader) => {
        const importer = new ClickupImporter(client, uploader, new ConsoleLogger())
        await importer.importClickUpTasks(file)
      })
    })

  // import /home/anna/xored/huly/platform/dev/import-tool/src/huly/example-workspace --workspace ws1 --user user1 --password 1234
  program
    .command('import <dir>')
    .description('import issues in Unified Huly Format')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace url where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      const { workspace, user, password } = cmd
      await authorize(user, password, workspace, async (client, uploader) => {
        const importer = new UnifiedFormatImporter(client, uploader, new ConsoleLogger())
        await importer.importFolder(dir)
      })
    })

  program
    .command('convert-qms-docx <dir>')
    .requiredOption('-o, --out <dir>', 'out')
    .option('-c, --config <file>', 'configPath')
    .description('convert QMS document into Unified Huly Format')
    .action(async (dir: string, cmd) => {
      const { out, configPath } = cmd
      const configSearchPath = configPath ?? join(dir, 'import.yaml')

      let config: DocumentConverterOptions
      try {
        const configYaml = readFileSync(configSearchPath, 'utf-8')
        const configFromFile = yaml.load(configYaml) as DocumentConverterOptions
        config = { ...configFromFile, outputPath: out }
      } catch (e: any) {
        console.error(`Unable to load config file from ${configSearchPath}: ${e}`)
        return
      }

      config.steps = [
        { name: '_extractImages' },
        { name: '_cleanupMarkup' },
        ...config.steps,
        { name: '_addStubHeader' }
      ]

      config.htmlConverter = async (path) => (await mammoth.convertToHtml({ path })).value

      const converter = new DocumentConverter(config, defaultDocumentPreprocessors)
      await converter.processFolder(dir)
      await converter.flush()
    })

  program.parse(process.argv)
}
