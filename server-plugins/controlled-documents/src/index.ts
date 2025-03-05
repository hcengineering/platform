//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { TriggerFunc } from '@hcengineering/server-core'
import { Presenter, TypeMatchFunc } from '@hcengineering/server-notification'

/**
 * @public
 */
export const serverDocumentsId = 'server-documents' as Plugin

/**
 * @public
 */
export default plugin(serverDocumentsId, {
  trigger: {
    OnEmployeeCreate: '' as Resource<TriggerFunc>,
    OnDocDeleted: '' as Resource<TriggerFunc>,
    OnDocPlannedEffectiveDateChanged: '' as Resource<TriggerFunc>,
    OnDocApprovalRequestApproved: '' as Resource<TriggerFunc>,
    OnDocHasBecomeEffective: '' as Resource<TriggerFunc>
  },
  function: {
    ControlledDocumentTextPresenter: '' as Resource<Presenter>,
    CoAuthorsTypeMatch: '' as TypeMatchFunc
  }
})
