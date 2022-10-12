<script lang="ts">
  import { DropdownLabelsIntl, MiniToggle, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { isDropdownType, isToggleType, ViewOptions, ViewOptionModel } from '../viewOptions'

  export let config: ViewOptionModel[]
  export let viewOptions: ViewOptions

  const dispatch = createEventDispatcher()
</script>

<div class="antiCard">
  <div class="antiCard-group grid">
    {#each config as model}
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
