<script lang="ts">
  import { Asset, getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, closePopup, Menu, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import contact from '../plugin'

  const actions: Action[] = []
  const hierarchy = client.getHierarchy()

  void getClient()
    .getHierarchy()
    .getDescendants(contact.class.Contact)
    .map(async (v) => {
      const cl = hierarchy.getClass(v)
      if (hierarchy.hasMixin(cl, view.mixin.ObjectFactory)) {
        const { component, create } = hierarchy.as(cl, view.mixin.ObjectFactory)
        let action: (() => Promise<void>) | undefined

        if (component) {
          action = async () => {
            closePopup()
            showPopup(component, { shouldSaveDraft: true }, 'top')
          }
        } else if (create) {
          action = await getResource(create)
        }

        if (action) {
          actions.push({
            icon: cl.icon as Asset,
            label: cl.label,
            action
          })
        }
      }
    })
</script>

<Menu {actions} on:changeContent />
