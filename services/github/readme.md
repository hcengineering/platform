# Tasks for Github integration

## Project management from Huly (Postponed)

1. Observe all existing/closed projects and retrieve all custom field values and store them into Huly custom fields. It could be separate set of mixins possible.
2. On update of custom fields, propagate changes to appropriate project/field.
3. Status (Huly) is more rich in compare to issue/pull request (open/closed) status of Github. But for Projects, it could be "single_select" option to be used. But github right now doesn't provide a way to manage existing fields. So we could not maintain state of status field on github project. We only create/delete it.
   Possible workarounds:

   - Map Huly Status to Project Status field, and ask user to perform manual definitions of required status values. We will map by status name if appropriate value will be found.
   - On changes in Platform Status, we should show appropriate message about requirements to manage status on Github project.
   - On changes on Github side we could add necessary status values into Huly synchronized projects.

4. A list of issue for ProjectsV2 graphql APIs missing on GitHub side.
   https://github.com/orgs/community/discussions/61457
5. Enum values could be mapped to Github single_select values, but they could be created only from Github platform to prevent API limitations.
6. Text/number fields could be created from both sides.
