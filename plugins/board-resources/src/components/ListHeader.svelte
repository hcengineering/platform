<script lang="ts">
  import { Button, Component, getPlatformColor, IconEdit, showPopup } from '@anticrm/ui'
  import { State } from '@anticrm/task'
  import notification from '@anticrm/notification'
  import { ContextMenu } from '@anticrm/view-resources'
  export let state: State

  const showMenu = async (ev: MouseEvent): Promise<void> => {
    ev.preventDefault()
    showPopup(
      ContextMenu,
      { object: state },
      {
        getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: ev.clientX, y: ev.clientY })
      }
    )
  }
</script>

<div class="flex-col h-16">
  <div class="h-2 border-radius-1" style="background-color: {getPlatformColor(state.color)}" />
  <div class="flex-between h-full font-medium pr-2 pl-4">
    <span class="lines-limit-2">{state.title}</span>
    <div class="flex">
      <Component is={notification.component.LastViewEditor} props={{ value: state }} />
      <Button icon={IconEdit} kind="transparent" on:click={showMenu} />
    </div>
  </div>
</div>
