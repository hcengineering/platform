// Copyright © 2026 Krang / Subfracture
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import { WidgetType } from '@hcengineering/workbench'

import aiAgent from './plugin'

export { aiAgentId } from '@hcengineering/ai-agent'
export { default } from './plugin'

export function createModel (builder: Builder): void {
  // Register the Agent Widget in the sidebar
  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: aiAgent.string.AgentWidget,
      type: WidgetType.Fixed, // Always visible for testing
      icon: aiAgent.icon.Agent,
      component: aiAgent.component.AgentWidget
    },
    aiAgent.ids.AgentWidget
  )
}
