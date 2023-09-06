<script lang="ts">
  import { StatusCategory } from '@hcengineering/core'
  import { ColorDefinition, IconSize, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'

  export let size: IconSize

  export let fill: number = -1
  export let category: StatusCategory
  export let statusIcon: {
    index: number | undefined
    count: number | undefined
  } = { index: 0, count: 0 }

  let element: SVGSVGElement

  const dispatch = createEventDispatcher()

  const dispatchAccentColor = (color?: ColorDefinition) => dispatch('accent-color', color)

  $: color = getPlatformColorDef(fill, $themeStore.dark)
  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })
</script>

<svg
  bind:this={element}
  class="svg-{size}"
  fill={color?.icon ?? 'currentColor'}
  id={category._id}
  style:transform={category._id === tracker.issueStatusCategory.Started ? 'rotate(-90deg)' : ''}
  style:flex-shrink={0}
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
>
  {#if category._id === tracker.issueStatusCategory.Backlog}
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M6.97975 1.07389C3.92356 1.52014 1.50831 3.94118 1.0708 7.0002H2.08287C2.50337 4.49345 4.47822 2.51374 6.9825 2.08599L6.97975 1.07389ZM8.98249 2.08014L8.97974 1.06812C12.055 1.49885 14.4896 3.92773 14.9291 7.0002H13.917C13.4945 4.48183 11.5033 2.4954 8.98249 2.08014ZM9.01467 13.9146C11.5201 13.4879 13.4962 11.5077 13.917 9.00019H14.929C14.4913 12.06 12.0748 14.4815 9.01742 14.9267L9.01467 13.9146ZM2.0829 9.0002C2.50529 11.5176 4.49522 13.5034 7.01468 13.9196L7.01743 14.9317C3.94351 14.4999 1.51022 12.0717 1.07083 9.0002H2.0829Z"
    />
  {:else if category._id === tracker.issueStatusCategory.Unstarted}
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z"
    />
  {:else if category._id === tracker.issueStatusCategory.Started}
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z"
    />
    {#if statusIcon.count && statusIcon.index}
      <path
        d="M 4.5 4.5 L 9 4.5 A 4.5 4.5 0 {statusIcon.index > (statusIcon.count - 1) / 2 ? 1 : 0} 1 {Math.cos(
          ((2 * Math.PI) / statusIcon.count) * statusIcon.index - 0.01
        ) *
          4.5 +
          4.5} {Math.sin(((2 * Math.PI) / statusIcon.count) * statusIcon.index - 0.01) * 4.5 + 4.5} Z"
        transform="translate(3.5,3.5)"
      />
    {:else}
      <path
        d="M 4.5 4.5 L 9 4.5 A 4.5 4.5 0 1 1 {Math.cos(Math.PI - 0.01) * 4.5 + 4.5} {Math.sin(Math.PI - 0.01) * 4.5 +
          4.5} Z"
        transform="translate(3.5,3.5)"
      />
    {/if}
  {:else if category._id === tracker.issueStatusCategory.Completed}
    <path
      d="M8,1C4.1,1,1,4.1,1,8c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C15,4.1,11.9,1,8,1z M8,14c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S11.3,14,8,14z"
    />
    <path
      d="M10.6,6.1L7.5,9.2L5.9,7.6c-0.2-0.2-0.6-0.2-0.8,0s-0.2,0.6,0,0.8l2,2c0.1,0.1,0.3,0.2,0.4,0.2s0.3-0.1,0.4-0.2l3.5-3.5c0.2-0.2,0.2-0.6,0-0.8S10.8,5.8,10.6,6.1z"
    />
  {:else if category._id === tracker.issueStatusCategory.Canceled}
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M8,1C4.1,1,1,4.1,1,8c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C15,4.1,11.9,1,8,1z M8,14c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S11.3,14,8,14z"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M10.5,5.5c-0.2-0.2-0.6-0.2-0.8,0L8,7.2L6.3,5.5c-0.2-0.2-0.6-0.2-0.8,0s-0.2,0.6,0,0.8L7.2,8L5.5,9.7c-0.2,0.2-0.2,0.6,0,0.8s0.6,0.2,0.8,0L8,8.8l1.7,1.7c0.2,0.2,0.6,0.2,0.8,0c0.2-0.2,0.2-0.6,0-0.8L8.8,8l1.7-1.7C10.8,6.1,10.8,5.7,10.5,5.5z"
    />
  {/if}
</svg>
