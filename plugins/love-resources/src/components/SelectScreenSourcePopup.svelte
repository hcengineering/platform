<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Card } from '@hcengineering/presentation'
  import { Button } from '@hcengineering/ui'
  import { ScreenSource } from '@hcengineering/love'

  import love from '../plugin'

  export let sources: ScreenSource[]

  const dispatch = createEventDispatcher()
  let selectedSourceId: string | undefined
</script>

<Card
  label={love.string.ChooseShare}
  width="large"
  okAction={() => {
    dispatch('update', selectedSourceId)
  }}
  okLabel={love.string.Select}
  canSave={selectedSourceId !== undefined}
  on:close={() => dispatch('close')}
>
  <div class="root">
    {#each sources as source}
      <!-- svelte-ignore a11y-missing-attribute -->
      <Button
        kind="ghost"
        justify="left"
        height="auto"
        selected={source.id === selectedSourceId}
        on:click={() => {
          selectedSourceId = source.id
        }}
      >
        <svelte:fragment slot="content">
          <div class="item">
            <div class="title">
              {#if source.appIconURL != null}
                <img class="icon" src={source.appIconURL} />
              {/if}
              <div class="name">
                {source.name}
              </div>
            </div>
            <img src={source.thumbnailURL} />
          </div>
        </svelte:fragment>
      </Button>
    {/each}
  </div>
</Card>

<style lang="scss">
  .root {
    padding: 0 2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    height: 100%;
  }

  .item {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    width: 262px;
  }

  .title {
    margin-bottom: 0.5rem;
    display: flex;
    gap: 1rem;
    overflow: hidden;
  }

  .name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .icon {
    width: 1rem;
    height: 1rem;
  }
</style>
