<script lang="ts">
  import core, { Association, Doc, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Section, showPopup } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import DocTable from './DocTable.svelte'
  import ObjectBoxPopup from './ObjectBoxPopup.svelte'

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

  let viewlet: WithLookup<Viewlet> | undefined
  let preference: ViewletPreference | undefined = undefined

  const query = createQuery()

  $: query.query(
    view.class.Viewlet,
    {
      attachTo: _class
    },
    (res) => {
      viewlet = res[0]
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  const preferenceQuery = createQuery()

  $: if (viewlet != null) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  $: config = preference?.config ?? viewlet?.config
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
      {#if docs?.length > 0 && config != null}
        <div class="self-start flex-col flex-gap-2">
          <DocTable objects={docs} {_class} {config} />
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
