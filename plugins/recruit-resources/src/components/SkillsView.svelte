<script lang="ts">
  import tags, { selectedTagElements, TagElement } from '@hcengineering/tags'
  import { Component, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import recruit from '../plugin'

  function onTag (tag: TagElement): void {
    selectedTagElements.set([tag._id])
    const loc = getCurrentResolvedLocation()
    loc.path[2] = 'recruit'
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
    onTag
  }}
/>
