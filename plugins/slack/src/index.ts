//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Ref, IntegrationKind } from '@hcengineering/core'
import { type Plugin, plugin, type Metadata } from '@hcengineering/platform'
import type { Handler, IntegrationType } from '@hcengineering/setting'
import type { AnyComponent } from '@hcengineering/ui'

/** @public */
export const slackIntegrationKind = 'slack' as IntegrationKind

/** @public */
export const slackId = 'slack' as Plugin

export default plugin(slackId, {
  component: {
    Connect: '' as AnyComponent,
    Configure: '' as AnyComponent,
    IconSlack: '' as AnyComponent
  },
  integrationType: {
    Slack: '' as Ref<IntegrationType>
  },
  handler: {
    DisconnectHandler: '' as Handler,
    DisconnectAllHandler: '' as Handler
  },
  metadata: {
    // Public base URL of the pod-slack OAuth service, e.g. https://slack.company.com
    ServiceUrl: '' as Metadata<string>
  }
})
