import notification from '@hcengineering/notification'
import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'

import activity from './plugin'

export function buildNotifications (builder: Builder): void {
  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: activity.string.Activity,
      icon: activity.icon.Activity
    },
    activity.ids.ActivityNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: activity.string.Reactions,
      group: activity.ids.ActivityNotificationGroup,
      txClasses: [core.class.TxCreateDoc],
      objectClass: activity.class.Reaction,
      defaultEnabled: false,
      templates: {
        textTemplate: '{sender} reacted to {doc}: {reaction}',
        htmlTemplate: '<p><b>{sender}</b> reacted to {doc}: {reaction}</p>',
        subjectTemplate: 'Reaction on {doc}'
      }
    },
    activity.ids.AddReactionNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [activity.ids.AddReactionNotification]
  })

  builder.mixin(activity.class.ActivityMessage, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'repliedPersons']
  })

  builder.mixin(activity.class.DocUpdateMessage, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'repliedPersons']
  })

  builder.mixin(activity.class.ActivityMessage, core.class.Class, notification.mixin.NotificationContextPresenter, {
    labelPresenter: activity.component.ActivityMessageNotificationLabel
  })
}
