<script lang="ts">
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { Component, IconAdd, IconDelete } from '@hcengineering/ui'
  import { DisplayTx } from '../activity'
  import { getDTxProps, TxDisplayViewlet } from '../utils'

  export let tx: DisplayTx
  export let viewlet: TxDisplayViewlet
  export let edit: boolean
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

<div class="flex-row-center flex-grow flex-wrap content">
  {#each filterTx([...tx.txes, tx], core.class.TxCreateDoc) as ctx, i}
    {#if i === 0}
      <div class="mr-2"><IconAdd size={'small'} /></div>
    {/if}
    <div class="mr-2">
      {#if typeof viewlet?.component === 'string'}
        <Component is={viewlet?.component} props={getProps(ctx, edit)} on:close={onCancelEdit} />
      {:else}
        <svelte:component this={viewlet?.component} {...getProps(ctx, edit)} on:close={onCancelEdit} />
      {/if}
    </div>
  {/each}
  {#each filterTx([...tx.txes, tx], core.class.TxRemoveDoc) as ctx, i}
    {#if i === 0}
      <div class="mr-2"><IconDelete size={'small'} /></div>
    {/if}
    <div class="mr-2">
      {#if typeof viewlet?.component === 'string'}
        <Component is={viewlet?.component} props={getProps(ctx, edit)} on:close={onCancelEdit} />
      {:else}
        <svelte:component this={viewlet?.component} {...getProps(ctx, edit)} on:close={onCancelEdit} />
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .content {
    padding: 0.5rem;
    min-width: 0;
    color: var(--accent-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
</style>
