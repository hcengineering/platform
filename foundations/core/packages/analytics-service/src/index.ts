//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { AnalyticProvider, Analytics } from '@hcengineering/analytics'
import { initOpenTelemetrySDK, reportOTELError } from '@hcengineering/measurements-otlp'

export * from '@hcengineering/measurements-otlp'
export * from './logging'

class OTELAnalyticsProvider implements AnalyticProvider {
  init (config: Record<string, any>): boolean {
    return true
  }

  setUser: (email: string, data: any) => void = (email, data) => {}

  setAlias: (distinctId: string, alias: string) => void = (distinctId, alias) => {}

  setTag: (key: string, value: string) => void = (key, value) => {}

  setWorkspace: (ws: string, guest: boolean) => void = (ws, guest) => {}

  handleEvent: (event: string, params: Record<string, string>) => void = (event, params) => {}

  handleError (error: Error): void {
    reportOTELError(error)
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
