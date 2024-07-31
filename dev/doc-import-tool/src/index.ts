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
import { Employee } from '@hcengineering/contact'
import documents, { DocumentSpace } from '@hcengineering/controlled-documents'
import { Ref, getWorkspaceId, systemAccountEmail } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverCore from '@hcengineering/server-core'
import serverToken, { generateToken } from '@hcengineering/server-token'
import { program } from 'commander'

import serverClientPlugin from '@hcengineering/server-client'
import { importDoc } from './commands'
import { Config } from './config'
import { getBackend } from './convert/convert'

/**
 * @public
 */
export function docImportTool (): void {
  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.error('please provide server secret')
    process.exit(1)
  }

  const accountUrl = process.env.ACCOUNTS_URL
  if (accountUrl === undefined) {
    console.error('please provide account url')
    process.exit(1)
  }

  const collaboratorApiUrl = process.env.COLLABORATOR_API_URL
  if (collaboratorApiUrl === undefined) {
    console.error('please provide collaborator url')
    process.exit(1)
  }

  const uploadUrl = process.env.UPLOAD_URL ?? '/files'

  const frontUrl = process.env.FRONT_URL
  if (frontUrl === undefined) {
    console.log('Please provide front url')
    process.exit(1)
  }

  setMetadata(serverClientPlugin.metadata.Endpoint, accountUrl)
  setMetadata(serverToken.metadata.Secret, serverSecret)
  setMetadata(serverCore.metadata.FrontUrl, frontUrl)

  program.version('0.0.1')

  program
    .command('import <doc> <workspace> <owner>')
    .description('import doc into workspace')
    .option('-s|--spec <spec>', 'Specification file')
    .option('-b|--backend <backend>', 'Conversion backend', 'pandoc')
    .option('--space <space>', 'Doc space ID', documents.space.QualityDocuments)
    .action(
      async (
        doc: string,
        workspace: string,
        owner: Ref<Employee>,
        cmd: { backend: string, space: Ref<DocumentSpace>, spec?: string }
      ) => {
        console.log(
          `Importing document '${doc}' into workspace '${workspace}', owner: ${JSON.stringify(owner)}, spec: ${
            cmd.spec
          }, space: ${cmd.space}, backend: ${cmd.backend}`
        )
        try {
          const workspaceId = getWorkspaceId(workspace)

          const config: Config = {
            doc,
            workspaceId,
            owner,
            backend: getBackend(cmd.backend),
            specFile: cmd.spec,
            space: cmd.space,
            uploadURL: uploadUrl,
            collaboratorApiURL: collaboratorApiUrl,
            token: generateToken(systemAccountEmail, workspaceId)
          }

          await importDoc(config)
        } catch (err: any) {
          console.trace(err)
        }
      }
    )

  program.parse(process.argv)
}
