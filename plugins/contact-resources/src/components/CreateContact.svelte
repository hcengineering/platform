<script lang='ts'>
  import { Asset } from '@anticrm/platform'

  import { getClient } from '@anticrm/presentation'
  import { Menu, Action, showPopup, closePopup } from '@anticrm/ui'
  import view from '@anticrm/view'
  import contact from '../plugin'

  export let targetElement: HTMLElement

  const client = getClient()

  const actions: Action[] = []
  const hierarchy = client.getHierarchy()

  client.getHierarchy().getDescendants(contact.class.Contact).forEach((v) => {
    const cl = hierarchy.getClass(v)
    if (hierarchy.hasMixin(cl, view.mixin.ObjectFactory)) {
      const f = hierarchy.as(cl, view.mixin.ObjectFactory)
      actions.push({
        icon: cl.icon as Asset,
        label: cl.label,
        action: async () => {
          closePopup()
          showPopup(f.component, {}, targetElement)
        }
      })
    }
  })
</script>

<Menu actions={actions}/>