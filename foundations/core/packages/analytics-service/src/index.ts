//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { AnalyticProvider, Analytics } from '@hcengineering/analytics'
import { initOpenTelemetrySDK, reportOTEL, reportOTELError } from '@hcengineering/measurements-otlp'

export * from '@hcengineering/measurements-otlp'
export * from './logging'

/**
 * Only these events are forwarded to OTEL. Other events (e.g. `ChangeAttribute` from core operations) can carry
 * user data and are high volume, so they stay out of the server logs.
 */
const OTEL_EVENTS = new Set<string>(['pipeline-stall-resolved'])

class OTELAnalyticsProvider implements AnalyticProvider {
  init (config: Record<string, any>): boolean {
    return true
  }

  setUser: (email: string, data: any) => void = (email, data) => {}

  setAlias: (distinctId: string, alias: string) => void = (distinctId, alias) => {}

  setTag: (key: string, value: string) => void = (key, value) => {}

  setWorkspace: (ws: string, guest: boolean) => void = (ws, guest) => {}

  handleEvent: (event: string, params: Record<string, string>) => void = (event, params) => {
    if (OTEL_EVENTS.has(event)) {
      reportOTEL('info', event, Date.now(), params)
    }
  }

  handleError (error: Error): void {
    // Errors may carry structured details in `attributes`, which keeps the message stable for grouping
    const attributes = (error as { attributes?: Record<string, any> }).attributes
    reportOTELError(error, attributes)
  }

  navigate (path: string): void {}

  logout (): void {}
}

export function configureAnalytics (serviceName: string, serviceVersion: string, config?: Record<string, any>): void {
  const providers: AnalyticProvider[] = [new OTELAnalyticsProvider()]

  initOpenTelemetrySDK(serviceName, serviceVersion)
  for (const provider of providers) {
    Analytics.init(provider, config ?? {})
  }
}
