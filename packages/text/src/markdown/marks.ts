import { deepEqual } from 'fast-equals'
import { MarkupMark, MarkupMarkType, MarkupNode } from '@hcengineering/text-core'

export function traverseMarks (node: MarkupNode, f: (el: MarkupMark) => void): void {
  node.marks?.forEach(f)
}

export function markAttrs (mark: MarkupMark): Record<string, string> {
  return mark.attrs ?? []
}

export function isInSet (mark: MarkupMark, marks: MarkupMark[]): boolean {
  return marks.find((m) => markEq(mark, m)) !== undefined
}

export function addToSet (mark: MarkupMark, marks: MarkupMark[]): MarkupMark[] {
  const m = marks.find((m) => markEq(mark, m))
  if (m !== undefined) {
    // We already have mark
    return marks
  }
  return [...marks, mark]
}

export function removeFromSet (markType: MarkupMarkType, marks: MarkupMark[]): MarkupMark[] {
  return marks.filter((m) => m.type !== markType)
}

export function sameSet (a?: MarkupMark[], b?: MarkupMark[]): boolean {
  return deepEqual(a, b)
}

export function markEq (first: MarkupMark, other: MarkupMark): boolean {
  return deepEqual(first, other)
}
