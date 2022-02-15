<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Class, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { EditBox, Grid, Icon, IconClose, Label, ActionIcon, Scroller } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Space>
  export let _class: Ref<Class<Space>>

  let space: Space

  // export let label: IntlString
  // export let icon: Asset | AnySvelteComponent

  const dispatch = createEventDispatcher()

  const client = getClient()
  const clazz = client.getHierarchy().getClass(_class)

  const query = createQuery()
  $: query.query(core.class.Space, { _id }, result => { space = result[0] })

  const tabs: IntlString[] = ['General' as IntlString, 'Members' as IntlString]
  let selected = 0

  function onNameChange (ev: Event) {
    const value = (ev.target as HTMLInputElement).value
    if (value.trim().length > 0) {
      client.updateDoc(_class, space.space, space._id, { name: value })
    } else {
      // Just refresh value
      query.query(core.class.Space, { _id }, result => { space = result[0] })
    }
  }

</script>

<div class="antiOverlay" on:click={() => { dispatch('close') }}/>
<div class="antiDialogs antiComponent">
  <div class="ac-header short mirror divide">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon"><Icon icon={clazz.icon} size={'medium'} /></div>
      <div class="ac-header__title"><Label label={clazz.label} /></div>
    </div>
    <div class="tool"><ActionIcon icon={IconClose} size={'small'} action={() => { dispatch('close') }} /></div>
  </div>
  <div class="ac-tabs">
    {#each tabs as tab, i}
      <div class="ac-tabs__tab" class:selected={i === selected}
           on:click={() => { selected = i }}>
        <Label label={tab} />
      </div>
    {/each}
    <div class="ac-tabs__empty" />
  </div>
  <Scroller padding>
    {#if selected === 0}
      {#if space}
        <Grid column={1} rowGap={1.5}>
          <EditBox label={clazz.label} icon={clazz.icon} bind:value={space.name} placeholder={clazz.label} maxWidth="39rem" focus on:change={onNameChange}/>
          <!-- <AttributeBarEditor maxWidth="39rem" object={space} key="name"/> -->
          <!-- <ToggleWithLabel label={workbench.string.MakePrivate} description={workbench.string.MakePrivateDescription}/> -->
        </Grid>
      {/if}
    {:else}
      Members and other
    {/if}
  </Scroller>
</div>
