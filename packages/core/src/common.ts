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
