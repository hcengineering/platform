//
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
//
import type { Builder } from '@hcengineering/model'
import view from '@hcengineering/model-view'
import core from '@hcengineering/model-core'
import notification from '@hcengineering/notification'

export function defineViewlets (builder: Builder): void {
  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: notification.string.GroupedList,
      icon: view.icon.Card,
      component: notification.component.InboxGroupedListView
    },
    notification.viewlet.GroupedList
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: notification.string.FlatList,
      icon: view.icon.List,
      component: notification.component.InboxFlatListView
    },
    notification.viewlet.FlatList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: notification.class.DocNotifyContext,
      descriptor: notification.viewlet.FlatList,
      config: []
    },
    notification.viewlet.InboxFlatList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: notification.class.DocNotifyContext,
      descriptor: notification.viewlet.GroupedList,
      config: []
    },
    notification.viewlet.InboxGroupedList
  )
}
