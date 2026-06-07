//
// Copyright © 2026 PRAUT
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import type { Builder } from '@hcengineering/model'
import { TPrautApproval, TPrautOpportunity, TPrautRiskFlag } from './types'

export { default, prautWorkflowId, type PrautWorkflowStage } from '@hcengineering/praut-workflow'
export * from './types'

/**
 * @public
 */
export function createModel(builder: Builder): void {
  builder.createModel(TPrautOpportunity, TPrautApproval, TPrautRiskFlag)
}
