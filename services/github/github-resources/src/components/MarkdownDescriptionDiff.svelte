<script lang="ts">
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, getClient } from '@hcengineering/presentation'
  import { DocSyncInfo } from '@hcengineering/github'

  export let issue: DocSyncInfo
  function allowEdit (): void {
    void getClient().update(issue, {
      isDescriptionLocked: false,
      needSync: ''
    })
  }
</script>

<Card
  okLabel={getEmbeddedLabel('Unlock')}
  label={getEmbeddedLabel('Description merge conflict')}
  on:close
  on:changeContent
  okAction={allowEdit}
  fullSize={true}
  canSave={true}
>
  <div class="flex flex-row flex-grow">
    <div class="flex-row" style={'width: 50%'} style:overflow={'auto'}>
      Github Markdown value:
      <div class="proseCodeBlock select-text flex-row" style={'text-wrap: wrap;'}>
        {#each (issue?.external.body ?? '').split('\n') as line, i}
          <div class="flex">
            <div class="line">
              {i + 1}
            </div>
            {line}
          </div>
        {/each}
      </div>
    </div>
    <div class="flex-row" style={'width: 50%'} style:overflow={'auto'}>
      Platform markdown value:
      <div class="proseCodeBlock select-text flex-col" style={'text-wrap: wrap;'}>
        {#each (issue?.markdown ?? '').split('\n') as line, i}
          <div class="flex">
            <div class="line">
              {i + 1}
            </div>
            {line}
          </div>
        {/each}
      </div>
    </div>
  </div>
</Card>

<style lang="scss">
  .line {
    border-right: 1px solid #ddd;
    padding: 0 0.5em;
    margin-right: 0.5em;
    color: #888;
  }
</style>
