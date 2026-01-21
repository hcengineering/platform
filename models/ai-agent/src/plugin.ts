// Copyright © 2026 Krang / Subfracture
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

import { aiAgentId } from '@hcengineering/ai-agent'
import aiAgent from '@hcengineering/ai-agent-resources/src/plugin'
import { type Ref } from '@hcengineering/core'
import { mergeIds } from '@hcengineering/platform'
import { type Widget } from '@hcengineering/workbench'

export default mergeIds(aiAgentId, aiAgent, {
  ids: {
    AgentWidget: '' as Ref<Widget>
  }
})
