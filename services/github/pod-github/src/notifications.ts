import { Doc, Ref, TxOperations, AccountUuid } from '@hcengineering/core'
import notification, { DocNotifyContext } from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'
import { PersonSpace } from '@hcengineering/contact'
import github from '@hcengineering/github'

export async function createNotification (
  client: TxOperations,
  forDoc: Doc,
  data: { user: AccountUuid, space: Ref<PersonSpace>, message: IntlString, props: Record<string, any> }
): Promise<void> {
  let docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { objectId: forDoc._id })

  if (docNotifyContext?._id === undefined) {
    const docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, data.space, {
      objectId: forDoc._id,
      objectClass: forDoc._class,
      objectSpace: forDoc.space,
      user: data.user,
      isPinned: false,
      hidden: false
    })
    docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { _id: docNotifyContextId })
  }

  // Check if we had already same notification send, and just unmark it viewed.
  const existing = await client.findOne(notification.class.CommonInboxNotification, {
    user: data.user,
    message: data.message,
    ...Object.fromEntries(Object.entries(data.props).map(([k, v]) => [`props.${k}`, v]))
  })
  if (existing !== undefined) {
    await client.update(existing, {
      isViewed: false
    })
  } else {
    await client.createDoc(notification.class.CommonInboxNotification, data.space, {
      user: data.user,
      objectId: forDoc._id,
      objectClass: forDoc._class,
      icon: github.icon.Github,
      message: data.message,
      props: data.props,
      isViewed: false,
      archived: false,
      docNotifyContext: docNotifyContext?._id as Ref<DocNotifyContext>
    })
  }
}
