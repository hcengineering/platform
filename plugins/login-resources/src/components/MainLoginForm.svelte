<!--
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
-->
<script lang="ts">
  import login from '..'
  import type { AnyComponent, ApplicationRoute } from '@anticrm/platform-ui'
  import { newRouter } from '@anticrm/platform-ui'
  import Component from '@anticrm/platform-ui/src/components/Component.svelte'

  let form: ApplicationRoute
  const forms: ApplicationRoute[] = [{ route: 'setting', component: login.component.SettingForm }]

  let component: AnyComponent | undefined

  function routeDefaults (): ApplicationRoute {
    return {
      route: '#undefined',
      component: login.component.LoginForm
    } as ApplicationRoute
  }

  const router = newRouter<ApplicationRoute>(
    ':route',
    (info) => {
      if (forms.length > 0) {
        form = forms.find((a) => a.route === info.route) || routeDefaults()
        component = form?.component
      }
    },
    routeDefaults()
  )
</script>

<Component is={component} props={{ router }} />
