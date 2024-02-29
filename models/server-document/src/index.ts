//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import { type Builder } from '@hcengineering/model'

import core from '@hcengineering/core'
import document from '@hcengineering/document'
import serverCore from '@hcengineering/server-core'
import serverDocument from '@hcengineering/server-document'
import serverNotification from '@hcengineering/server-notification'

export { serverDocumentId } from '@hcengineering/server-document'

export function createModel (builder: Builder): void {
  builder.mixin(document.class.Document, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverDocument.function.DocumentHTMLPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverDocument.function.DocumentTextPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, serverCore.mixin.SearchPresenter, {
    searchConfig: {
      iconConfig: {
        component: document.component.DocumentSearchIcon,
        props: ['icon', 'color']
      },
      title: 'name'
    }
  })
}
