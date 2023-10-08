//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Class, Doc, Mixin, Obj, Ref, Space } from '@hcengineering/core'
import type { Asset, IntlString, Metadata, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { Preference } from '@hcengineering/preference'
import { AnyComponent, Location, ResolvedLocation } from '@hcengineering/ui'
import { ViewAction } from '@hcengineering/view'

/**
 * @public
 */
export interface Application extends Doc {
  label: IntlString
  alias: string
  icon: Asset
  hidden: boolean
  position?: 'top' | 'mid'

  // Also attached ApplicationNavModel will be joined after this one main.
  navigatorModel?: NavigatorModel
  aside?: AnyComponent

  locationResolver?: Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>

  // Component will be displayed in case navigator model is not defined, or nothing is selected in navigator model
  component?: AnyComponent

  navHeaderComponent?: AnyComponent
  checkIsHeaderHidden?: Resource<() => Promise<boolean>>
  checkIsHeaderDisabled?: Resource<() => Promise<boolean>>
  navFooterComponent?: AnyComponent
}

/**
 * @public
 */
export interface ApplicationNavModel extends Doc {
  extends: Ref<Application>

  spaces?: SpacesNavModel[]
  specials?: SpecialNavModel[]
  aside?: AnyComponent
}

/**
 * @public
 */
export interface HiddenApplication extends Preference {
  attachedTo: Ref<Application>
}

/**
 * @public
 */
export interface SpacesNavModel {
  id: string // Id could be used for extending of navigation model
  label?: IntlString
  spaceClass: Ref<Class<Space>>
  addSpaceLabel?: IntlString
  createComponent?: AnyComponent
  icon?: Asset

  // Child special items.
  specials?: SpecialNavModel[]

  visibleIf?: Resource<(space: Space) => Promise<boolean>>
}

/**
 * @public
 */
export interface NavigatorModel {
  spaces: SpacesNavModel[]
  specials?: SpecialNavModel[]
  aside?: AnyComponent
}

/**
 * @public
 */
export interface SpecialNavModel {
  id: string // Uniq id
  label: IntlString
  icon?: Asset
  component: AnyComponent
  componentProps?: Record<string, any>
  // If not top and bottom, position will be sorted alphabetically.
  position?: 'top' | 'bottom' | string // undefined == 'top
  visibleIf?: Resource<(spaces: Space[]) => Promise<boolean>>
  // If defined, will be used to find spaces for visibleIf
  spaceClass?: Ref<Class<Space>>
  checkIsDisabled?: Resource<() => Promise<boolean>>
  nestingLevel?: number
}

/**
 * @public
 */
export interface ViewConfiguration {
  class: Ref<Class<Doc>> // show object of this class
  createItemDialog?: AnyComponent
  createItemLabel?: IntlString

  // If defined component will be used to render content for selected space.
  component?: AnyComponent
  componentProps?: Record<string, any>
}

/**
 * @public
 */
export interface SpaceView extends Class<Obj> {
  view: ViewConfiguration
}

/**
 * @public
 */
export const workbenchId = 'workbench' as Plugin

export default plugin(workbenchId, {
  class: {
    Application: '' as Ref<Class<Application>>,
    ApplicationNavModel: '' as Ref<Class<ApplicationNavModel>>,
    HiddenApplication: '' as Ref<Class<HiddenApplication>>
  },
  mixin: {
    SpaceView: '' as Ref<Mixin<SpaceView>>
  },
  component: {
    WorkbenchApp: '' as AnyComponent,
    InviteLink: '' as AnyComponent
  },
  icon: {
    Search: '' as Asset
  },
  event: {
    NotifyConnection: '' as Metadata<string>,
    NotifyTitle: '' as Metadata<string>
  },
  metadata: {
    PlatformTitle: '' as Metadata<string>,
    ExcludedApplications: '' as Metadata<Ref<Application>[]>,
    DefaultApplication: '' as Metadata<string>,
    DefaultSpace: '' as Metadata<Ref<Space>>,
    DefaultSpecial: '' as Metadata<string>,
    // Default for navigation expanded state
    NavigationExpandedDefault: '' as Metadata<boolean>
  },
  actionImpl: {
    Navigate: '' as ViewAction<{
      mode: 'app' | 'special' | 'space'
      application?: string
      special?: string
      space?: Ref<Space>
      // If no space is selected, select first space from list
      spaceClass?: Ref<Class<Space>>
      spaceSpecial?: string
    }>
  }
})
