import { AnalyticProvider } from '@hcengineering/analytics'
import * as Sentry from '@sentry/node'

export class SentryAnalyticProvider implements AnalyticProvider {
  constructor (readonly SENTRY_DSN: string) {}

  init (config: Record<string, any>): boolean {
    Sentry.init({
      dsn: this.SENTRY_DSN,
      integrations: (integrations) => {
        // integrations will be all default integrations
        return [
          ...integrations.filter((integration) => integration.name !== 'Console'),
          Sentry.onUncaughtExceptionIntegration(),
          Sentry.onUnhandledRejectionIntegration()
        ]
      },

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0
    })
    return true
  }

  setUser (email: string): void {
    Sentry.setUser({ email })
  }

  setTag (key: string, value: string): void {
    Sentry.setTag(key, value)
  }

  setWorkspace (ws: string): void {
    this.setTag('workspace', ws)
  }

  handleEvent (event: string): void {
    // currently we don't need it, but maybe in future
    // Sentry.captureMessage(event, 'log')
  }

  handleError (error: Error): void {
    Sentry.captureException(error)
  }

  navigate (path: string): void {}
  logout (): void {}
}
