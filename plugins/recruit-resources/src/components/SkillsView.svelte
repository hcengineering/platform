<script lang="ts">
  import tags, { selectedTagElements, TagElement } from '@anticrm/tags'
  import { Component, getCurrentLocation, navigate } from '@anticrm/ui'
  import recruit from '../plugin'

  function onTag (tag: TagElement): void {
    selectedTagElements.set([tag._id])
    const loc = getCurrentLocation()
    loc.path[3] = 'candidates'
    loc.path.length = 4
    navigate(loc)
  }
</script>

<Component
  is={tags.component.TagsView}
  props={{
    targetClass: recruit.mixin.Candidate,
    title: recruit.string.SkillsLabel,
    icon: recruit.icon.Skills,
    item: recruit.string.SkillLabel,
    key: 'skills',
    сreateItemLabel: recruit.string.SkillCreateLabel,
    onTag: onTag
  }}
/>
