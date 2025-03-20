<script lang="ts">
  import { ColorDefinition, IconSize, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  export let size: IconSize = 'small'

  export let fill: number = -1

  const dispatch = createEventDispatcher()

  const dispatchAccentColor = (color?: ColorDefinition) => dispatch('accent-color', color)

  $: color = getPlatformColorDef(fill, $themeStore.dark)
  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })
</script>

<svg
  class="svg-{size}"
  fill={color?.icon ?? 'currentColor'}
  style:flex-shrink={0}
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M6.97975 1.07389C3.92356 1.52014 1.50831 3.94118 1.0708 7.0002H2.08287C2.50337 4.49345 4.47822 2.51374 6.9825 2.08599L6.97975 1.07389ZM8.98249 2.08014L8.97974 1.06812C12.055 1.49885 14.4896 3.92773 14.9291 7.0002H13.917C13.4945 4.48183 11.5033 2.4954 8.98249 2.08014ZM9.01467 13.9146C11.5201 13.4879 13.4962 11.5077 13.917 9.00019H14.929C14.4913 12.06 12.0748 14.4815 9.01742 14.9267L9.01467 13.9146ZM2.0829 9.0002C2.50529 11.5176 4.49522 13.5034 7.01468 13.9196L7.01743 14.9317C3.94351 14.4999 1.51022 12.0717 1.07083 9.0002H2.0829Z"
  />
</svg>
