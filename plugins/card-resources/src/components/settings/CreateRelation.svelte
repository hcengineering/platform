<script lang="ts">
  import contact from '@hcengineering/contact'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { CreateRelation } from '@hcengineering/setting-resources'
  import card from '../../plugin'

  export let aClass: Ref<Class<Doc>> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const _classes = [...hierarchy.getDescendants(card.class.Card), contact.class.Contact].filter(
    (c) => c !== card.class.Card
  )
</script>

<CreateRelation {aClass} {_classes} exclude={[]} on:close />
