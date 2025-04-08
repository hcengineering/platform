<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { activeViewlet, makeViewletKey, setActiveViewletId } from '../utils'
  import { resolvedLocationStore, Switcher } from '@hcengineering/ui'
  import view, { Viewlet, ViewletDescriptor, ViewletPreference } from '@hcengineering/view'
  import core, { DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { deepEqual } from 'fast-equals'
  import { createQuery } from '@hcengineering/presentation'

  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewlets: Array<WithLookup<Viewlet>> = []
  export let viewletQuery: DocumentQuery<Viewlet>
  export let preference: ViewletPreference | undefined = undefined
  export let loading = true
  export let hidden = false
  export let ignoreFragment = false
  export let defaultViewletDescriptor: Ref<ViewletDescriptor> | undefined = undefined

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

  let key = makeViewletKey(undefined, ignoreFragment)

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc, ignoreFragment)
    })
  )

  $: getActiveViewlet(viewlets, $activeViewlet, key)

  const dispatch = createEventDispatcher()

  function getActiveViewlet (
    viewlets: Array<WithLookup<Viewlet>>,
    activeViewlet: Record<string, Ref<Viewlet> | null>,
    key: string
  ): void {
    if (viewlets == null || viewlets.length === 0) return
    const newViewlet =
      viewlets.find((viewlet) => viewlet?._id === activeViewlet[key]) ??
      viewlets.find((viewlet) => viewlet.descriptor === defaultViewletDescriptor) ??
      viewlets[0]
    if (viewlet?._id !== newViewlet?._id || !deepEqual(viewlet.config, newViewlet.config)) {
      viewlet = newViewlet
      setActiveViewletId(newViewlet._id)
      dispatch('viewlet', viewlet)
    }
  }

  $: viewslist = viewlets?.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label,
      label: views.title
    }
  })

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
  <Switcher
    name={'viewletSelector'}
    items={viewslist}
    selected={viewlet?._id}
    kind={'subtle'}
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
