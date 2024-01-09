<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { Class, Doc, Obj, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ClassAttributesList } from '@hcengineering/setting-resources'
  import { Button, Icon, IconAdd } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  export let ofClass: Ref<Class<Obj>>
  export let _class: Ref<Class<Obj>>

  const client = getClient()

  let classes: Class<Doc>[] = []

  $: classes = client
    .getHierarchy()
    .getAncestors(_class)
    .map((it) => client.getHierarchy().getClass(it))
    .filter((it) => {
      return (
        !it.hidden &&
        it.label !== undefined &&
        it._id !== core.class.Doc &&
        it._id !== core.class.AttachedDoc &&
        it._id !== _class
      )
    })
  $: clazz = client.getHierarchy().getClass(_class)

  let mainAttributes: ClassAttributesList
</script>

<div class="flex flex-between mb-4">
  <div class="antiButton regular accent medium sh-round p-2 flex-row-center">
    {#if clazz?.icon}
      <div class="mr-2 flex">
        <Icon icon={clazz.icon} size={'medium'} />
      </div>
    {/if}
    {#if clazz}
      <ObjectPresenter _class={clazz._class} objectId={clazz._id} value={clazz} />
    {/if}
  </div>
  <Button icon={IconAdd} size={'small'} kind={'primary'} on:click={(ev) => mainAttributes?.createAttribute(ev)} />
</div>
<div class="ml-2 mr-2">
  <table class="antiTable mx-2">
    <tbody>
      <ClassAttributesList
        bind:this={mainAttributes}
        {_class}
        {ofClass}
        useOfClassAttributes={false}
        showTitle={false}
        showCreate={false}
      />
      {#each classes as clazz2}
        <ClassAttributesList
          _class={clazz2._id}
          {ofClass}
          useOfClassAttributes={false}
          showTitle={false}
          showCreate={false}
        />
      {/each}
    </tbody>
  </table>
</div>
