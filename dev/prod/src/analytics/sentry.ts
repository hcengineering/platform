import { type AnalyticProvider } from "@hcengineering/analytics"
import * as Sentry from "@sentry/svelte"

export class SentryAnalyticProvider implements AnalyticProvider {
  navigate (path: string): void {}
  init (config: Record<string, any>): boolean {
    if (config.SENTRY_DSN !== undefined && config.SENTRY_DSN !== '') {
      Sentry.init({
        dsn: config.SENTRY_DSN,
        integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false
        })],

        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 1.0,

        tracePropagationTargets: [/^https:\/\/huly\.app/, /^https:\/\/app\.huly\.io/, /^https:\/\/account\.huly\.io/],

        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: 1.0,
      })
      return true
    }
    return false
  }

  setUser(email: string): void {
    Sentry.setUser({ email })
  }
  logout(): void {
    Sentry.setUser(null)
  }
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value)
  }
  setWorkspace(ws: string): void {
    this.setTag('workspace', ws)
  }
  handleEvent(event: string): void {
    // currently we don't need it, but maybe in future
    // Sentry.captureMessage(event, 'log')
  }
  handleError(error: Error): void {
    Sentry.captureException(error)
  }
}