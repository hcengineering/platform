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

// TypeScript mock for svelte/transition

export type EasingFunction = (t: number) => number

export interface TransitionConfig {
  delay?: number
  duration?: number | ((from: number, to: number) => number)
  easing?: EasingFunction
  css?: (t: number, u: number) => string
  tick?: (t: number, u: number) => void
}

export interface FadeParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
}

export interface FlyParams extends FadeParams {
  x?: number
  y?: number
  opacity?: number
}

export interface SlideParams extends FadeParams {
  axis?: 'x' | 'y'
}

export interface ScaleParams extends FadeParams {
  start?: number
  opacity?: number
}

export interface DrawParams extends FadeParams {
  speed?: number
}

export const fade = (params: FadeParams = {}): TransitionConfig => ({
  delay: params.delay ?? 0,
  duration: params.duration ?? 400,
  easing: params.easing ?? ((t: number) => t),
  css: (t: number, u: number) => `opacity: ${t}`
})

export const fly = (params: FlyParams = {}): TransitionConfig => ({
  delay: params.delay ?? 0,
  duration: params.duration ?? 400,
  easing: params.easing ?? ((t: number) => t),
  css: (t: number, u: number) =>
    `transform: translate(${u * (params.x ?? 20)}px, ${u * (params.y ?? 0)}px); opacity: ${t * (params.opacity ?? 1)}`
})

export const slide = (params: SlideParams = {}): TransitionConfig => ({
  delay: params.delay ?? 0,
  duration: params.duration ?? 400,
  easing: params.easing ?? ((t: number) => t),
  css: (t: number, u: number) => {
    const property = params.axis === 'x' ? 'width' : 'height'
    return `${property}: ${t * 100}%`
  }
})

export const scale = (params: ScaleParams = {}): TransitionConfig => ({
  delay: params.delay ?? 0,
  duration: params.duration ?? 400,
  easing: params.easing ?? ((t: number) => t),
  css: (t: number, u: number) => `transform: scale(${t * (params.start ?? 1)}); opacity: ${t * (params.opacity ?? 1)}`
})

export const draw = (params: DrawParams = {}): TransitionConfig => ({
  delay: params.delay ?? 0,
  duration: params.duration ?? 800,
  easing: params.easing ?? ((t: number) => t),
  css: (t: number) => `stroke-dasharray: ${t * (params.speed ?? 100)}`
})

export const crossfade = (): {
  fallback: typeof fade
  send: typeof fade
  receive: typeof fade
} => {
  return {
    fallback: fade,
    send: fade,
    receive: fade
  }
}
