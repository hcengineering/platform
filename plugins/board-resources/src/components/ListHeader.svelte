<script lang="ts">
  import { State } from '@hcengineering/task'
  import { Button, getEventPositionElement, getPlatformColor, IconMoreV, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  export let state: State

  const showMenu = async (ev: MouseEvent): Promise<void> => {
    ev.preventDefault()
    showPopup(ContextMenu, { object: state }, getEventPositionElement(ev))
  }
</script>

<div class="flex-col h-16">
  <div class="h-2 border-radius-1" style="background-color: {getPlatformColor(state.color)}" />
  <div class="flex-between h-full font-medium pr-2 pl-4">
    <span class="lines-limit-2">{state.title}</span>
    <div class="flex">
      <Button icon={IconMoreV} kind="transparent" on:click={showMenu} />
    </div>
  </div>
</div>
