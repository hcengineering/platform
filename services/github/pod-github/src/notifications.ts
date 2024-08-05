import { Account, Doc, Ref, TxOperations } from '@hcengineering/core'
import notification, { DocNotifyContext } from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'
import github from '@hcengineering/github'

export async function createNotification (
  client: TxOperations,
  forDoc: Doc,
  data: { user: Ref<Account>, message: IntlString, props: Record<string, any> }
): Promise<void> {
  let docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { attachedTo: forDoc._id })

  if (docNotifyContext?._id === undefined) {
    const docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, forDoc.space, {
      attachedTo: forDoc._id,
      attachedToClass: forDoc._class,
      user: data.user,
      isPinned: false
    })
    docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { _id: docNotifyContextId })
  }

  // Check if we had already same notification send, and just unmark it viewed.

  const existing = await client.findOne(notification.class.CommonInboxNotification, {
    user: data.user,
    message: data.message,
    props: data.props
  })
  if (existing !== undefined) {
    await client.update(existing, {
      isViewed: false
    })
  } else {
    await client.createDoc(notification.class.CommonInboxNotification, forDoc.space, {
      user: data.user,
      icon: github.icon.Github,
      message: data.message,
      props: data.props,
      isViewed: false,
      archived: false,
      docNotifyContext: docNotifyContext?._id as Ref<DocNotifyContext>
    })
  }
}
