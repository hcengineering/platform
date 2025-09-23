<script lang="ts">
  import { Doc, Ref } from '@hcengineering/core'
  import { Asset, getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, closePopup, Menu, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import contact from '../plugin'

  const client = getClient()

  const actions: Action[] = []
  const hierarchy = client.getHierarchy()

  client
    .getHierarchy()
    .getDescendants(contact.class.Contact)
    .map(async (v) => {
      const cl = hierarchy.getClass(v)
      if (hierarchy.hasMixin(cl, view.mixin.ObjectFactory)) {
        const { component, create } = hierarchy.as(cl, view.mixin.ObjectFactory)

        if (component) {
          actions.push({
            icon: cl.icon as Asset,
            label: cl.label,
            action: async () => {
              closePopup()
              showPopup(component, { shouldSaveDraft: true }, 'top')
            }
          })
        } else if (create) {
          const action = await getResource(create)
          actions.push({
            icon: cl.icon as Asset,
            label: cl.label,
            action: async () => {
              await action()
            }
          })
        }
      }
    })
</script>

<Menu {actions} on:changeContent />
