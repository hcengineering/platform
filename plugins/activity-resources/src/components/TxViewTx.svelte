<script lang="ts">
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { Component, IconAdd, IconDelete } from '@hcengineering/ui'
  import { getDTxProps, TxDisplayViewlet } from '../utils'
  import { DisplayTx } from '@hcengineering/activity'

  export let tx: DisplayTx
  export let viewlet: TxDisplayViewlet
  export let edit: boolean
  export let presentersOnly: boolean = false
  export let onCancelEdit: () => void

  function filterTx (dtx: DisplayTx[], _class: Ref<Class<Doc>>): DisplayTx[] {
    return dtx.filter((it) => it.tx._class === _class)
  }
  function getProps (ctx: DisplayTx, edit: boolean): any {
    if (viewlet?.pseudo) {
      return { value: ctx.doc }
    }
    const dprops = getDTxProps(ctx)
    return { ...dprops, edit }
  }
</script>

{#each filterTx([...tx.txes, tx], core.class.TxCreateDoc) as ctx, i}
  {#if i === 0 && !presentersOnly}
    <IconAdd size={'x-small'} fill={'var(--theme-trans-color)'} />
  {/if}
  {#if typeof viewlet?.component === 'string'}
    <Component is={viewlet?.component} props={getProps(ctx, edit)} disabled on:close={onCancelEdit} />
  {:else}
    <svelte:component this={viewlet?.component} {...getProps(ctx, edit)} disabled on:close={onCancelEdit} />
  {/if}
  <div class="antiHSpacer" />
{/each}
{#each filterTx([...tx.txes, tx], core.class.TxRemoveDoc) as ctx, i}
  {#if i === 0 && !presentersOnly}
    <IconDelete size={'x-small'} fill={'var(--theme-trans-color)'} />
  {/if}
  {#if typeof viewlet?.component === 'string'}
    <Component is={viewlet?.component} props={getProps(ctx, edit)} disabled on:close={onCancelEdit} />
  {:else}
    <svelte:component this={viewlet?.component} {...getProps(ctx, edit)} disabled on:close={onCancelEdit} />
  {/if}
  <div class="antiHSpacer" />
{/each}
