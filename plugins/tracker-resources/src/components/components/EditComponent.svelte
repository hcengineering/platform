<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { Component } from '@hcengineering/tracker'
  import { Button, EditBox, Icon, showPopup } from '@hcengineering/ui'
  import { DocAttributeBar } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { activeComponent } from '../../issues'
  import tracker from '../../plugin'
  import IssuesView from '../issues/IssuesView.svelte'
  import ComponentPopup from './ComponentPopup.svelte'

  export let component: Component

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function change (field: string, value: any) {
    await client.update(component, { [field]: value })
  }
  function selectComponent (evt: MouseEvent): void {
    showPopup(ComponentPopup, { _class: tracker.class.Component }, evt.target as HTMLElement, (value) => {
      if (value != null) {
        component = value
        dispatch('component', component._id)
      }
    })
  }

  $: $activeComponent = component?._id

  onDestroy(() => {
    $activeComponent = undefined
  })
</script>

<IssuesView
  query={{ component: component._id, space: component.space }}
  space={component.space}
  label={component.label}
>
  <svelte:fragment slot="label_selector">
    <Button size={'small'} kind={'link'} on:click={selectComponent}>
      <svelte:fragment slot="content">
        <div class="ac-header__icon"><Icon icon={tracker.icon.Issues} size={'small'} /></div>
        <span class="ac-header__title">{component.label}</span>
      </svelte:fragment>
    </Button>
  </svelte:fragment>
  <svelte:fragment slot="aside">
    <div class="flex-row p-4 w-60 left-divider">
      <div class="fs-title text-xl">
        <EditBox bind:value={component.label} on:change={() => change('label', component.label)} />
      </div>
      <div class="mt-2">
        <StyledTextBox
          alwaysEdit={true}
          showButtons={false}
          placeholder={tracker.string.Description}
          content={component.description ?? ''}
          on:value={(evt) => change('description', evt.detail)}
        />
      </div>
      <DocAttributeBar object={component} mixins={[]} ignoreKeys={['icon', 'label', 'description']} />
    </div>
  </svelte:fragment>
</IssuesView>
