<script lang="ts">
    import { Button, getPlatformColor, IconEdit, showPopup } from '@anticrm/ui'
    import { State } from '@anticrm/task'
    import { getElementPopupAlignment } from '../utils/PopupUtils'
    import ListInlineActions from './editor/ListInlineActions.svelte'
    export let state: State

    let ref: HTMLElement

    function onArchive () {
      showPopup(
        ListInlineActions,
        { value: state },
        getElementPopupAlignment(ref, { h: 'right', v: 'bottom' })
      )
    }
</script>

<div class="flex-col h-16">
    <div class="h-2 border-radius-1" style="background-color: {getPlatformColor(state.color)}" />
    <div class="flex-between h-full font-medium pr-2 pl-4" bind:this={ref}>
        <span class="lines-limit-2">{state.title}</span>
        <Button icon={IconEdit} kind="transparent" on:click={onArchive} />
    </div>
</div>
