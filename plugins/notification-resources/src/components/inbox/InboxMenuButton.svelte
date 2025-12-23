<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import view from '@hcengineering/view'
  import { ButtonMenu, IconMoreV } from '@hcengineering/ui'

  import notification from '../../plugin'
  import { clearAll, readAll, unreadAll } from '../../utils'

  async function onSelect (id?: 'clear' | 'read' | 'unread'): Promise<void> {
    if (id == null) return

    if (id === 'clear') {
      void clearAll()
    }

    if (id === 'read') {
      void readAll()
    }

    if (id === 'unread') {
      void unreadAll()
    }
  }
</script>

<ButtonMenu
  size="small"
  noSelection
  icon={IconMoreV}
  items={[
    {
      id: 'read',
      icon: view.icon.Eye,
      label: notification.string.MarkReadAll
    },
    {
      id: 'unread',
      icon: view.icon.EyeCrossed,
      label: notification.string.MarkUnreadAll
    },
    {
      id: 'clear',
      icon: view.icon.CheckCircle,
      label: notification.string.ClearAll
    }
  ]}
  on:selected={(ev) => onSelect(ev.detail)}
/>
