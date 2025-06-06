//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import { type Builder } from '@hcengineering/model'

import core, { type Class, type Doc } from '@hcengineering/core'
import document from '@hcengineering/document'
import serverCore, { type ObjectDDParticipant } from '@hcengineering/server-core'
import serverDocument from '@hcengineering/server-document'
import serverNotification from '@hcengineering/server-notification'
import serverView from '@hcengineering/server-view'

export { serverDocumentId } from '@hcengineering/server-document'

export function createModel (builder: Builder): void {
  builder.mixin(document.class.Document, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverDocument.function.DocumentHTMLPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverDocument.function.DocumentTextPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, serverView.mixin.ServerLinkIdProvider, {
    encode: serverDocument.function.DocumentLinkIdProvider
  })

  builder.mixin(document.class.Document, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: document.component.DocumentSearchIcon,
      fields: [['icon'], ['color']]
    },
    title: [['title']]
  })

  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    document.class.Document,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverDocument.function.FindChildDocuments
    }
  )
}
