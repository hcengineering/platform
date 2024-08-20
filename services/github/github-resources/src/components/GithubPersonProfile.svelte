<script lang="ts">
  import contact from '@hcengineering/contact'
  import { NavLink } from '@hcengineering/presentation'
  import tracker from '@hcengineering/tracker'
  import { Icon } from '@hcengineering/ui'
  import { GithubAuthentication } from '@hcengineering/github'
  import github from '../plugin'

  export let auth: GithubAuthentication
</script>

<div class="flex flex-row">
  <div class="flex flex-col">
    <div class="">
      <img src={auth?.avatar} width="64" height={'64'} alt={auth.name ?? ''} />
    </div>
    {#if auth?.name}
      <div class="p1 fs-title text-lg">
        {auth.name}
      </div>
    {/if}
    <div class="p1 text-base">
      <NavLink href={auth?.url ?? ''}>{auth.login}</NavLink>
    </div>
    {#if auth}
      <div class="flex-row-center mt-4 text-sm no-word-wrap">
        <Icon icon={contact.icon.Person} size={'small'} />
        <span class="ml-1">
          followers <b>{auth.followers}</b>
        </span>
        {#if auth.following}
          <div class="ml-1">
            ⋅ following <b>{auth.following}</b>
          </div>
        {/if}
      </div>
      <div class="flex-row-center mt-4 text-sm no-word-wrap">
        <Icon icon={github.icon.GithubRepository} size={'small'} />
        <span class="ml-1">
          repositories <b>{auth.repositories}</b>
        </span>

        <div class="ml-1">
          ⋅ starred <b>{auth.starredRepositories}</b>
        </div>
      </div>

      <div class="flex-row-center mt-4 text-sm no-word-wrap">
        <Icon icon={tracker.icon.Issue} size={'small'} />
        <span class="ml-1">
          open <b>{auth.openIssues}</b>
        </span>
        <div class="ml-1">
          ⋅ closed <b>{auth.closedIssues}</b>
        </div>
      </div>
      <div class="flex-row-center mt-4 text-sm no-word-wrap">
        <Icon icon={github.icon.PullRequest} size={'small'} />
        <span class="ml-1">
          open <b>{auth.openPRs}</b>
        </span>
        <div class="ml-1">
          ⋅ merged <b>{auth.mergedPRs}</b>
        </div>
        <!-- <div class="ml-1">
          ⋅ closed <b>{auth.closedPRs}</b>
        </div> -->
      </div>

      {#if auth.bio}
        <div class="p1 mt-4 no-word-wrap infoCard">
          bio <b class="ml-1">{auth.bio}</b>
        </div>
      {/if}

      {#if auth.blog}
        <div class="flex-row-center mt-4 text-sm no-word-wrap infoCard">
          blog <b class="ml-1">{auth.blog}</b>
        </div>
      {/if}

      {#if auth.company}
        <div class="flex-row-center mt-4 text-sm no-word-wrap infoCard">
          company <b class="ml-1">{auth.company}</b>
        </div>
      {/if}

      {#if auth.email}
        <div class="flex-row-center mt-4 text-sm infoCard">
          email <b class="ml-1">{auth.email}</b>
        </div>
      {/if}

      {#if auth.location}
        <div class="flex-row-center mt-4 text-sm infoCard">
          location <b class="ml-1">{auth.location}</b>
        </div>
      {/if}
      <div class="flex-row-center mt-4 text-sm">
        <Icon icon={github.icon.Github} size={'small'} />
        <span class="ml-1">
          organizations <b class="ml-1">{auth.organizations?.totalCount ?? 0}</b>
        </span>
      </div>
    {/if}
  </div>
  <div class="flex flex-col ml-4 flex-grow">
    <div class="flex-grow" style:overflow={'auto'}>
      {#each auth?.organizations?.nodes ?? [] as organization}
        <div class="org-card mt-2 flex-grow">
          <div class="flex flex-row-center">
            {#if organization.avatarUrl}
              <div class="mr-2">
                <img src={organization.avatarUrl} width="32" height={'32'} alt={organization.name} />
              </div>
            {/if}
            <div class="flex-row-center flex-no-wrap">
              <NavLink href={organization.url}>{organization.name}</NavLink>
            </div>
          </div>
          <div class="mt-2">
            {organization.description ?? ''}
          </div>
        </div>
      {/each}
    </div>
  </div>
  {#if auth.error}
    {auth.error}
  {/if}
</div>

<style lang="scss">
  .bordered {
    border: 1px dashed var(--theme-divider-color);
  }
  .org-card {
    border: 1px solid var(--theme-divider-color);
    border-radius: 8px;
    padding: 1rem;
  }
  .infoCard {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
