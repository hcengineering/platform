<script lang="ts">
  import { IntlString } from '@anticrm/platform'
  import { Label } from '@anticrm/ui'

  export let items: Record<any, IntlString>
  export let selected: any | undefined = undefined

  $: dropdownItems = Object.entries(items)
</script>

<select class="dropdownNativeRoot" bind:value={selected}>
  {#each dropdownItems as [key, value]}
    <option value={key}>
      <Label label={value} />
    </option>
  {/each}
</select>

<style lang="scss">
    .dropdownNativeRoot {
        justify-content: flex-start;
        border: none;
        min-width: 7rem;
        height: 1.5rem;
        padding: 0 1.1rem 0 0.5rem;
        background-color: var(--popup-divider);
        color: var(--caption-color);
        border-radius: 0.25rem;
        margin: 0;

        &:hover {
            border-color: var(--button-border-hover);
        }

        &:focus {
            outline: none;
        }
    }
</style>
