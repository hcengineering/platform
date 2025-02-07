//
// Copyright © 2023, 2025 Hardcore Engineering Inc.
//

import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, SplitLogger } from '@hcengineering/analytics-service'
import { MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { startFront } from '@hcengineering/front/src/starter'
import { initStatisticsContext } from '@hcengineering/server-core'
import { join } from 'path'

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'front')

const metricsContext = initStatisticsContext('front', {
  factory: () =>
    new MeasureMetricsContext(
      'front',
      {},
      {},
      newMetrics(),
      new SplitLogger('front', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

startFront(metricsContext, {
  GITHUB_APP: process.env.GITHUB_APP ?? '',
  GITHUB_CLIENTID: process.env.GITHUB_CLIENTID ?? '',
  INTERCOM_APP_ID: process.env.INTERCOM_APP_ID ?? '',
  INTERCOM_API_URL: process.env.INTERCOM_API_URL ?? '',
  GITHUB_URL: process.env.GITHUB_URL ?? '',
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',
  LIVEKIT_WS: process.env.LIVEKIT_WS ?? '',
  LOVE_ENDPOINT: process.env.LOVE_ENDPOINT ?? '',
  SIGN_URL: process.env.SIGN_URL ?? '',
  PRINT_URL: process.env.PRINT_URL ?? '',
  PRESENCE_URL: process.env.PRESENCE_URL ?? '',
  PUSH_PUBLIC_KEY: process.env.PUSH_PUBLIC_KEY ?? '',
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
  POSTHOG_HOST: process.env.POSTHOG_HOST,
  DESKTOP_UPDATES_URL: process.env.DESKTOP_UPDATES_URL,
  DESKTOP_UPDATES_CHANNEL: process.env.DESKTOP_UPDATES_CHANNEL,
  ANALYTICS_COLLECTOR_URL: process.env.ANALYTICS_COLLECTOR_URL,
  LINK_PREVIEW_URL: process.env.LINK_PREVIEW_URL,
  AI_URL: process.env.AI_URL,
  TELEGRAM_BOT_URL: process.env.TELEGRAM_BOT_URL,
  STATS_URL: process.env.STATS_API ?? process.env.STATS_URL,
  BACKUP_URL: process.env.BACKUP_URL,
  EXPORT_URL: process.env.EXPORT_URL
})
