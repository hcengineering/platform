// Copyright © 2026 Krang / Subfracture
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

import aiAgent, { aiAgentId } from '@hcengineering/ai-agent'
import { mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export default mergeIds(aiAgentId, aiAgent, {
  component: {
    AgentWidget: '' as AnyComponent,
    AgentPanel: '' as AnyComponent,
    ModeSelector: '' as AnyComponent,
    MessageList: '' as AnyComponent,
    ChatInput: '' as AnyComponent
  }
})
