<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { RelationSetting } from '@hcengineering/setting-resources'
  import contact from '@hcengineering/contact'
  import card from '../../plugin'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const _classes = [...hierarchy.getDescendants(card.class.Card), contact.class.Contact].filter(
    (c) => c !== card.class.Card
  )
</script>

<RelationSetting {_classes} exclude={[]} />
