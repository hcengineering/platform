<script lang="ts">
  import { Class, Obj } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hcengineering/ui'

  import automation from '../../plugin'

  export let classes: Class<Obj>[] = []

  async function getClassItems () {
    const classItems: DropdownTextItem[] = []
    for (const cl of classes) {
      const label = await translate(cl.label, {}, $themeStore.language)
      classItems.push({ id: cl._id, label })
    }
    return classItems
  }
</script>

{#await getClassItems() then classItems}
  <DropdownLabels label={automation.string.SelectClass} items={classItems} on:selected />
{/await}
