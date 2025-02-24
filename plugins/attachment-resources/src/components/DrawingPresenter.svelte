<script lang="ts">
  import { type Drawing } from '@hcengineering/attachment'
  import { DateRangeMode } from '@hcengineering/core'
  import { DatePresenter, IconScribble } from '@hcengineering/ui'
  import { PersonIdPresenter } from '@hcengineering/view-resources'

  export let value: Drawing
</script>

<div class="flex-presenter flex-gap-3">
  <DatePresenter value={value.createdOn} mode={DateRangeMode.DATETIME} kind="list" icon={IconScribble} />
  <PersonIdPresenter value={value.createdBy} shouldShowName={false} />
</div>
