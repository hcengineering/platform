import {
  type CategoryType,
  type Class,
  type Doc,
  type DocumentQuery,
  type Hierarchy,
  type Ref,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { type Task } from '@hcengineering/task'
import {
  type CategoryOption,
  type ViewOptionModel,
  type ViewOptions,
  type ViewQueryOption,
  type Viewlet
} from '@hcengineering/view'
import { getCategories, getCategorySpaces, concatCategories } from '@hcengineering/view-resources'

/**
 * @public
 */
export async function updateTaskKanbanCategories (
  client: TxOperations,
  viewlet: Viewlet,
  _class: Ref<Class<Doc>>,
  space: Ref<Space> | undefined,
  docs: Doc[],
  groupByKey: string,
  viewOptions: ViewOptions,
  viewOptionsModel: ViewOptionModel[] | undefined,
  update: () => void,
  queryId: Ref<Doc>
): Promise<CategoryType[]> {
  let categories = await getCategories(client, _class, space, docs, groupByKey, viewlet.descriptor)
  for (const viewOption of viewOptionsModel ?? []) {
    if (viewOption.actionTarget !== 'category') continue
    const categoryFunc = viewOption as CategoryOption
    if ((viewOptions[viewOption.key] as boolean) ?? viewOption.defaultValue) {
      const categoryAction = await getResource(categoryFunc.action)

      const spaces = getCategorySpaces(categories)
      if (space !== undefined) {
        spaces.push(space)
      }
      const res = await categoryAction(
        _class,
        spaces.length > 0 ? { space: { $in: Array.from(spaces.values()) } } : {},
        space,
        groupByKey,
        update,
        queryId,
        viewlet.descriptor
      )
      if (res !== undefined) {
        categories = concatCategories(res, categories)
        break
      }
    }
  }
  return categories
}

/**
 * @public
 */
export async function getTaskKanbanResultQuery (
  hierarchy: Hierarchy,
  query: DocumentQuery<Task>,
  viewOptions: ViewOptionModel[] | undefined,
  viewOptionsStore: ViewOptions
): Promise<DocumentQuery<Task>> {
  if (viewOptions === undefined) return query
  let result = hierarchy.clone(query)
  for (const viewOption of viewOptions) {
    if (viewOption.actionTarget !== 'query') continue
    const queryOption = viewOption as ViewQueryOption
    const f = await getResource(queryOption.action)
    result = f(viewOptionsStore[queryOption.key] ?? queryOption.defaultValue, result)
  }
  return result
}
