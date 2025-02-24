//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { AnalyticProvider, Analytics } from '@hcengineering/analytics'
import { SentryAnalyticProvider } from './sentry'

export * from './logging'
export * from './sentry'

export function configureAnalytics (sentryDSN: string | undefined, config?: Record<string, any>): void {
  const providers: AnalyticProvider[] = []
  if (sentryDSN !== undefined && sentryDSN !== '') {
    providers.push(new SentryAnalyticProvider(sentryDSN))
  }
  for (const provider of providers) {
    Analytics.init(provider, config ?? {})
  }
}
