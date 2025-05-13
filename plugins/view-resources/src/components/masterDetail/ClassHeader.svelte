<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import card, { MasterTag } from '@hcengineering/card'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { IconWithEmoji, getClient } from '@hcengineering/presentation'
  import { Icon, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let _class: Ref<Class<Doc>>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: clazz = hierarchy.getClass(_class) as MasterTag
  $: label = clazz.label
</script>

{#if clazz !== undefined}
  <div class="header flex flex-gap-2">
    <Icon
      icon={clazz.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz.icon ?? card.icon.MasterTag}
      iconProps={clazz.icon === view.ids.IconWithEmoji ? { icon: clazz.color } : {}}
      size="medium"
    />
    <span class="heading-medium-16 overflow-label">
      <Label {label} />
    </span>
  </div>
{/if}

<style lang="scss">
  .header {
    width: fit-content;
    align-items: center;
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }
</style>
