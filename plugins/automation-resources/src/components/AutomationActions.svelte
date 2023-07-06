<script lang="ts">
  import { Command } from '@hcengineering/automation'
  import core, { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconDelete, Label } from '@hcengineering/ui'
  import { ActionTab } from '../models'
  import automation from '../plugin'

  import ContentActionCreate from './actions/ContentActionCreate.svelte'
  import CommandPresenter from './presenters/CommandPresenter.svelte'

  export let targetClass: Ref<Class<Doc>> | undefined = undefined
  export let commands: Command<Doc>[] = []
  let attributes: Map<string, AnyAttribute> = new Map()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const attributeSupportMap = new Map()

  const contentAttributes: string[] = []
  const dateAttributes: string[] = []
  const collectionAttributes: string[] = []
  const arrayAttributes: string[] = []
  const refAttributes: string[] = []
  let currentTab: ActionTab | undefined = undefined

  function addCommand (e: CustomEvent<Command<Doc>>) {
    commands.push(e.detail)
    commands = commands
  }

  function removeCommand (command: Command<Doc>) {
    commands = commands.filter((c) => c !== command)
  }

  if (targetClass) {
    const classObj = hierarchy.getClass(targetClass)
    const automationSupport = hierarchy.as(classObj, automation.mixin.AutomationSupport)
    automationSupport?.attributes?.forEach((attr) => {
      attributeSupportMap.set(attr.name, attr)
      attributes = hierarchy.getAllAttributes(targetClass!)
      const classifier = attributes.get(attr.name)
      if (classifier) {
        const typeClass = classifier.type._class
        if (
          typeClass === core.class.TypeBoolean ||
          typeClass === core.class.TypeNumber ||
          typeClass === core.class.TypeString ||
          typeClass === core.class.TypeMarkup
        ) {
          contentAttributes.push(attr.name)
        } else if (typeClass === core.class.TypeTimestamp || typeClass === core.class.TypeDate) {
          dateAttributes.push(attr.name)
        } else if (typeClass === core.class.Collection) {
          collectionAttributes.push(attr.name) // TODO
        } else if (typeClass === core.class.ArrOf) {
          arrayAttributes.push(attr.name) // TODO
        } else if (typeClass === core.class.RefTo) {
          refAttributes.push(attr.name) // TODO
        }
      }
    })
  }
</script>

<div class="flex-col">
  <div class="fs-title mb-4">
    <Label label={automation.string.Actions} />
  </div>
  {#each commands as command}
    <div class="flex-between mb-2">
      <CommandPresenter value={command} />
      <Button
        icon={IconDelete}
        kind="ghost"
        on:click={() => {
          removeCommand(command)
        }}
      />
    </div>
  {/each}
  <div class="flex flex-gap-2">
    {#if contentAttributes.length > 0}
      <Button
        label={automation.string.Content}
        kind="no-border"
        on:click={() => {
          currentTab = ActionTab.Content
        }}
      />
    {/if}
    {#if dateAttributes.length > 0}
      <Button
        label={automation.string.Dates}
        kind="no-border"
        on:click={() => {
          currentTab = ActionTab.Dates
        }}
      />
    {/if}
    <!--
    <Button
      label={automation.string.Chat}
      kind="no-border"
      on:click={() => {
        currentTab = ActionTab.Chat
      }}
    />
    <Button
      label={automation.string.Tracker}
      kind="no-border"
      on:click={() => {
        currentTab = ActionTab.Tracker
      }}
    />
    -->
  </div>
  <div class="mt-4">
    {#if currentTab === ActionTab.Content && targetClass}
      {#each contentAttributes as attr}
        <ContentActionCreate
          attribute={attributes.get(attr)}
          automationSupport={attributeSupportMap.get(attr)}
          {targetClass}
          on:add={addCommand}
        />
      {/each}
      <!-- {:else if currentTab === ActionTab.Dates}{:else if currentTab === ActionTab.Chat}{:else if currentTab === ActionTab.Tracker} -->
    {/if}
  </div>
</div>
