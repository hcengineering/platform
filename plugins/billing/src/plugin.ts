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
import { type Class, type Ref } from '@hcengineering/core'
import { type Asset, type IntlString, type Metadata, plugin, type Plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { Tier } from './types'

/** @public */
export const billingId = 'billing' as Plugin

export const billingPlugin = plugin(billingId, {
  class: {
    Tier: '' as Ref<Class<Tier>>
  },
  metadata: {
    BillingURL: '' as Metadata<string>
  },
  component: {
    Settings: '' as AnyComponent,
    WorkbenchExtension: '' as AnyComponent,
    UpgradeButtonExt: '' as AnyComponent
  },
  string: {
    Billing: '' as IntlString,
    DriveSize: '' as IntlString,
    DriveCount: '' as IntlString,
    OfficeSessionsDuration: '' as IntlString,
    OfficeSessionsBandwidth: '' as IntlString,
    OfficeEgressDuration: '' as IntlString,
    AI: '' as IntlString,
    TotalTokens: '' as IntlString,
    TranscriptionTime: '' as IntlString,
    Tier: '' as IntlString,
    StorageLimit: '' as IntlString,
    TrafficLimit: '' as IntlString,
    Common: '' as IntlString,
    CommonDescription: '' as IntlString,
    Rare: '' as IntlString,
    RareDescription: '' as IntlString,
    Epic: '' as IntlString,
    EpicDescription: '' as IntlString,
    Legendary: '' as IntlString,
    LegendaryDescription: '' as IntlString,
    UpgradePlan: '' as IntlString,
    LimitReached: '' as IntlString,
    AskBillingAdmin: '' as IntlString
  },
  icon: {
    Billing: '' as Asset,
    Subscriptions: '' as Asset
  },
  tier: {
    Common: '' as Ref<Tier>,
    Rare: '' as Ref<Tier>,
    Epic: '' as Ref<Tier>,
    Legendary: '' as Ref<Tier>
  }
})

export default billingPlugin
