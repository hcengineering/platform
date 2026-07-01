//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { slackIntegrationKind } from '@hcengineering/slack'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import setting from '@hcengineering/setting'

import slack from './plugin'

export { slackId } from '@hcengineering/slack'
export { default } from './plugin'

export function createModel (builder: Builder): void {
  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: slack.string.IntegrationLabel,
      description: slack.string.IntegrationDescription,
      icon: slack.component.IconSlack,
      allowMultiple: false,
      createComponent: slack.component.Connect,
      configureComponent: slack.component.Configure,
      reconnectComponent: slack.component.Connect,
      onDisconnect: slack.handler.DisconnectHandler,
      onDisconnectAll: slack.handler.DisconnectAllHandler,
      kind: slackIntegrationKind
    },
    slack.integrationType.Slack
  )
}
