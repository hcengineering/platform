<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { unlimitedAttempts } from './TrainingRequestMaxAttemptsPresenter.svelte'
  import NullableNumberEditor from './NullablePositiveNumberEditor.svelte'

  export let value: number | null
  export let onChange: (value: number | null) => void
  export let readonly = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = '100%'

  const placeholder = getEmbeddedLabel(unlimitedAttempts)
</script>

<NullableNumberEditor {kind} {value} {onChange} {readonly} {size} {justify} {width} {placeholder} />
