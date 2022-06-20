<script lang="ts">
  import automation from '@anticrm/automation'
  import { TableBrowser } from '@anticrm/view-resources'
</script>

<TableBrowser
  _class={automation.class.Automation}
  config={[
    'name',
    'description',
    /** {
        key: '',
        presenter: tags.component.TagsPresenter,
        label: board.string.Labels,
        sortingKey: 'labels',
        props: {
          _class: board.class.Card,
          key: 'labels'
        }
      },**/
    'modifiedBy',
    'modifiedOn'
  ]}
  query={{}}
/>
