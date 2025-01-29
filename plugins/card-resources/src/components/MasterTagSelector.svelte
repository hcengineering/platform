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
  import { Card, MasterTag } from '@hcengineering/card'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Icon, Label } from '@hcengineering/ui'
  import card from '../plugin'

  export let value: Card

  const selected = value._class

  const clQuery = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let masterTags: MasterTag[] = []

  $: items = masterTags.map((x) => ({
    id: x._id,
    label: x.label
  }))

  clQuery.query(card.class.MasterTag, { _class: card.class.MasterTag }, (res) => {
    masterTags = res
  })

  async function select (event: CustomEvent): Promise<void> {
    const update = { _class: event.detail } as any
    await client.update(value, update)
  }

  $: label = hierarchy.getClass(selected).label
</script>

<div class="flex flex-gap-2 items-center item caption-color">
  <Icon icon={card.icon.MasterTag} size="large" />
  <Label label={card.string.MasterTag} />
  <div class="tag">
    {#if value._class === card.class.Card}
      <DropdownLabelsIntl
        {items}
        {selected}
        disabled={value._class !== card.class.Card}
        label={card.string.MasterTag}
        on:selected={select}
      />
    {:else}
      <Label {label} />
    {/if}
  </div>
</div>

<style lang="scss">
  .tag {
    padding: 0.25rem 0.5rem 0.25rem 0.5rem;
    height: 1.5rem;
    border: 1px solid var(--theme-content-color);

    border-radius: 6rem;

    color: var(--theme-caption-color);

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }
</style>
