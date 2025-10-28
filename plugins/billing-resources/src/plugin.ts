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

import billing, { billingId } from '@hcengineering/billing'
import { type IntlString, mergeIds } from '@hcengineering/platform'

export default mergeIds(billingId, billing, {
  string: {
    AllPlans: '' as IntlString,
    ActivePlan: '' as IntlString,
    ResourceUsage: '' as IntlString,
    Subscriptions: '' as IntlString,
    UnlimitedUsers: '' as IntlString,
    UnlimitedObjects: '' as IntlString,
    ChangePlan: '' as IntlString,
    Monthly: '' as IntlString,
    Active: '' as IntlString,
    SubscriptionEnds: '' as IntlString
  }
})
