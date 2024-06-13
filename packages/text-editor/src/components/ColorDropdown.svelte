<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let textEditor
  export let colors: string[] = ['#000000', '#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB']

  const dispatch = createEventDispatcher()

  function setColor (color: string) {
    if (textEditor?.commands) {
      textEditor.chain().focus().setColor(color).run()
      dispatch('close')
    }
  }
</script>

<div class="color-dropdown">
  {#each colors as color}
    <button
      class="color-button"
      style="background-color: {color}"
      on:click={() => { setColor(color) }}>
    </button>
  {/each}
</div>

<style>
    .color-dropdown {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18px, 1fr));
        gap: 6px;
        border-radius: 4px;
        padding: 12px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        position: absolute;
        z-index: 1000;
        color: var(--theme-halfcontent-color);
    }
    .color-button {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.2s;
    }
    .color-button:hover {
        transform: scale(1.1);
    }
</style>
