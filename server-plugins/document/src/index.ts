//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { Presenter } from '@hcengineering/server-notification'

/**
 * @public
 */
export const serverDocumentId = 'server-document' as Plugin

/**
 * @public
 */
export default plugin(serverDocumentId, {
  function: {
    DocumentHTMLPresenter: '' as Resource<Presenter>,
    DocumentTextPresenter: '' as Resource<Presenter>
  }
})
