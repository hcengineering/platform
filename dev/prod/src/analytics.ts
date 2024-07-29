//
// Copyright © 2024 Hardcore Engineering Inc
//

import { AnalyticProvider, Analytics } from "@hcengineering/analytics"
import { SentryAnalyticProvider } from "./analytics/sentry"
import { Config } from "./platform"
import { PosthogAnalyticProvider } from "./analytics/posthog"
import { AnalyticsCollectorProvider } from './analytics/analyticsCollector'

export function configureAnalytics (config: Config) {
  const providers: AnalyticProvider[] = [
    new SentryAnalyticProvider,
    new PosthogAnalyticProvider,
    new AnalyticsCollectorProvider
  ]
  for (const provider of providers) {
    Analytics.init(provider, config)
  }
}