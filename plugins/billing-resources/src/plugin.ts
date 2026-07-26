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

import billing, { billingId } from '@hcengineering/billing'
import { type IntlString, mergeIds } from '@hcengineering/platform'

export default mergeIds(billingId, billing, {
  string: {
    AllPlans: '' as IntlString,
    ActivePlan: '' as IntlString,
    ResourceUsage: '' as IntlString,
    Subscriptions: '' as IntlString,
    UnlimitedUsers: '' as IntlString,
    UnlimitedObjects: '' as IntlString,
    ChangePlan: '' as IntlString,
    Subscribe: '' as IntlString,
    Monthly: '' as IntlString,
    Active: '' as IntlString,
    NoActivePlan: '' as IntlString,
    SelectPlanToBegin: '' as IntlString,
    SubscriptionEnds: '' as IntlString,
    SubscriptionRenews: '' as IntlString,
    SubscriptionValidUntil: '' as IntlString,
    ProcessingPayment: '' as IntlString,
    Downgrade: '' as IntlString,
    CancelSubscription: '' as IntlString,
    ConfirmUpgrade: '' as IntlString,
    ConfirmDowngrade: '' as IntlString,
    ConfirmCancel: '' as IntlString,
    UpgradeDescription: '' as IntlString,
    DowngradeDescription: '' as IntlString,
    CancelDescription: '' as IntlString,
    UncancelSubscription: '' as IntlString,
    ConfirmUncancel: '' as IntlString,
    UncancelDescription: '' as IntlString,
    PriceDifference: '' as IntlString,
    DialogCancel: '' as IntlString,
    DialogConfirm: '' as IntlString,
    StorageUsage: '' as IntlString,
    TrafficUsage: '' as IntlString,
    Usage: '' as IntlString,
    Of: '' as IntlString,
    RestrictedPlans: '' as IntlString,
    SubscriptionOperationFailed: '' as IntlString,
    SubscriptionErrorMessage: '' as IntlString,
    StorageUsageTab: '' as IntlString,
    LargestFiles: '' as IntlString,
    LargestFilesDescription: '' as IntlString,
    StorageOverLimit: '' as IntlString,
    StorageUsageIncludesSystem: '' as IntlString,
    FileName: '' as IntlString,
    FileType: '' as IntlString,
    FileLocation: '' as IntlString,
    FileSize: '' as IntlString,
    FileModified: '' as IntlString,
    FileOwner: '' as IntlString,
    FileTypeAttachment: '' as IntlString,
    FileTypeDrive: '' as IntlString,
    DeleteSelected: '' as IntlString,
    ClearSelection: '' as IntlString,
    SelectionSummary: '' as IntlString,
    ConfirmDeleteFiles: '' as IntlString,
    DeleteFilesDescription: '' as IntlString,
    DeletingFiles: '' as IntlString,
    FilesDeleted: '' as IntlString,
    FilesDeleteFailed: '' as IntlString,
    LoadMore: '' as IntlString,
    NoFilesYet: '' as IntlString,
    UnknownLocation: '' as IntlString,
    StorageAccessDenied: '' as IntlString,
    Refresh: '' as IntlString
  }
})
