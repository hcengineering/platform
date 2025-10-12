<script lang="ts">
  import { AccountArrayEditor, contactPlugin as contact } from '@hcengineering/contact-resources'
    import { getClient } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  export let value: Project
</script>

<AccountArrayEditor
  label={contact.string.Members}
  value={value.members}
  onChange={(evt) => {
    void getClient().diffUpdate(value, { members: evt })
  }}
/>
