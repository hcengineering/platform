<script lang="ts">
  import { getCurrentAccount } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { deviceOptionsStore, resizeObserver } from '@hcengineering/ui'
  import { FilteredView } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import view from '../../plugin'

  export let attachedTo: string | undefined

  const me = getCurrentAccount()._id
  const q = createQuery()
  let views: FilteredView[] = []

  const baseQuery = {
    attachedTo,
    sharable: true,
    createdBy: { $ne: me }
  }

  $: query =
    search === ''
      ? baseQuery
      : {
          ...baseQuery,
          name: { $like: `%${search}%` }
        }

  $: q.query(view.class.FilteredView, query, (res) => {
    views = res.filter((p) => !p.users.includes(me))
  })

  const client = getClient()

  const dispatch = createEventDispatcher()

  async function add (sv: FilteredView): Promise<void> {
    await client.update(sv, { $push: { users: me } })
    dispatch('close')
  }

  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <input bind:this={searchInput} type="text" bind:value={search} placeholder={phTraslate} />
  </div>
  <div class="scroll">
    <div class="box">
      {#each views as value}
        <button
          class="menu-item no-focus"
          on:click={() => {
            add(value)
          }}
        >
          <div class="flex-row-center w-full">
            {value.name}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
