<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Label, MiniToggle } from '@hcengineering/ui'
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
  const lookup = buildConfigLookup(hierarchy, viewlet.attachTo, viewlet.config)

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
</script>

<div class="antiCard">
  <div class="antiCard-group grid">
    <span class="label"><Label label={view.string.Grouping} /></span>
    <div class="value">
      <DropdownLabelsIntl
        label={view.string.Grouping}
        items={groupBy}
        selected={viewOptions.groupBy}
        width="10rem"
        justify="left"
        on:selected={(e) => dispatch('update', { key: 'groupBy', value: e.detail })}
      />
    </div>
    <span class="label"><Label label={view.string.Ordering} /></span>
    <div class="value">
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
            dispatch('update', { key: 'orderBy', value })
          }
        }}
      />
    </div>
    {#each config.other as model}
      <span class="label"><Label label={model.label} /></span>
      <div class="value">
        {#if isToggleType(model)}
          <MiniToggle
            on={viewOptions[model.key]}
            on:change={() => dispatch('update', { key: model.key, value: !viewOptions[model.key] })}
          />
        {:else if isDropdownType(model)}
          {@const items = model.values.filter(({ hidden }) => !hidden?.(viewOptions))}
          <DropdownLabelsIntl
            label={model.label}
            {items}
            selected={viewOptions[model.key]}
            width="10rem"
            justify="left"
            on:selected={(e) => dispatch('update', { key: model.key, value: e.detail })}
          />
        {/if}
      </div>
    {/each}
    <slot name="extra" />
  </div>
</div>
