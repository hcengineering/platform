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
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { Component, Icon, IconSize } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { classIcon } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { Doc } from '@hcengineering/core'

  export let context: DocNotifyContext
  export let size: IconSize = 'medium'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let object: Doc | undefined = undefined

  $: iconMixin = hierarchy.classHierarchyMixin(context.attachedToClass, view.mixin.ObjectIcon)
  $: iconMixin &&
    query.query(context.attachedToClass, { _id: context.attachedTo }, (res) => {
      object = res[0]
    })
</script>

{#if iconMixin && object}
  <Component is={iconMixin.component} props={{ value: object, size }} />
{:else}
  <div class="icon">
    <Icon icon={classIcon(client, context.attachedToClass) ?? notification.icon.Notifications} {size} />
  </div>
{/if}

<style lang="scss">
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 6px;
    width: 40px;
    height: 40px;
    background-color: var(--theme-button-hovered);
  }
</style>
