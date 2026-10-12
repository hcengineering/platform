//
// Copyright © 2026 TraceX SAS.
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

import forms, { formsId } from '@hcengineering/forms'
import { mergeIds, type IntlString } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

export default mergeIds(formsId, forms, {
  component: {
    FormsApp: '' as AnyComponent,
    FormSettings: '' as AnyComponent,
    WorkspaceForms: '' as AnyComponent
  },
  string: {
    FormLink: '' as IntlString,
    Submit: '' as IntlString,
    Submitted: '' as IntlString,
    OpenCard: '' as IntlString,
    Unavailable: '' as IntlString,
    Failed: '' as IntlString,
    ReferenceHint: '' as IntlString,
    JsonHint: '' as IntlString,
    PublicHint: '' as IntlString,
    NoForms: '' as IntlString,
    InvalidField: '' as IntlString,
    SubmittingAs: '' as IntlString,
    SignIn: '' as IntlString,
    SignInHint: '' as IntlString,
    Email: '' as IntlString,
    SendCode: '' as IntlString,
    EmailHint: '' as IntlString,
    Code: '' as IntlString,
    CodeSent: '' as IntlString,
    ConfirmEmail: '' as IntlString,
    ChangeEmail: '' as IntlString,
    VerificationFailed: '' as IntlString,
    ContinueWithGoogle: '' as IntlString,
    PublicationStatus: '' as IntlString,
    Published: '' as IntlString,
    Unpublished: '' as IntlString,
    NoConfiguredForms: '' as IntlString,
    AddForm: '' as IntlString,
    DeleteForm: '' as IntlString,
    FormMode: '' as IntlString,
    PublicForm: '' as IntlString,
    PrivateFixedForm: '' as IntlString,
    PrivateAutoForm: '' as IntlString,
    PrivateHint: '' as IntlString,
    AccessDenied: '' as IntlString,
    AutoSpace: '' as IntlString
  }
})
