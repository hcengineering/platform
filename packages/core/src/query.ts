import { Doc } from './classes'
import { createPredicates, isPredicate } from './predicate'
import { SortingQuery } from './storage'

export const likeSymbol = '%'

export function checkLikeQuery (value: string, query: string): boolean {
  const searchString = query.split(likeSymbol).join('.*')
  const regex = RegExp(`^${searchString}$`)
  return regex.test(value)
}

export function findProperty (objects: Doc[], propertyKey: string, value: any): Doc[] {
  if (isPredicate(value)) {
    const preds = createPredicates(value, propertyKey)
    for (const pred of preds) {
      objects = pred(objects)
    }
    return objects
  }
  const result: Doc[] = []
  for (const object of objects) {
    if ((object as any)[propertyKey] === value) {
      result.push(object)
    }
  }
  return result
}

export function resultSort<T extends Doc> (result: T[], sortOptions: SortingQuery<T>): void {
  const sortFunc = (a: any, b: any): number => {
    for (const key in sortOptions) {
      const result = typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key] - b[key]
      if (result !== 0) return result * (sortOptions[key] as number)
    }
    return 0
  }
  result.sort(sortFunc)
}
