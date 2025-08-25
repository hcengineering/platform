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

import { Integration } from '@hcengineering/account-client'
import { IntegrationEventData } from './types'

export function isWorkspaceIntegration (integration: Integration): boolean {
  return integration.workspaceUuid != null
}

export function isConnection (integration: Integration): boolean {
  return integration.workspaceUuid == null
}

export function isSameIntegrationEvent (event: IntegrationEventData, integration: Integration): boolean {
  return (
    event.integration?.socialId === integration.socialId &&
    event.integration?.workspaceUuid === integration.workspaceUuid
  )
}

export function getIntegrationConfig (integration: Integration): Record<string, any> | undefined {
  return integration?.data?.config
}
