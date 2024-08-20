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

import { Analytics } from '@hcengineering/analytics'
import { MeasureMetricsContext, metricsToString, newMetrics } from '@hcengineering/core'
import { startCollaborator } from '@hcengineering/collaborator'
import { configureAnalytics, SplitLogger } from '@hcengineering/analytics-service'
import { writeFile } from 'fs/promises'
import { join } from 'path'

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'collaborator')

const ctx = new MeasureMetricsContext(
  'collaborator',
  {},
  {},
  newMetrics(),
  new SplitLogger('collaborator', {
    root: join(process.cwd(), 'logs'),
    enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
  })
)

let oldMetricsValue = ''

const intTimer = setInterval(() => {
  const val = metricsToString(ctx.metrics, 'Collaborator', 140)
  if (val !== oldMetricsValue) {
    oldMetricsValue = val
    void writeFile('metrics.txt', val).catch((err) => {
      console.error(err)
    })
  }
}, 30000)

void startCollaborator(ctx, () => {
  clearInterval(intTimer)
})
