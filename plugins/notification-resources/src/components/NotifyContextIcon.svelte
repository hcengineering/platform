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

  export let value: DocNotifyContext
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let object: Doc | undefined = undefined

  $: iconMixin = hierarchy.classHierarchyMixin(value.attachedToClass, view.mixin.ObjectIcon)
  $: iconMixin &&
    query.query(value.attachedToClass, { _id: value.attachedTo }, (res) => {
      object = res[0]
    })
</script>

<div class="container">
  {#if iconMixin && object}
    <Component is={iconMixin.component} props={{ value: object, size: 'medium' }} />
  {:else}
    <Icon icon={classIcon(client, value.attachedToClass) ?? notification.icon.Notifications} size="medium" />
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    background-color: var(--theme-button-hovered);
    width: 2.5rem;
    height: 2.5rem;
  }
</style>
