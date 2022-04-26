<script lang="ts">
    import core, { Ref, Space } from '@anticrm/core'
    import { Button, showPopup } from '@anticrm/ui'
    import { createQuery, getClient } from '@anticrm/presentation'
    import { Header, classIcon } from '@anticrm/chunter-resources'
    import Menu from './popups/Menu.svelte'
    import { getPopupAlignment } from '../utils/PopupUtils'
    import border from '../plugin'

    export let spaceId: Ref<Space> | undefined

    let space: Space
    const query = createQuery()
    $: query.query(core.class.Space, { _id: spaceId }, result => { space = result[0] })

    const client = getClient()

    function showMenu (e: MouseEvent) {
      showPopup(
        Menu,
        { space: space._id },
        getPopupAlignment(e, { h: 'left', v: 'top' })
      )
    }
</script>

<div class="ac-header divide full">
    {#if space}
        <Header icon={classIcon(client, space._class)} label={space.name} description={space.description}/>
        <Button label={border.string.Menu} on:click={showMenu}/>
    {/if}
</div>
