//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Ref } from '@anticrm/core'
import type { Asset, IntlString } from '@anticrm/platform'
import { IssuePriority, Team } from '@anticrm/tracker'
import { AnyComponent } from '@anticrm/ui'
import tracker from './plugin'

export interface NavigationItem {
  id: string
  label: IntlString
  icon: Asset
  component: AnyComponent
  componentProps?: Record<string, string>
  top: boolean
}

export interface Selection {
  currentTeam?: Ref<Team>
  currentSpecial?: string
}

export const issuePriorities: Record<IssuePriority, { icon: Asset, label: IntlString }> = {
  [IssuePriority.NoPriority]: { icon: tracker.icon.PriorityNoPriority, label: tracker.string.NoPriority },
  [IssuePriority.Urgent]: { icon: tracker.icon.PriorityUrgent, label: tracker.string.Urgent },
  [IssuePriority.High]: { icon: tracker.icon.PriorityHigh, label: tracker.string.High },
  [IssuePriority.Medium]: { icon: tracker.icon.PriorityMedium, label: tracker.string.Medium },
  [IssuePriority.Low]: { icon: tracker.icon.PriorityLow, label: tracker.string.Low }
}
