//
// Copyright © 2024 Hardcore Engineering Inc
//

import { addEventListener, PlatformEvent, Severity, Status, translate } from '@hcengineering/platform'

export const providers: AnalyticProvider[] = []

export interface AnalyticProvider {
  init: (config: Record<string, any>) => boolean
  setUser: (email: string) => void
  setTag: (key: string, value: string) => void
  setWorkspace: (ws: string) => void
  handleEvent: (event: string) => void
  handleError: (error: Error) => void
  navigate: (path: string) => void
}

export const Analytics = {
  init (provider: AnalyticProvider, config: Record<string, any>): void {
    const res = provider.init(config)
    if (res) {
      providers.push(provider)
    }
  },

  setUser (email: string): void {
    providers.forEach((provider) => {
      provider.setUser(email)
    })
  },

  setTag (key: string, value: string): void {
    providers.forEach((provider) => {
      provider.setTag(key, value)
    })
  },

  setWorkspace (ws: string): void {
    providers.forEach((provider) => {
      provider.setWorkspace(ws)
    })
  },

  handleEvent (event: string): void {
    providers.forEach((provider) => {
      provider.handleEvent(event)
    })
  },

  handleError (error: Error): void {
    providers.forEach((provider) => {
      provider.handleError(error)
    })
  },

  navigate (path: string): void {
    providers.forEach((provider) => {
      provider.navigate(path)
    })
  }
}

addEventListener(PlatformEvent, async (_event, _status: Status) => {
  if (_status.severity === Severity.ERROR) {
    const label = await translate(_status.code, _status.params, 'en')
    Analytics.handleError(new Error(label))
  }
})
