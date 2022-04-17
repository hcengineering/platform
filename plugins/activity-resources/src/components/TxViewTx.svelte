<script lang="ts">
  import core, { Class, Doc, Ref } from '@anticrm/core'
  import { Component, IconAdd, IconDelete } from '@anticrm/ui'
  import { DisplayTx } from '../activity'
  import { getDTxProps, TxDisplayViewlet } from './utils'

  export let tx: DisplayTx
  export let viewlet: TxDisplayViewlet
  export let edit: boolean
  export let onCancelEdit: () => void

  function filterTx (dtx: DisplayTx[], _class: Ref<Class<Doc>>): DisplayTx[] {
    return dtx.filter((it) => it.tx._class === _class)
  }
  function getProps (props: any, edit: boolean): any {
    return { ...props, edit }
  }
</script>

<div class="flex-row-center flex-grow flex-wrap content">
  {#each filterTx([tx, ...tx.txes], core.class.TxCreateDoc) as ctx, i}
    {#if i === 0}
      <div class="mr-2"><IconAdd size={'small'} /></div>
    {/if}
    <div class="mr-2">
      {#if typeof viewlet?.component === 'string'}
        <Component is={viewlet?.component} props={getProps(getDTxProps(ctx), edit)} on:close={onCancelEdit} />
      {:else}
        <svelte:component this={viewlet?.component} {...getProps(getDTxProps(ctx), edit)} on:close={onCancelEdit} />
      {/if}
    </div>
  {/each}
  {#each filterTx([tx, ...tx.txes], core.class.TxRemoveDoc) as ctx, i}
    {#if i === 0}
      <div class="mr-2"><IconDelete size={'small'} /></div>
    {/if}
    <div class="mr-2">
      {#if typeof viewlet?.component === 'string'}
        <Component is={viewlet?.component} props={getProps(getDTxProps(ctx), edit)} on:close={onCancelEdit} />
      {:else}
        <svelte:component this={viewlet?.component} {...getProps(getDTxProps(ctx), edit)} on:close={onCancelEdit} />
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .content {
    padding: 1rem;
    color: var(--accent-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
  }
</style>
