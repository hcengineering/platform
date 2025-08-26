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
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import login from '@hcengineering/login'
import { hulyMailIntegrationKind } from '@hcengineering/huly-mail'
import {
  getIntegrationClient as getIntegrationClientRaw,
  type IntegrationClient
} from '@hcengineering/integration-client'
import { getClient as getAccountClientRaw, type AccountClient } from '@hcengineering/account-client'

export async function getIntegrationClient (): Promise<IntegrationClient> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)
  if (accountsUrl === undefined || token === undefined) {
    throw new Error('Accounts URL or token is not defined')
  }
  return getIntegrationClientRaw(accountsUrl, token, hulyMailIntegrationKind, 'huly-mail')
}

export function getAccountClient (): AccountClient {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)

  return getAccountClientRaw(accountsUrl, token)
}
