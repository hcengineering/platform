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

// TypeScript mock for svelte/animate

export type EasingFunction = (t: number) => number

export interface AnimationConfig {
  delay?: number
  duration?: number | ((len: number) => number)
  easing?: EasingFunction
  css?: (t: number, u: number) => string
  tick?: (t: number, u: number) => void
}

export interface FlipParams {
  delay?: number
  duration?: number | ((len: number) => number)
  easing?: EasingFunction
}

export const flip = (params: FlipParams = {}): AnimationConfig => ({
  delay: params.delay ?? 0,
  duration: params.duration ?? ((d: number) => Math.sqrt(d) * 120),
  easing: params.easing ?? ((t: number) => t),
  css: (t: number, u: number) => `transform: translate(${u * t}px, ${u * t}px)`
})
