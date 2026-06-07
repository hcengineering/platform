//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { createOpportunityFromLead, createRiskFlag, requestApproval } from './service'

export * from './service'

/**
 * @public
 */
export const serverPrautWorkflowId = 'server-praut-workflow' as Plugin

/**
 * @public
 */
export default plugin(serverPrautWorkflowId, {
  function: {
    CreateOpportunityFromLead: '' as Resource<typeof createOpportunityFromLead>,
    RequestApproval: '' as Resource<typeof requestApproval>,
    CreateRiskFlag: '' as Resource<typeof createRiskFlag>
  }
})
