//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export interface DragRect {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * dragleave also fires when the pointer moves between child elements of a group,
 * so a group is only really left when the pointer is outside of its bounds.
 */
export function isPointInside (rect: DragRect, x: number, y: number): boolean {
  return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom
}

/**
 * A dragged item entering a group is previewed at its top when the pointer is in
 * the upper half of the group, otherwise at its bottom.
 */
export function isUpperHalf (rect: DragRect, y: number): boolean {
  return y - rect.top < (rect.bottom - rect.top) / 2
}
