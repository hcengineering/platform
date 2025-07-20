//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type AnalyticProvider } from '@hcengineering/analytics'
import posthog from 'posthog-js'

export class PosthogAnalyticProvider implements AnalyticProvider {
  init (config: Record<string, any>): boolean {
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

  setUser (email: string): void {
    if (!posthog._isIdentified()) {
      posthog.identify(email, { email })
    }
  }

  setAlias (distinctId: string, alias: string): void {
    posthog.alias(alias, distinctId)
  }

  setTag (key: string, value: string | number): void {
    posthog.setPersonProperties({ [key]: value })
  }

  setWorkspace (ws: string, guest: boolean): void {
    const prop: string = guest ? 'visited-workspace' : 'workspace'
    this.setTag(prop, ws)
    if (!guest) posthog.group(prop, ws, { name: `${ws}` })
  }

  logout (): void {
    posthog.reset(true)
  }

  handleEvent (event: string, params: Record<string, any>): void {
    posthog.capture(event, params)
  }

  handleError (error: Error): void {
    posthog.capture(error.message)
  }

  navigate (path: string): void {
    posthog.capture('$pageview')
  }
}
