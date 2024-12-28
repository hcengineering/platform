//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import {
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient,
  tryMigrate
} from '@hcengineering/model'
import analyticsCollector, { analyticsCollectorId } from '@hcengineering/analytics-collector'
import { DOMAIN_SPACE } from '@hcengineering/model-core'
import { DOMAIN_DOC_NOTIFY, DOMAIN_NOTIFICATION } from '@hcengineering/model-notification'
import { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import { buildSocialIdString, type Doc, MeasureMetricsContext, SocialIdType } from '@hcengineering/core'

async function removeOnboardingChannels (client: MigrationClient): Promise<void> {
  const channels = await client.find(DOMAIN_SPACE, { 'analytics:mixin:AnalyticsChannel': { $exists: true } })

  if (channels.length === 0) {
    return
  }

  const channelsIds = channels.map((it) => it._id)
  const contexts = await client.find(DOMAIN_DOC_NOTIFY, { objectId: { $in: channelsIds } })
  const contextsIds = contexts.map((it) => it._id)

  await client.deleteMany(DOMAIN_ACTIVITY, { attachedTo: { $in: channelsIds } })
  await client.deleteMany(DOMAIN_NOTIFICATION, { docNotifyContext: { $in: contextsIds } })
  await client.deleteMany(DOMAIN_DOC_NOTIFY, { _id: { $in: contextsIds } })
  await client.deleteMany(DOMAIN_SPACE, { _id: { $in: channelsIds } })
}

async function migrateAccountsToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('analytics collector migrateAccountsToSocialIds', {})

  ctx.info('processing analytics collector onboarding channels ', {})
  const iterator = await client.traverse(DOMAIN_SPACE, { _class: analyticsCollector.class.OnboardingChannel })

  try {
    let processed = 0
    while (true) {
      const docs = await iterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

      for (const doc of docs) {
        const email = (doc as any).email
        if (email === undefined || email === '') continue
        const socialString = buildSocialIdString({ type: SocialIdType.EMAIL, value: email })

        operations.push({
          filter: { _id: doc._id },
          update: {
            socialString
          }
        })
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_SPACE, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await iterator.close()
  }
  ctx.info('finished processing analytics collector onboarding channels ', {})
}

export const analyticsCollectorOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, analyticsCollectorId, [
      {
        state: 'remove-analytics-channels-v3',
        func: removeOnboardingChannels
      },
      {
        state: 'accounts-to-social-ids',
        func: migrateAccountsToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
