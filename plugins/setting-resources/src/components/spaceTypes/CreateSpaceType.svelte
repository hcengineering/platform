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
  import { createEventDispatcher } from 'svelte'
  import core, { Class, Ref, SpaceTypeDescriptor, generateId, SpaceType, Data } from '@hcengineering/core'
  import { Card, getClient, hasResource } from '@hcengineering/presentation'
  import { AnySvelteComponent, EditBox } from '@hcengineering/ui'
  import { Resource, getResource } from '@hcengineering/platform'
  import { ObjectBox } from '@hcengineering/view-resources'
  import setting, { SpaceTypeCreator, createSpaceType } from '@hcengineering/setting'

  import settingRes from '../../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = ''
  let descriptor: SpaceTypeDescriptor | undefined = undefined
  let handleTypeCreated: (() => Promise<void>) | undefined

  async function createType (): Promise<void> {
    if (descriptor === undefined) {
      return
    }

    if (handleTypeCreated !== undefined) {
      await handleTypeCreated()
    } else {
      const data: Omit<Data<SpaceType>, 'targetClass'> = {
        name,
        descriptor: descriptor._id,
        roles: 0
      }

      await createSpaceType(client, data, generateId())
    }

    dispatch('close')
  }

  const descriptors = client
    .getModel()
    .findAllSync(core.class.SpaceTypeDescriptor, { system: { $ne: true } })
    .filter((descriptor) => hasResource(descriptor._id as any as Resource<any>))

  descriptor = descriptors[0]

  $: typeCreator =
    descriptor !== undefined
      ? hierarchy.classHierarchyMixin<Class<SpaceTypeDescriptor>, SpaceTypeCreator>(
        descriptor._class,
        setting.mixin.SpaceTypeCreator
      )
      : undefined

  let extraComponent: AnySvelteComponent | undefined
  $: loadExtraComponent(typeCreator)

  async function loadExtraComponent (tc: SpaceTypeCreator | undefined): Promise<void> {
    if (tc === undefined) {
      extraComponent = undefined
      handleTypeCreated = undefined

      return
    }

    extraComponent = await getResource(tc.extraComponent)
  }

  function handleDescriptorSelected (evt: CustomEvent<Ref<SpaceTypeDescriptor>>): void {
    descriptor = descriptors.find((it) => it._id === evt.detail)
  }

  $: canSave = name.trim().length > 0 && descriptor !== undefined
</script>

<Card
  label={settingRes.string.NewSpaceType}
  {canSave}
  okAction={createType}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <ObjectBox
      _class={core.class.SpaceTypeDescriptor}
      value={descriptor?._id}
      docQuery={{ system: { $ne: true } }}
      on:change={handleDescriptorSelected}
      kind="regular"
      size="small"
      label={core.string.SpaceType}
      searchField="name"
      showNavigate={false}
      focusIndex={20000}
      id={'selectSpaceType'}
    />
  </svelte:fragment>
  <div class="flex-col flex-gap-2">
    <EditBox
      bind:value={name}
      placeholder={core.string.SpaceType}
      kind="large-style"
      focusIndex={1}
      autoFocus
      fullSize
    />

    {#if extraComponent !== undefined}
      <svelte:component this={extraComponent} {name} {descriptor} bind:handleTypeCreated />
    {/if}
  </div>
</Card>
