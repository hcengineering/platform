<script lang="ts">
  import { Asset } from '@anticrm/platform'
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import { getClient } from '@anticrm/presentation'
  import { Menu, Action, showPopup, closePopup } from '@anticrm/ui'
  import view from '@anticrm/view'
  import contact from '../plugin'

  const dispatch = createEventDispatcher()
  const client = getClient()

  const actions: Action[] = []
  const hierarchy = client.getHierarchy()

  client
    .getHierarchy()
    .getDescendants(contact.class.Contact)
    .forEach((v) => {
      const cl = hierarchy.getClass(v)
      if (hierarchy.hasMixin(cl, view.mixin.ObjectFactory)) {
        const f = hierarchy.as(cl, view.mixin.ObjectFactory)
        actions.push({
          icon: cl.icon as Asset,
          label: cl.label,
          action: async () => {
            closePopup()
            showPopup(f.component, {}, 'top')
          }
        })
      }
    })

  afterUpdate(() => {
    dispatch('changeContent', true)
  })
</script>

<Menu {actions} on:changeContent={() => dispatch('changeContent', true)} />
