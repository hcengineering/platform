<script lang="ts">
    import core, { Class, Doc, Ref } from '@anticrm/core'
    import { getClient } from '@anticrm/presentation'
    import { getCurrentLocation, Icon, Label, navigate } from '@anticrm/ui'
    import automation from '../plugin'
    import ClassHierarchy from './ClassHierarchy.svelte'
  
    const loc = getCurrentLocation()
    const client = getClient()
    const hierarchy = client.getHierarchy()
  
    let _class: Ref<Class<Doc>> | undefined = loc.query?._class as Ref<Class<Doc>> | undefined
  
    $: if (_class !== undefined) {
      const loc = getCurrentLocation()
      loc.query = undefined
      navigate(loc)
    }
  
    const classObjects = hierarchy
      .getDescendants(core.class.Doc)
      .map((p) => hierarchy.getClass(p))
      console.log('classes ' + classObjects)
    const classes = classObjects
      .filter((p) => hierarchy.hasMixin(p, automation.mixin.AutomationSupport))
      .map((p) => p._id)
    console.log('classes ' + classes)
  </script>

<div class="antiComponent">
    <div class="ac-header short divide">
      <div class="ac-header__icon"><Icon icon={automation.icon.Automation} size="medium" /></div>
      <div class="ac-header__title"><Label label={automation.string.Automation} /></div>
    </div>
    <div class="ac-body columns hScroll">
      <div class="ac-column">
        <div class="overflow-y-auto">
          <ClassHierarchy
            {classes}
            {_class}
            on:select={(e) => {
              _class = e.detail
            }}
          />
        </div>
      </div>
      <div class="ac-column max">
        {#if _class !== undefined}
          <!-- ClassAttributes {_class} / -->
        {/if}
      </div>
    </div>
  </div>
