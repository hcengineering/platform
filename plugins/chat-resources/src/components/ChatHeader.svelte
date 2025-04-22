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
  import cardPlugin, { Card } from '@hcengineering/card'
  import { Header, Icon } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Asset } from '@hcengineering/platform'

  export let card: Card | undefined = undefined
  export let canClose: boolean = false
  export let title: string | undefined = undefined
  export let icon: Asset | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: clazz = card != null ? hierarchy.getClass(card._class) : undefined
</script>

<Header
  allowFullsize={false}
  type={canClose ? 'type-aside' : 'type-component'}
  adaptive="disabled"
  hideBefore={false}
  closeOnEscape={false}
  on:close
>
  <div class="hulyHeader-titleGroup">
    <div class="content-color mr-2 pl-2">
      <Icon icon={clazz?.icon ?? icon ?? cardPlugin.icon.Card} size={'small'} />
    </div>
    <span class="secondary-textColor overflow-label heading-medium-16 line-height-auto mr-2"
      >{card?.title ?? title}</span
    >
  </div>
</Header>

<style lang="scss">
  .chat-header {
    display: flex;
    width: 100%;
    height: 4rem;
    min-height: 4rem;
    max-height: 4rem;
    border-bottom: 1px solid var(--next-panel-color-border);
  }
</style>
