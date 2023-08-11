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

import { Account } from '@hcengineering/core'

/**
 * @public
 */
export interface SupportClient {
  showWidget: () => Promise<void>
  hideWidget: () => Promise<void>
  toggleWidget: () => Promise<void>
  destroy: () => void
}

/**
 * @public
 */
export interface SupportWidget {
  configure: (config: SupportWidgetConfig) => void

  showWidget: () => void
  hideWidget: () => void
  toggleWidget: () => void

  destroy: () => void
}

/**
 * @public
 */
export interface SupportWidgetConfig {
  account?: Account
  workspace?: string
  language?: string
}

/**
 * @public
 */
export type SupportClientFactory = () => SupportClient
