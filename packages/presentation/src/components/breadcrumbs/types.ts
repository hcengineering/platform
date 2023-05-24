// Copyright © 2023 Hardcore Engineering Inc.
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

import { AnyComponent, AnySvelteComponent } from '@hcengineering/ui'

interface BreadcrumbsProps {
  readonly color?: number | undefined
}

type TextBreadcrumbsProps = { title: string } & (
  | { readonly href: string, readonly onClick?: undefined }
  | { readonly href?: undefined, readonly onClick: (event: MouseEvent) => void }
)

export interface ComponentBreadcrumbsProps {
  readonly component: AnyComponent | AnySvelteComponent
  readonly props: Record<string, any>
}

export type BreadcrumbsModel = BreadcrumbsProps & (TextBreadcrumbsProps | ComponentBreadcrumbsProps)
