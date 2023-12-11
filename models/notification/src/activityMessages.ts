import { type Builder } from '@hcengineering/model'
import view, { createAction } from '@hcengineering/model-view'
import core from '@hcengineering/model-core'

import notification from './plugin'

export function buildActivityMessages (builder: Builder): void {
  builder.mixin(notification.class.DocUpdateMessage, core.class.Class, notification.mixin.ActivityDoc, {})
  builder.mixin(notification.class.ChatMessage, core.class.Class, notification.mixin.ActivityDoc, {})

  builder.mixin(notification.class.ChatMessage, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: notification.component.ChatMessagesPresenter
  })

  builder.mixin(notification.class.ChatMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: notification.component.ChatMessagePresenter
  })

  builder.mixin(notification.class.DocUpdateMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: notification.component.DocUpdateMessagePresenter
  })

  builder.createDoc(
    notification.class.ActivityMessageExtension,
    core.space.Model,
    {
      ofMessage: notification.class.DocUpdateMessage,
      components: [
        {
          kind: 'action',
          component: notification.component.PinMessageAction
        }
      ]
    },
    notification.ids.DocUpdateMessagePinExtension
  )

  builder.createDoc(
    notification.class.ActivityMessageExtension,
    core.space.Model,
    {
      ofMessage: notification.class.ChatMessage,
      components: [
        {
          kind: 'action',
          component: notification.component.PinMessageAction
        }
      ]
    },
    notification.ids.ChatMessagePinExtension
  )

  builder.createDoc(
    notification.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: notification.mixin.Collaborators,
      action: 'update',
      icon: notification.icon.Notifications,
      component: notification.activity.TxCollaboratorsChange,
      label: notification.string.ChangeCollaborators
    },
    notification.ids.NotificationCollaboratorsChanged
  )

  builder.mixin(notification.mixin.Collaborators, core.class.Class, notification.mixin.NotificationAttributePresenter, {
    presenter: notification.component.NotificationCollaboratorsChanged
  })

  builder.createDoc(notification.class.ActivityMessagesFilter, core.space.Model, {
    label: notification.string.Attributes,
    filter: notification.filter.AttributesFilter
  })

  builder.createDoc(notification.class.ActivityMessagesFilter, core.space.Model, {
    label: notification.string.Pinned,
    filter: notification.filter.PinnedFilter
  })

  builder.createDoc(notification.class.ActivityMessagesFilter, core.space.Model, {
    label: notification.string.Comments,
    filter: notification.filter.ChatMessagesFilter
  })

  buildActions(builder)
}

function buildActions (builder: Builder): void {
  createAction(
    builder,
    {
      action: notification.actionImpl.DeleteChatMessage,
      label: view.string.Delete,
      icon: view.icon.Delete,
      input: 'focus',
      keyBinding: ['Backspace'],
      category: notification.category.Notification,
      target: notification.class.ChatMessage,
      context: { mode: ['context', 'browser'], group: 'edit' }
    },
    notification.action.DeleteChatMessage
  )

  createAction(
    builder,
    {
      action: notification.actionImpl.MarkAsReadInboxNotification,
      label: notification.string.MarkAsRead,
      icon: notification.icon.Notifications,
      input: 'focus',
      visibilityTester: notification.function.HasInboxNotifications,
      category: notification.category.Notification,
      target: notification.class.ActivityMessage,
      context: { mode: 'context', application: notification.app.Notification, group: 'edit' }
    },
    notification.action.MarkAsReadInboxNotification
  )

  createAction(
    builder,
    {
      action: notification.actionImpl.MarkAsUnreadInboxNotification,
      label: notification.string.MarkAsUnread,
      icon: notification.icon.Track,
      input: 'focus',
      visibilityTester: notification.function.HasntInboxNotifications,
      category: notification.category.Notification,
      target: notification.class.ActivityMessage,
      context: { mode: 'context', application: notification.app.Notification, group: 'edit' }
    },
    notification.action.MarkAsUnreadInboxNotification
  )

  createAction(
    builder,
    {
      action: notification.actionImpl.DeleteInboxNotification,
      label: notification.string.Archive,
      icon: view.icon.Archive,
      input: 'focus',
      keyBinding: ['Backspace'],
      category: notification.category.Notification,
      target: notification.class.ActivityMessage,
      context: { mode: ['context', 'browser'], group: 'edit' }
    },
    notification.action.DeleteInboxNotification
  )
}
