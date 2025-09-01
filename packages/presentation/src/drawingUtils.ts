//
// Copyright © 2025 Hardcore Engineering Inc.
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

export type ColorMetaName =
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'delta'
  | 'epsilon'
  | 'zeta'
  | 'eta'
  | 'theta'
  | 'iota'
  | 'kappa'
// | 'lambda'
// | 'mu'
// | 'nu'
// | 'xi'
// | 'omicron'
// | 'pi'
// | 'rho'
// | 'sigma'
// | 'tau'
// | 'upsilon'
// | 'phi'
// | 'chi'
// | 'psi'
// | 'omega'

/*
We need to be backward compatible with user data, that already contains arbitrarily colors.
First version of the drawing board allowed selection of any RGB color.
*/
export type ColorMetaNameOrHex = (string & { readonly __brand: 'ColorMetaNameOrHex' }) | ColorMetaName

export interface Point {
  x: number
  y: number
}

declare const NodePointBrand: unique symbol
export interface NodePoint {
  readonly [NodePointBrand]: never
  x: number
  y: number
}
export function makeNodePoint (x: number, y: number): NodePoint {
  return { x, y } as any
}

declare const MouseScaledPointBrand: unique symbol
export interface MouseScaledPoint {
  readonly [MouseScaledPointBrand]: never
  x: number
  y: number
}
export function makeMouseScaledPoint (x: number, y: number): MouseScaledPoint {
  return { x, y } as any
}

declare const CanvasPointBrand: unique symbol
export interface CanvasPoint {
  readonly [CanvasPointBrand]: never
  x: number
  y: number
}
export function makeCanvasPoint (x: number, y: number): CanvasPoint {
  return { x, y } as any
}

export function scalePoint (victim: Point, scale: Point): Point {
  return { x: victim.x * scale.x, y: victim.y * scale.y }
}

export function offsetPoint (victim: Point, offset: Point): Point {
  return { x: victim.x + offset.x, y: victim.y + offset.y }
}

export function offsetCanvasPoint (
  victim: CanvasPoint,
  offsetX: number,
  offsetY: number,
  offsetScale: number
): CanvasPoint {
  return makeCanvasPoint(Math.round(victim.x + offsetX * offsetScale), Math.round(victim.y + offsetY * offsetScale))
}

export function middlePoint (first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

export function easeInOutCubic (x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function offsetInParent (parent: HTMLElement, child: HTMLElement): Point {
  function evaluateOffset (parentSize: number, childSize: number): number {
    return (parentSize - childSize) * 0.5
  }

  const childWidth = child.getBoundingClientRect().width
  const parentWidth = parent.getBoundingClientRect().width
  const offsetX = evaluateOffset(parentWidth, childWidth)

  const childHeight = child.getBoundingClientRect().height
  const parentHeight = parent.getBoundingClientRect().height
  const offsetY = evaluateOffset(parentHeight, childHeight)

  return { x: offsetX, y: offsetY }
}

export function rescaleToFitAspectRatio (
  referenceWidth: number,
  referenceHeight: number,
  actualWidth: number,
  actualHeight: number
): Point {
  let scaleX = 1
  let scaleY = 1

  const desiredAspectRatio = referenceWidth / referenceHeight
  const actualAspectRatio = actualWidth / actualHeight

  if (desiredAspectRatio !== actualAspectRatio) {
    const candidateScaleX = desiredAspectRatio / actualAspectRatio
    const candidateScaleY = actualAspectRatio / desiredAspectRatio
    if (desiredAspectRatio > 1) {
      if (actualAspectRatio > 1) {
        if (candidateScaleX > candidateScaleY) {
          scaleY = candidateScaleY
        } else {
          scaleX = candidateScaleX
        }
      } else {
        scaleY = candidateScaleY
      }
    } else {
      if (actualAspectRatio < 1) {
        if (candidateScaleX > candidateScaleY) {
          scaleY = candidateScaleY
        } else {
          scaleX = candidateScaleX
        }
      } else {
        scaleX = candidateScaleX
      }
    }
  }

  return { x: scaleX, y: scaleY }
}
