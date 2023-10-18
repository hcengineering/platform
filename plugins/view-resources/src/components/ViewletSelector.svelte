<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { activeViewlet, makeViewletKey, setActiveViewletId } from '../utils'
  import { TabList, resolvedLocationStore } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'

  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let viewletQuery: DocumentQuery<Viewlet>
  export let preference: ViewletPreference | undefined = undefined
  export let loading = true
  export let hidden = false

  const query = createQuery()

  $: query.query(
    view.class.Viewlet,
    viewletQuery,
    (res) => {
      viewlets = res
      dispatch('viewlets', viewlets)
    },
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  let key = makeViewletKey()

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: getActiveViewlet(viewlets, $activeViewlet, key)

  const dispatch = createEventDispatcher()

  function getActiveViewlet (
    viewlets: WithLookup<Viewlet>[],
    activeViewlet: Record<string, Ref<Viewlet> | null>,
    key: string
  ) {
    if (viewlets == null || viewlets.length === 0) return
    const newViewlet = viewlets.find((viewlet) => viewlet?._id === activeViewlet[key]) ?? viewlets[0]
    if (viewlet?._id !== newViewlet?._id) {
      viewlet = newViewlet
      setActiveViewletId(newViewlet._id)
      dispatch('viewlet', viewlet)
    }
  }

  $: viewslist = viewlets?.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })

  const preferenceQuery = createQuery()

  $: if (viewlet != null) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
        dispatch('loading', loading)
        dispatch('preference', preference)
      },
      { limit: 1 }
    )
  } else {
    preferenceQuery.unsubscribe()
  }
</script>

{#if viewlets?.length > 1 && !hidden}
  <TabList
    items={viewslist}
    multiselect={false}
    selected={viewlet?._id}
    on:select={(result) => {
      if (result.detail !== undefined) {
        if (viewlet?._id === result.detail.id) {
          return
        }
        viewlet = viewlets.find((vl) => vl._id === result.detail.id)
        if (viewlet) {
          setActiveViewletId(viewlet._id)
        }
      }
    }}
  />
{/if}
