//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Ref, Space } from '@hcengineering/core'
import type { IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'

/**
 * @public
 */
export type PrautWorkflowStage = 'lead' | 'qualification' | 'proposal' | 'handoff' | 'delivery' | 'reporting'

/**
 * @public
 */
export const prautWorkflowId = 'praut-workflow' as Plugin

/**
 * @public
 */
export default plugin(prautWorkflowId, {
  app: {
    PrautWorkflow: '' as Ref<Space>
  },
  string: {
    PrautWorkflow: '' as IntlString,
    LeadToProject: '' as IntlString,
    ApprovalRequired: '' as IntlString
  }
})
