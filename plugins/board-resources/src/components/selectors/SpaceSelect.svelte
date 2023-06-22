<script lang="ts">
  import { Board, Card } from '@hcengineering/board'
  import { Ref } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hcengineering/ui'
  import board from '../../plugin'

  export let object: Card
  export let label: IntlString
  export let selected: Ref<Board>

  let spaces: DropdownTextItem[] = []
  const spacesQuery = createQuery()
  spacesQuery.query(board.class.Board, {}, async (result) => {
    spaces = result.map(({ _id, name }) => ({ id: _id, label: name }))
    const index = spaces.findIndex(({ id }) => id === object.space)
    spaces[index].label = await translate(board.string.Current, { label: spaces[index].label }, $themeStore.language)
  })
</script>

<DropdownLabels items={spaces} {label} bind:selected />
