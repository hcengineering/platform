//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/core'
import serverCore from '@hcengineering/server-core'
import { RequestStatus } from '@hcengineering/request'
import documents, { DocumentState } from '@hcengineering/controlled-documents'
import serverDocuments from '@hcengineering/server-controlled-documents'
import contact from '@hcengineering/contact'
import serverNotification from '@hcengineering/server-notification'
import notification from '@hcengineering/notification'

export { serverDocumentsId } from '@hcengineering/server-controlled-documents/src/index'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnEmployeeCreate,
    txMatch: {
      objectClass: contact.class.Person,
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee,
      'attributes.active': true
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocDeleted,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument,
      'operations.state': DocumentState.Deleted
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocPlannedEffectiveDateChanged,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocApprovalRequestApproved,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      attachedToClass: documents.class.ControlledDocument,
      objectClass: documents.class.DocumentApprovalRequest,
      'operations.status': RequestStatus.Completed
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocHasBecomeEffective,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument,
      'operations.state': DocumentState.Effective
    }
  })

  builder.mixin(documents.class.DocumentMeta, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: documents.component.DocumentIcon
    },
    title: [['title']]
  })

  builder.mixin(documents.class.ControlledDocument, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverDocuments.function.ControlledDocumentTextPresenter
  })

  builder.mixin(
    documents.notification.CoAuthorsNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverDocuments.function.CoAuthorsTypeMatch
    }
  )
}
