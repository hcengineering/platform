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

import { getClient, type SubscriptionType, type AccountClient } from '@hcengineering/account-client'

/**
 * Get account client for service operations
 */
export function getAccountClient (accountsUrl: string, serviceToken: string): AccountClient {
  return getClient(accountsUrl, serviceToken)
}

export function getPlanKey (type: SubscriptionType, plan: string): string {
  return `${plan}@${type}`
}
