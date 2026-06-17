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

import { getMetadata, translate, type Resources } from '@hcengineering/platform'
import presentation, { setUploadGuard, UploadRestrictedError } from '@hcengineering/presentation'
import billing from './plugin'
import LimitsFooterIndicator from './components/LimitsFooterIndicator.svelte'
import Settings from './components/Settings.svelte'
import UsageExtension from './components/UsageExtension.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import { isFeatureRestricted } from './utils'

export default async (): Promise<Resources> => {
  // Skip enforcement entirely on deployments without payment integration
  // (self-hosted / dev): no plan ⇒ no quota ⇒ nothing to restrict.
  const paymentUrl = getMetadata(presentation.metadata.PaymentUrl)
  if (paymentUrl !== undefined && paymentUrl !== '') {
    setUploadGuard(async (_file) => {
      if (isFeatureRestricted('fileUpload')) {
        const message = await translate(billing.string.UploadRestrictedToast, {})
        throw new UploadRestrictedError('plan_limit_exceeded', message)
      }
    })
  } else {
    setUploadGuard(undefined)
  }

  return {
    component: {
      LimitsFooterIndicator,
      Settings,
      UsageExtension,
      WorkbenchExtension
    }
  }
}
