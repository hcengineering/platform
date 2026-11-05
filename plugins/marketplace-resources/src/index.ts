// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Resources } from '@hcengineering/platform'
import DefinitionPackageExportPopup from './components/DefinitionPackageExportPopup.svelte'
import DefinitionPackageInstallPopup from './components/DefinitionPackageInstallPopup.svelte'
import InstalledPackages from './components/InstalledPackages.svelte'
import DefinitionPackageUpdatePopup from './components/DefinitionPackageUpdatePopup.svelte'
import Marketplace from './components/Marketplace.svelte'

export { DefinitionPackageExportPopup, DefinitionPackageInstallPopup, DefinitionPackageUpdatePopup }
export { default as ImportSlotsPopup } from './components/ImportSlotsPopup.svelte'
export { getDefinitionPackageExportItems, getDefinitionPackageOwner } from './export-utils'
export { getDefinitionPackageExportItemsStore } from './catalog'

export default async (): Promise<Resources> => ({
  component: {
    DefinitionPackageExportPopup,
    DefinitionPackageInstallPopup,
    DefinitionPackageUpdatePopup,
    InstalledPackages,
    Marketplace
  }
})
