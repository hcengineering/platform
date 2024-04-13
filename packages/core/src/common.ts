/**
 * @function groupByArray
 * 
 * Groups the elements of an array into a Map based on a provided key.
 * 
 * @template T - Type of elements in the array.
 * @template K - Type of key.
 * @param {T[]} array - The array to group.
 * @param {(item: T) => K} keyProvider - A function that provides the key for each element.
 * @returns {Map<K, T[]>} The Map of grouped elements.
 */
export function groupByArray<T, K> (array: T[], keyProvider: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>()

  array.forEach((item) => {
    const key = keyProvider(item)

    if (!result.has(key)) {
      result.set(key, [item])
    } else {
      result.get(key)?.push(item)
    }
  })

  return result
}

/**
 * @function flipSet
 * 
 * Flips the presence of an item in a Set. If the item is in the Set, it is removed. 
 * If it is not in the Set, it is added.
 * 
 * @template T - Type of item.
 * @param {Set<T>} set - The Set to flip.
 * @param {T} item - The item to flip.
 * @returns {Set<T>} The flipped Set.
 */
export function flipSet<T> (set: Set<T>, item: T): Set<T> {
  if (set.has(item)) {
    set.delete(item)
  } else {
    set.add(item)
  }

  return set
}