//
// Copyright @ 2024 Hardcore Engineering Inc.
//

export function moveItem<T> (items: [T, ...T[]], from: number, to: number): [T, ...T[]] {
  const isUp = from > to
  return (
    isUp
      ? [...items.slice(0, to), items[from], ...items.slice(to, from), ...items.slice(from + 1)]
      : [...items.slice(0, from), ...items.slice(from + 1, to), items[from], ...items.slice(to)]
  ) as [T, ...T[]]
}
