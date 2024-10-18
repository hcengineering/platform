import { AnalyticProvider } from "@hcengineering/analytics"
import posthog from 'posthog-js'

export class PosthogAnalyticProvider implements AnalyticProvider {
  init(config: Record<string, any>): boolean {
    if (config.POSTHOG_API_KEY !== undefined && config.POSTHOG_API_KEY !== '' && config.POSTHOG_HOST !== null) {
      posthog.init(config.POSTHOG_API_KEY, {
        api_host: config.POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false
      })
      return true
    }
    return false
  }

  setUser(email: string): void {
    posthog.identify(email, { email: email })
  }
  setTag(key: string, value: string): void {
    posthog.setPersonProperties({ [key]: value })
  }
  setWorkspace(ws: string): void {
    this.setTag('workspace', ws)
    posthog.group('workspace', ws, {
      name: `${ws}`
    })
  }
  logout(): void {
    posthog.reset()
  }
  handleEvent(event: string, params: Record<string, any>): void {
    posthog.capture(event, params)
  }
  handleError(error: Error): void {
    posthog.capture(error.message)
  }
  navigate(path: string): void {
    posthog.capture('$pageview')
  }
}