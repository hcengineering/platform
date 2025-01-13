<script lang="ts">
  import core, { Association, Doc } from '@hcengineering/core'
  import { Button, IconAdd, Label, Section, showPopup } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import ObjectPresenter from './ObjectPresenter.svelte'
  import ObjectBoxPopup from './ObjectBoxPopup.svelte'
  import { IntlString } from '@hcengineering/platform'
  import DocTable from './DocTable.svelte'

  export let object: Doc
  export let docs: Doc[]
  export let label: IntlString
  export let association: Association
  export let readonly: boolean = false
  export let direction: 'A' | 'B'

  $: _class = direction === 'B' ? association.classB : association.classA

  function add (): void {
    showPopup(
      ObjectBoxPopup,
      {
        _class,
        docQuery: { _id: { $nin: docs.map((p) => p._id) } }
      },
      'top',
      async (result) => {
        if (result != null) {
          const client = getClient()
          await client.createDoc(core.class.Relation, core.space.Workspace, {
            docA: direction === 'A' ? object._id : result._id,
            docB: direction === 'A' ? result._id : object._id,
            association: association._id
          })
        }
      }
    )
  }
</script>

<Section {label}>
  <svelte:fragment slot="header">
    <div class="buttons-group xsmall-gap">
      {#if !readonly}
        <Button id={core.string.AddRelation} icon={IconAdd} kind={'ghost'} on:click={add} />
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    <div class="antiSection-empty solid flex-col mt-3">
      {#if docs?.length > 0}
        <div class="self-start flex-col flex-gap-2">
          <DocTable objects={docs} {_class} />
          {#each docs as doc}
            <ObjectPresenter value={doc} />
          {/each}
        </div>
      {:else if !readonly}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="over-underline content-color" on:click={add}>
          <Label label={core.string.AddRelation} />
        </span>
      {/if}
    </div>
  </svelte:fragment>
</Section>
