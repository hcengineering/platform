<script lang="ts">
  import NodeViewContent from '../../node-view/NodeViewContent.svelte'
  import NodeViewWrapper from '../../node-view/NodeViewWrapper.svelte'
</script>

<NodeViewWrapper data-drag-handle="">
  <NodeViewContent as="ul" class="todo-list" data-type="todoList" />
</NodeViewWrapper>
