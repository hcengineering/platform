//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import { Doc } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { ObjectDDParticipantFunc } from '@hcengineering/server-core'
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
    DocumentTextPresenter: '' as Resource<Presenter>,
    DocumentLinkIdProvider: '' as Resource<(doc: Doc) => Promise<string>>,
    FindChildDocuments: '' as Resource<ObjectDDParticipantFunc>
  }
})
