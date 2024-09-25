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
import serverClientPlugin, { createClient, getUserWorkspaces, login, selectWorkspace } from '@hcengineering/server-client'
import { program } from 'commander'
import { importNotion } from './notion'
import { setMetadata } from '@hcengineering/platform'

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

  // import-notion-with-teamspaces /home/anna/work/notion/pages/exported --workspace workspace
  program
    .command('import-notion-with-teamspaces <dir>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace url where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      await importFromNotion(dir, cmd.user, cmd.password, cmd.workspace)
    })

  // import-notion-to-teamspace /home/anna/work/notion/pages/exported --workspace workspace --teamspace notion
  program
    .command('import-notion-to-teamspace <dir>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace url where the documents should be imported to')
    .requiredOption('-ts, --teamspace <teamspace>', 'new teamspace name where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      await importFromNotion(dir, cmd.user, cmd.password, cmd.workspace, cmd.teamspace)
    })

  async function importFromNotion (
    dir: string,
    user: string,
    password: string,
    workspaceUrl: string,
    teamspace?: string
  ): Promise<void> {
    if (workspaceUrl === '' || user === '' || password === '' || teamspace === '') {
      return
    }

    const config = await (await fetch(concatLink(getFrontUrl(), '/config.json'))).json()
    console.log('Setting up Accounts URL: ', config.ACCOUNTS_URL)
    setMetadata(serverClientPlugin.metadata.Endpoint, config.ACCOUNTS_URL)
    console.log('Trying to login user: ', user)
    const userToken = await login(user, password, workspaceUrl)
    if (userToken === undefined) {
      console.log('Login failed for user: ', user)
      return
    }

    console.log('Looking for workspace: ', workspaceUrl)
    const allWorkspaces = await getUserWorkspaces(userToken)
    const workspaces = allWorkspaces.filter((ws) => ws.workspaceUrl === workspaceUrl)
    if (workspaces.length < 1) {
      console.log('Workspace not found: ', workspaceUrl)
      return
    }
    console.log('Workspace found')
    const selectedWs = await selectWorkspace(userToken, workspaces[0].workspace)
    console.log(selectedWs)

    function uploader (token: string) {
      return (id: string, data: any) => {
        return fetch(concatLink(getFrontUrl(), config.UPLOAD_URL), {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token
          },
          body: data
        })
      }
    }

    console.log('Connecting to Transactor URL: ', selectedWs.endpoint)
    const connection = await createClient(selectedWs.endpoint, selectedWs.token)
    const acc = connection.getModel().getAccountByEmail(user)
    if (acc === undefined) {
      console.log('Account not found for email: ', user)
      return
    }
    const client = new TxOperations(connection, acc._id)
    console.log('OK. Start the import directory: ', dir)
    await importNotion(client, uploader(selectedWs.token), dir, teamspace)
    await connection.close()
  }

  program.parse(process.argv)
}
