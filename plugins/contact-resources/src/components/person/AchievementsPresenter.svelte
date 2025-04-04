
<script lang="ts">
  import contact, { Employee } from '@hcengineering/contact'
  import { getMetadata } from '@hcengineering/platform'
  import { Ref } from '@hcengineering/core'
  import { Image } from '@hcengineering/ui'

  export let personId: Ref<Employee>

  const possibleAchievements = [
    contact.image.Achievement1,
    contact.image.Achievement2,
    contact.image.Achievement3
  ]

  // TODO: Remove, it is just for achievements demonstration
  function hashStringToInt (str: string): number {
    let hash = 0
    if (str.length === 0) return hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0 // Convert to a 32-bit integer
    }
    return hash
  }

  $: personHash = hashStringToInt(personId)
  $: personAchievements = possibleAchievements.filter((_, index) => {
    return personHash % (index + 1) === 0
  })

</script>

<div class="achievements">
  {#each personAchievements as achievement}
    <Image src={getMetadata(achievement)} width="40px" height="80px" />
  {/each}
</div>

<style lang="scss">

 .achievements {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    padding: 0px 8px 8px;

    height: 48px;

    /* Inside auto layout */
    flex: none;
    order: 1;
    align-self: stretch;
    flex-grow: 0;
  }
</style>
