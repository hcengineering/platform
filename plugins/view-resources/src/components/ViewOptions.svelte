<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { DropdownIntlItem, DropdownLabelsIntl, Label, Toggle } from '@hcengineering/ui'
  import { Viewlet, ViewOptions, ViewOptionsModel, ViewOptionModel } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { buildConfigLookup, getKeyLabel } from '../utils'
  import { isDropdownType, isToggleType, noCategory } from '../viewOptions'

  export let viewlet: Viewlet
  export let config: ViewOptionsModel
  export let viewOptions: ViewOptions

  const dispatch = createEventDispatcher()

  const groups =
    viewOptions.groupBy[viewOptions.groupBy.length - 1] === noCategory ||
    viewOptions.groupBy.length === config.groupDepth
      ? [...viewOptions.groupBy]
      : [...viewOptions.groupBy, noCategory]

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const lookup = buildConfigLookup(hierarchy, viewlet.attachTo, viewlet.config, viewlet.options?.lookup)

  const groupBy = config.groupBy
    .map((p) => {
      return {
        id: p,
        label: getKeyLabel(client, viewlet.attachTo, p, lookup)
      }
    })
    .concat({ id: noCategory, label: view.string.NoGrouping })

  const orderBy = config.orderBy.map((p) => {
    const key = p[0]
    return {
      id: key,
      label: key === 'rank' ? view.string.Manual : getKeyLabel(client, viewlet.attachTo, key, lookup)
    }
  })

  function selectGrouping (value: string, i: number) {
    groups[i] = value
    if (value === noCategory) {
      groups.length = i + 1
    } else if (config.groupDepth === undefined || config.groupDepth > viewOptions.groupBy.length) {
      groups.length = i + 1
      groups[i + 1] = noCategory
    }
    viewOptions.groupBy = groups.length > 1 ? groups.filter((p) => p !== noCategory) : [...groups]
    dispatch('update', {
      key: 'groupBy',
      value: viewOptions.groupBy
    })
  }

  function getItems (groupBy: DropdownIntlItem[], i: number, current: string[]): DropdownIntlItem[] {
    const notAllowed = current.slice(0, i)
    return groupBy.filter((p) => !notAllowed.includes(p.id as string))
  }

  const changeToggle = (model: ViewOptionModel) => {
    viewOptions[model.key] = !viewOptions[model.key]
    dispatch('update', { key: model.key, value: viewOptions[model.key] })
  }

  $: visibleOthers = config.other.filter((p) => !p.hidden?.(viewOptions))
</script>

<div class="antiCard dialog menu">
  <div class="antiCard-menu__spacer" />
  {#each groups as group, i}
    <div class="antiCard-menu__item grouping">
      <span class="overflow-label"><Label label={i === 0 ? view.string.Grouping : view.string.Then} /></span>
      <DropdownLabelsIntl
        label={view.string.Grouping}
        kind={'regular'}
        size={'medium'}
        items={getItems(groupBy, i, viewOptions.groupBy)}
        selected={group}
        width="10rem"
        justify="left"
        on:selected={(e) => selectGrouping(e.detail, i)}
      />
    </div>
  {/each}
  <div class="antiCard-menu__item ordering">
    <span class="overflow-label"><Label label={view.string.Ordering} /></span>
    <DropdownLabelsIntl
      label={view.string.Ordering}
      kind={'regular'}
      size={'medium'}
      items={orderBy}
      selected={viewOptions.orderBy?.[0]}
      width="10rem"
      justify="left"
      on:selected={(e) => {
        const key = e.detail
        const value = config.orderBy.find((p) => p[0] === key)
        if (value !== undefined) {
          viewOptions.orderBy = value
          dispatch('update', { key: 'orderBy', value })
        }
      }}
    />
  </div>
  {#if visibleOthers.length > 0}
    <div class="antiCard-menu__divider" />
  {/if}
  {#each visibleOthers as model}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="antiCard-menu__item hoverable ordering"
      on:click={() => {
        if (isToggleType(model)) changeToggle(model)
      }}
    >
      <span class="overflow-label"><Label label={model.label} /></span>
      {#if isToggleType(model)}
        <Toggle on={viewOptions[model.key] ?? model.defaultValue} on:change={() => changeToggle(model)} />
      {:else if isDropdownType(model)}
        {@const items = model.values.filter(({ hidden }) => !hidden?.(viewOptions))}
        <DropdownLabelsIntl
          label={model.label}
          kind={'regular'}
          size={'medium'}
          {items}
          selected={viewOptions[model.key] ?? model.defaultValue}
          width="10rem"
          justify="left"
          on:selected={(e) => {
            viewOptions[model.key] = e.detail
            dispatch('update', { key: model.key, value: e.detail })
          }}
        />
      {/if}
    </div>
  {/each}
  <slot name="extra" />
  <div class="antiCard-menu__spacer" />
</div>
