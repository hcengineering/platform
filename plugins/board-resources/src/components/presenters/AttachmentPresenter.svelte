<script lang="ts">
    import {Attachment} from '@anticrm/attachment'
    import { AttachmentPresenter } from '@anticrm/attachment-resources'
  
    export let value: Attachment
    // TODO: implement
  </script>
  
  <div>
    <AttachmentPresenter {value} />
  </div>
  