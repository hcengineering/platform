<!--
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { BrowserNotification } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { addNotification, getCurrentResolvedLocation, Location, NotificationSeverity } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { parseLinkId } from '@hcengineering/view-resources'
  import { Analytics } from '@hcengineering/analytics'
  import workbench, { Application } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'

  import { checkPermission, pushAllowed, subscribePush } from '../utils'
  import Notification from './Notification.svelte'

  async function check (allowed: boolean): Promise<void> {
    if (allowed) {
      query.unsubscribe()
      return
    }
    const res = await checkPermission(true)
    if (res) {
      query.unsubscribe()
      return
    }
    const isSubscribed = await subscribePush()
    if (isSubscribed) {
      query.unsubscribe()
      return
    }
    query.query(
      notification.class.BrowserNotification,
      {
        user: getCurrentAccount().uuid
      },
      (res) => {
        if (res.length > 0) {
          void notify(res[0])
        }
      }
    )
  }

  const client = getClient()
  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  async function getObjectIdFromLocation (loc: Location): Promise<string | undefined> {
    const appAlias = loc.path[2]
    const application = client.getModel().findAllSync<Application>(workbench.class.Application, { alias: appAlias })[0]

    if (application?.locationDataResolver != null) {
      const resolver = await getResource(application.locationDataResolver)
      const data = await resolver(loc)
      return data.objectId
    } else {
      if (loc.fragment == null) return
      const [, id, _class] = decodeURIComponent(loc.fragment).split('|')
      if (_class == null) return
      try {
        return await parseLinkId(linkProviders, id, _class as Ref<Class<Doc>>)
      } catch (err: any) {
        Analytics.handleError(err)
        console.error(err)
      }
    }
  }

  async function notify (value: BrowserNotification): Promise<void> {
    const _id: Ref<Doc> | undefined = value.objectId

    const getSidebarObject = await getResource(workbench.function.GetSidebarObject)
    const sidebarObjectId = getSidebarObject()?._id

    if (_id && _id === sidebarObjectId) {
      await client.remove(value)
      return
    }

    const locObjectId = await getObjectIdFromLocation(getCurrentResolvedLocation())

    if (_id && _id === locObjectId) {
      await client.remove(value)
      return
    }
    addNotification(
      value.title,
      value.body,
      Notification,
      { value },
      NotificationSeverity.Info,
      `notification-${value.objectId}`
    )
    await client.remove(value)
  }

  const query = createQuery()

  $: void check($pushAllowed)
</script>
