<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { DropdownIntlItem, DropdownLabelsIntl, Label, MiniToggle } from '@hcengineering/ui'
  import { Viewlet, ViewOptions, ViewOptionsModel } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { buildConfigLookup, getKeyLabel } from '../utils'
  import { isDropdownType, isToggleType, noCategory } from '../viewOptions'

  export let viewlet: Viewlet
  export let config: ViewOptionsModel
  export let viewOptions: ViewOptions

  const dispatch = createEventDispatcher()

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
    viewOptions.groupBy[i] = value
    if (value === noCategory) {
      viewOptions.groupBy.length = i + 1
    } else if (config.groupDepth === undefined || config.groupDepth > viewOptions.groupBy.length) {
      viewOptions.groupBy.length = i + 1
      viewOptions.groupBy[i + 1] = noCategory
    }
    viewOptions.groupBy = viewOptions.groupBy
    dispatch('update', {
      key: 'groupBy',
      value: viewOptions.groupBy.length > 1 ? viewOptions.groupBy.filter((p) => p !== noCategory) : viewOptions.groupBy
    })
  }

  function getItems (groupBy: DropdownIntlItem[], i: number, current: string[]): DropdownIntlItem[] {
    const notAllowed = current.slice(0, i)
    return groupBy.filter((p) => !notAllowed.includes(p.id as string))
  }
</script>

<div class="antiCard">
  <div class="antiCard-group grid">
    {#each viewOptions.groupBy as group, i}
      <span class="label"><Label label={i === 0 ? view.string.Grouping : view.string.Then} /></span>
      <div class="value grouping">
        <DropdownLabelsIntl
          label={view.string.Grouping}
          items={getItems(groupBy, i, viewOptions.groupBy)}
          selected={group}
          width="10rem"
          justify="left"
          on:selected={(e) => selectGrouping(e.detail, i)}
        />
      </div>
    {/each}
    <span class="label"><Label label={view.string.Ordering} /></span>
    <div class="value ordering">
      <DropdownLabelsIntl
        label={view.string.Ordering}
        items={orderBy}
        selected={viewOptions.orderBy[0]}
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
    {#each config.other.filter((p) => !p.hidden?.(viewOptions)) as model}
      <span class="label"><Label label={model.label} /></span>
      <div class="value">
        {#if isToggleType(model)}
          <MiniToggle
            on={viewOptions[model.key]}
            on:change={() => {
              viewOptions[model.key] = !viewOptions[model.key]
              dispatch('update', { key: model.key, value: viewOptions[model.key] })
            }}
          />
        {:else if isDropdownType(model)}
          {@const items = model.values.filter(({ hidden }) => !hidden?.(viewOptions))}
          <DropdownLabelsIntl
            label={model.label}
            {items}
            selected={viewOptions[model.key]}
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
  </div>
</div>
