# Changelog

Changelog.

## [0.7.411] - 2026-04-12

* 🚀 FEATURES: · To launch publish npm manually ([#10580](https://github.com/hcengineering/platform/issues/10580)) · Auto generate rank in middleware ([#10577](https://github.com/hcengineering/platform/issues/10577)) · Add action to export project documents ([#10592](https://github.com/hcengineering/platform/issues/10592)) · Add PostgreSQL profile for dev mode ([#10582](https://github.com/hcengineering/platform/issues/10582)) · Add notifications for reviewed documents ([#10601](https://github.com/hcengineering/platform/issues/10601)) · *(notification)* Improve inbox list keyboard navigation and a11y ([#10612](https://github.com/hcengineering/platform/issues/10612)) · *(communication)* Improve messages loading state accessibility ([#10613](https://github.com/hcengineering/platform/issues/10613)) · *(notification)* Add inbox settings keyboard shortcuts ([#10614](https://github.com/hcengineering/platform/issues/10614)) · *(text-editor)* Add highlight, subscript, superscript and mathematics toolbar actions ([#10627](https://github.com/hcengineering/platform/issues/10627)) · To add social links if there are no attached messages ([#10657](https://github.com/hcengineering/platform/issues/10657)) · *(password)* Email-confirmed password setup for SSO accounts ([#10649](https://github.com/hcengineering/platform/issues/10649)) · Error handling in notification service ([#10662](https://github.com/hcengineering/platform/issues/10662)) · Add new process functions for data type conversion, including s… ([#10670](https://github.com/hcengineering/platform/issues/10670)) · Add 15/30 minutes time spent reports ([#10675](https://github.com/hcengineering/platform/issues/10675)) · *(setting)* Display version in Help & Support button ([#9796](https://github.com/hcengineering/platform/issues/9796)) ([#10667](https://github.com/hcengineering/platform/issues/10667)) · Guest users edit documents created by them ([#10695](https://github.com/hcengineering/platform/issues/10695)) · Add spellcheck prop to text editor components ([#10694](https://github.com/hcengineering/platform/issues/10694)) · Add configurable card layout modes ([#10724](https://github.com/hcengineering/platform/issues/10724)) · Add ability to configure guest permissions ([#10708](https://github.com/hcengineering/platform/issues/10708)) · Support find in desktop client ([#10723](https://github.com/hcengineering/platform/issues/10723)) · Add automationOnly flag to associations and restrict manual management in UI ([#10730](https://github.com/hcengineering/platform/issues/10730)) · Anonymous guest permissions ([#10726](https://github.com/hcengineering/platform/issues/10726)) · Add script to verify changed packages ([#10738](https://github.com/hcengineering/platform/issues/10738)) · To hide product and planner for guests ([#10741](https://github.com/hcengineering/platform/issues/10741)) · To answer questions in training for guests ([#10746](https://github.com/hcengineering/platform/issues/10746)) · Guest auto-join ([#10751](https://github.com/hcengineering/platform/issues/10751)) 
* 🐛 BUG FIXES: · Npm publish ([#10575](https://github.com/hcengineering/platform/issues/10575)) · LockFieldEditor.svelte formatting ([#10578](https://github.com/hcengineering/platform/issues/10578)) · *(account)* Handle single-word names in OIDC and GitHub auth providers ([#10631](https://github.com/hcengineering/platform/issues/10631)) · Npm packages to not use legacy repository format ([#10576](https://github.com/hcengineering/platform/issues/10576)) · Import tool launch ([#10596](https://github.com/hcengineering/platform/issues/10596)) · Improve cookie token selection ([#10599](https://github.com/hcengineering/platform/issues/10599)) · Stripe webhook ([#10600](https://github.com/hcengineering/platform/issues/10600)) · Exporter ([#10583](https://github.com/hcengineering/platform/issues/10583)) · Stripe events ([#10602](https://github.com/hcengineering/platform/issues/10602)) · Stripe metadata ([#10603](https://github.com/hcengineering/platform/issues/10603)) · *(tracker)* Make Project.defaultIssueStatus optional ([#10598](https://github.com/hcengineering/platform/issues/10598)) · Payment server config ([#10607](https://github.com/hcengineering/platform/issues/10607)) · Stripe success URL and account id ([#10608](https://github.com/hcengineering/platform/issues/10608)) · Subscription status mapping ([#10611](https://github.com/hcengineering/platform/issues/10611)) · Logging for transformStripeSubscriptionToData ([#10609](https://github.com/hcengineering/platform/issues/10609)) · Svelte error in sub-issues ([#10618](https://github.com/hcengineering/platform/issues/10618)) · *(tracker)* ParentIssue prop overrides draft when reopening create issue modal ([#10616](https://github.com/hcengineering/platform/issues/10616)) · Convert ws event data to array buffer ([#10635](https://github.com/hcengineering/platform/issues/10635)) · Translation error loop ([#10636](https://github.com/hcengineering/platform/issues/10636)) · Request section visibility and hide card activity for guests ([#10641](https://github.com/hcengineering/platform/issues/10641)) · Publish config ([#10644](https://github.com/hcengineering/platform/issues/10644)) · Export translations ([#10652](https://github.com/hcengineering/platform/issues/10652)) · *(tracker)* Truncate long milestone titles on issue cards ([#10646](https://github.com/hcengineering/platform/issues/10646)) · Social ID owner check ([#10653](https://github.com/hcengineering/platform/issues/10653)) · *(login)* Guard logIn() behind token check in password signup ([#10518](https://github.com/hcengineering/platform/issues/10518)) ([#10650](https://github.com/hcengineering/platform/issues/10650)) · Intermittent PDF print failures ([#10654](https://github.com/hcengineering/platform/issues/10654)) · *(account)* Handle single-word names in OIDC and GitHub auth providers ([#10631](https://github.com/hcengineering/platform/issues/10631)) ([#10656](https://github.com/hcengineering/platform/issues/10656)) · Social link save ([#10655](https://github.com/hcengineering/platform/issues/10655)) · *(view)* "Not Specified" group shows assigned issues ([#10606](https://github.com/hcengineering/platform/issues/10606)) ([#10666](https://github.com/hcengineering/platform/issues/10666)) · Formatting ([#10668](https://github.com/hcengineering/platform/issues/10668)) · Message links ([#10660](https://github.com/hcengineering/platform/issues/10660)) · Process card update check for tags ([#10671](https://github.com/hcengineering/platform/issues/10671)) · View setting bug ([#10674](https://github.com/hcengineering/platform/issues/10674)) · Display collaboration errors in case of reconnects ([#10678](https://github.com/hcengineering/platform/issues/10678)) · Markdown link escaping ([#10685](https://github.com/hcengineering/platform/issues/10685)) · Create Github worker for deleting workspace ([#10661](https://github.com/hcengineering/platform/issues/10661)) · Github UI issues ([#10684](https://github.com/hcengineering/platform/issues/10684)) · *(github)* Apply guest token to images in markdown sync ([#10659](https://github.com/hcengineering/platform/issues/10659)) · Hyperlink in contoll doc comment ([#10690](https://github.com/hcengineering/platform/issues/10690)) · Todo reassign ([#10693](https://github.com/hcengineering/platform/issues/10693)) · Markdown links in table ([#10688](https://github.com/hcengineering/platform/issues/10688)) · SSRF in Link Preview Service ([#10689](https://github.com/hcengineering/platform/issues/10689)) · *(github)* Guard REST octokit in comment sync to prevent createComment crash ([#10692](https://github.com/hcengineering/platform/issues/10692)) · Formatting ([#10697](https://github.com/hcengineering/platform/issues/10697)) · *(calendar)* Add error handling for outbound Google Calendar sync ([#10696](https://github.com/hcengineering/platform/issues/10696)) · Github login update ([#10683](https://github.com/hcengineering/platform/issues/10683)) · Ws connection hang in case of workspace not found ([#10682](https://github.com/hcengineering/platform/issues/10682)) · View setting freeze ([#10700](https://github.com/hcengineering/platform/issues/10700)) · Filter removed attribute from viewlet ([#10701](https://github.com/hcengineering/platform/issues/10701)) · Handle markdown table as KaTeX ([#10699](https://github.com/hcengineering/platform/issues/10699)) · View settings ([#10706](https://github.com/hcengineering/platform/issues/10706)) · Select space not accessible to the user ([#10707](https://github.com/hcengineering/platform/issues/10707)) · Log workspace info ([#10712](https://github.com/hcengineering/platform/issues/10712)) · Mermaid diagram paste ([#10714](https://github.com/hcengineering/platform/issues/10714)) · Run-local for print service ([#10719](https://github.com/hcengineering/platform/issues/10719)) · SubProcessMatchCheck ([#10731](https://github.com/hcengineering/platform/issues/10731)) · UI freeze on missing translation params ([#10735](https://github.com/hcengineering/platform/issues/10735)) · Markdown links in table refresh ([#10732](https://github.com/hcengineering/platform/issues/10732)) · Rename twitter to x ([#10744](https://github.com/hcengineering/platform/issues/10744)) 
* 🚜 REFACTOR: · Default invite settings in link generation ([#10651](https://github.com/hcengineering/platform/issues/10651)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog ([#10579](https://github.com/hcengineering/platform/issues/10579)) · KVS version ([#10633](https://github.com/hcengineering/platform/issues/10633)) · Unused field ([#10686](https://github.com/hcengineering/platform/issues/10686)) · Employee role on account role change ([#10709](https://github.com/hcengineering/platform/issues/10709)) · Mobile not supported placeholder ([#10718](https://github.com/hcengineering/platform/issues/10718)) · Dark theme ([#10728](https://github.com/hcengineering/platform/issues/10728)) · Guests icon ([#10733](https://github.com/hcengineering/platform/issues/10733)) 
* BUILD: · *(deps)* Bump docker/setup-docker-action from 4 to 5 ([#10584](https://github.com/hcengineering/platform/issues/10584)) · *(deps)* Bump crazy-max/ghaction-setup-docker from 3 to 5 ([#10585](https://github.com/hcengineering/platform/issues/10585)) · *(deps)* Bump docker/login-action from 3 to 4 ([#10589](https://github.com/hcengineering/platform/issues/10589)) · *(deps)* Bump docker/setup-qemu-action from 3 to 4 ([#10590](https://github.com/hcengineering/platform/issues/10590)) · *(deps)* Bump pnpm/action-setup from 4 to 5 ([#10648](https://github.com/hcengineering/platform/issues/10648)) 
* QFIX: · Fix card warnings ([#10725](https://github.com/hcengineering/platform/issues/10725)) · Call resolve after error handling ([#10736](https://github.com/hcengineering/platform/issues/10736)) 

## [0.7.382] - 2026-03-02

* 🚀 FEATURES: · Add ability to sort projects and hide archived ([#10552](https://github.com/hcengineering/platform/issues/10552)) · Add tag process fixes ([#10561](https://github.com/hcengineering/platform/issues/10561)) · Add tags to markdown table ([#10560](https://github.com/hcengineering/platform/issues/10560)) · Implement `FieldChangedRollback` to revert document updates in … ([#10572](https://github.com/hcengineering/platform/issues/10572)) · Implement field locking and unlocking functionality, including UI, backend logic, and i18n. ([#10573](https://github.com/hcengineering/platform/issues/10573)) 
* 🐛 BUG FIXES: · Embed html instead of showing in iframe ([#10549](https://github.com/hcengineering/platform/issues/10549)) · Npm publish ([#10545](https://github.com/hcengineering/platform/issues/10545)) · FieldChangesCheck ([#10550](https://github.com/hcengineering/platform/issues/10550)) · Missing enum when export type ([#10551](https://github.com/hcengineering/platform/issues/10551)) · *(account)* Handle empty $in array to prevent PostgreSQL IN () syntax error ([#10554](https://github.com/hcengineering/platform/issues/10554)) · Last messages button ([#10558](https://github.com/hcengineering/platform/issues/10558)) · Allow kick last owner ([#10559](https://github.com/hcengineering/platform/issues/10559)) · Process middleware ([#10568](https://github.com/hcengineering/platform/issues/10568)) · Prrocess user input ([#10570](https://github.com/hcengineering/platform/issues/10570)) · Process ([#10571](https://github.com/hcengineering/platform/issues/10571)) · Dependency mismatch 
* ⚙️ MISCELLANEOUS TASKS: · Changelog ([#10544](https://github.com/hcengineering/platform/issues/10544)) · 0.7.382 

## [0.7.375] - 2026-02-23

* 🚀 FEATURES: · Add activity section in controlled doc ([#10457](https://github.com/hcengineering/platform/issues/10457)) · Add data converter plugin ([#10460](https://github.com/hcengineering/platform/issues/10460)) · *(ui)* Add Turkish language to settings popup ([#10441](https://github.com/hcengineering/platform/issues/10441)) · Turkish language in dev setup ([#10462](https://github.com/hcengineering/platform/issues/10462)) · Add import notifications ([#10464](https://github.com/hcengineering/platform/issues/10464)) · Guest users to upload attachments and use reactions ([#10469](https://github.com/hcengineering/platform/issues/10469)) · Add activity input for controlled docs ([#10470](https://github.com/hcengineering/platform/issues/10470)) · Ability to select multiple docs and to export to pdf ([#10468](https://github.com/hcengineering/platform/issues/10468)) · Headers legibility ([#10473](https://github.com/hcengineering/platform/issues/10473)) · Brazilian Portuguese translation ([#10478](https://github.com/hcengineering/platform/issues/10478)) · Add drive permissions ([#10489](https://github.com/hcengineering/platform/issues/10489)) · Add unlock card and section functionality with UI updates ([#10492](https://github.com/hcengineering/platform/issues/10492)) · To define different viewlet actions ([#10502](https://github.com/hcengineering/platform/issues/10502)) · Add ability to copy all data from cards/docs tables ([#10505](https://github.com/hcengineering/platform/issues/10505)) · Redesign workspace join ([#10507](https://github.com/hcengineering/platform/issues/10507)) · For guests to update notification settings ([#10517](https://github.com/hcengineering/platform/issues/10517)) · Add project breadcrumb ([#10515](https://github.com/hcengineering/platform/issues/10515)) · Implement process import/export functionality, enhance process … ([#10528](https://github.com/hcengineering/platform/issues/10528)) · Implement CancelSubProcess action, fix process execution flow. ([#10530](https://github.com/hcengineering/platform/issues/10530)) · Add ability to group by issues by project ([#10531](https://github.com/hcengineering/platform/issues/10531)) 
* 🐛 BUG FIXES: · Okit.graphql is not a function ([#10442](https://github.com/hcengineering/platform/issues/10442)) · Custom attributes in markdown table ([#10445](https://github.com/hcengineering/platform/issues/10445)) · Relationship table diff/refresh ([#10446](https://github.com/hcengineering/platform/issues/10446)) · Handle youtu.be links ([#10458](https://github.com/hcengineering/platform/issues/10458)) · Calendar timezone day-shift bug ([#7048](https://github.com/hcengineering/platform/issues/7048)) ([#10459](https://github.com/hcengineering/platform/issues/10459)) · Mute account unauthorized error ([#10461](https://github.com/hcengineering/platform/issues/10461)) · Do not write analytics event when no token ([#10463](https://github.com/hcengineering/platform/issues/10463)) · Documents space export ([#10465](https://github.com/hcengineering/platform/issues/10465)) · Print layout ([#10472](https://github.com/hcengineering/platform/issues/10472)) · Use the error logging level for expected situations ([#10474](https://github.com/hcengineering/platform/issues/10474)) · Allow to open mermaid diagram in fullscreen ([#10477](https://github.com/hcengineering/platform/issues/10477)) · Rows order in relationsheep table compare ([#10479](https://github.com/hcengineering/platform/issues/10479)) · Custom attributes display in original view ([#10480](https://github.com/hcengineering/platform/issues/10480)) · Card formatting in markdown ([#10475](https://github.com/hcengineering/platform/issues/10475)) · Proper mermaid diagram size ([#10487](https://github.com/hcengineering/platform/issues/10487)) · Embed pdf via direct link ([#10491](https://github.com/hcengineering/platform/issues/10491)) · Secure blobs ([#10490](https://github.com/hcengineering/platform/issues/10490)) · Relationship table refresh ([#10494](https://github.com/hcengineering/platform/issues/10494)) · Issues layout ([#10498](https://github.com/hcengineering/platform/issues/10498)) · Exception during github issue id reading ([#10500](https://github.com/hcengineering/platform/issues/10500)) · Email notifications for export ([#10506](https://github.com/hcengineering/platform/issues/10506)) · Prevent datalake from error flood ([#10521](https://github.com/hcengineering/platform/issues/10521)) · Brazilian Portuguese translation ([#10522](https://github.com/hcengineering/platform/issues/10522)) · Datalake in dev setup does not support secure mode ([#10525](https://github.com/hcengineering/platform/issues/10525)) · Date formatting in md table ([#10523](https://github.com/hcengineering/platform/issues/10523)) · Bump with foundation packages ([#10536](https://github.com/hcengineering/platform/issues/10536)) · Process ([#10543](https://github.com/hcengineering/platform/issues/10543)) 
* 🚜 REFACTOR: · One metadata interface ([#10444](https://github.com/hcengineering/platform/issues/10444)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog · Changelog ([#10439](https://github.com/hcengineering/platform/issues/10439)) · Mail URL from export pod ([#10476](https://github.com/hcengineering/platform/issues/10476)) · Etc/hosts path for Windows ([#10482](https://github.com/hcengineering/platform/issues/10482)) · Space security and permissions ([#10529](https://github.com/hcengineering/platform/issues/10529)) · Kvs and pulse versions ([#10539](https://github.com/hcengineering/platform/issues/10539)) · And publish npm packages for v tags ([#10542](https://github.com/hcengineering/platform/issues/10542)) 
* FIX: · Images not rendering on GitHub side of GitHub integration ([#10520](https://github.com/hcengineering/platform/issues/10520)) · Show print actions for individual documents ([#10484](https://github.com/hcengineering/platform/issues/10484)) · Password signup crashes with JSON parse error when MAIL_URL is configured ([#10519](https://github.com/hcengineering/platform/issues/10519)) 
* QFIX: · Allow notifications for guests with collab security ([#10510](https://github.com/hcengineering/platform/issues/10510)) 
* QFIX: · Remove unused ui dependencies ([#10511](https://github.com/hcengineering/platform/issues/10511)) 

## [0.7.353] - 2026-01-24

* 🚀 FEATURES: · Link preview service ([#10424](https://github.com/hcengineering/platform/issues/10424)) · Add confirmation modal for table refresh ([#10428](https://github.com/hcengineering/platform/issues/10428)) · Guest update profile (avatar, name etc) ([#10429](https://github.com/hcengineering/platform/issues/10429)) 
* 🐛 BUG FIXES: · Size predicate null handle ([#10417](https://github.com/hcengineering/platform/issues/10417)) · Long title display ([#10418](https://github.com/hcengineering/platform/issues/10418)) · Sort qms templates in wizard ([#10419](https://github.com/hcengineering/platform/issues/10419)) · Original table layout ([#10427](https://github.com/hcengineering/platform/issues/10427)) · Missing collaborative content in export ([#10432](https://github.com/hcengineering/platform/issues/10432)) · Login if current location equal to target ([#10436](https://github.com/hcengineering/platform/issues/10436)) · Add more mail ervice traces ([#10438](https://github.com/hcengineering/platform/issues/10438)) · Source table columns ([#10437](https://github.com/hcengineering/platform/issues/10437)) 

## [0.7.350] - 2026-01-18

* 🐛 BUG FIXES: · Association attribute in markdown table ([#10398](https://github.com/hcengineering/platform/issues/10398)) · Card export ([#10403](https://github.com/hcengineering/platform/issues/10403)) · Card view settings ([#10404](https://github.com/hcengineering/platform/issues/10404)) · Customize support links ([#10405](https://github.com/hcengineering/platform/issues/10405)) · Controlled doc sequence conflicts ([#10406](https://github.com/hcengineering/platform/issues/10406)) · Default null value ([#10409](https://github.com/hcengineering/platform/issues/10409)) · View setting freeze ([#10410](https://github.com/hcengineering/platform/issues/10410)) · Show custom icons for cards breadcrumbs ([#10412](https://github.com/hcengineering/platform/issues/10412)) · Filter relations by workspaceId ([#10414](https://github.com/hcengineering/platform/issues/10414)) 
* ⚙️ MISCELLANEOUS TASKS: · Core and server ([#10400](https://github.com/hcengineering/platform/issues/10400)) · Beta marks for cards and processes ([#10408](https://github.com/hcengineering/platform/issues/10408)) · Actions/upload-artifact from 4 to 6 ([#10300](https://github.com/hcengineering/platform/issues/10300)) 

## [0.7.344] - 2026-01-12

* 🚀 FEATURES: · Add type/tag permissions ([#10384](https://github.com/hcengineering/platform/issues/10384)) 
* 🐛 BUG FIXES: · Sort controlled documents by rank and title ([#10383](https://github.com/hcengineering/platform/issues/10383)) · Card type export ([#10385](https://github.com/hcengineering/platform/issues/10385)) · Old card UI ([#10386](https://github.com/hcengineering/platform/issues/10386)) · Exporter ancestor order ([#10388](https://github.com/hcengineering/platform/issues/10388)) · Card activity ([#10393](https://github.com/hcengineering/platform/issues/10393)) · Missing events in planner ([#10395](https://github.com/hcengineering/platform/issues/10395)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog · Changelog · Changelog ([#10382](https://github.com/hcengineering/platform/issues/10382)) · Postgres package version ([#10394](https://github.com/hcengineering/platform/issues/10394)) 

## [0.7.342] - 2026-01-10

* 🚀 FEATURES: · Attribute permissions presenter ([#10272](https://github.com/hcengineering/platform/issues/10272)) · Add default settings for meeting rooms ([#10293](https://github.com/hcengineering/platform/issues/10293)) · Export documents from one workspace to another ([#10283](https://github.com/hcengineering/platform/issues/10283)) · Show ids in title ([#10318](https://github.com/hcengineering/platform/issues/10318)) · Add versioning support to fulltext ([#10338](https://github.com/hcengineering/platform/issues/10338)) · Custom employee ref ([#10349](https://github.com/hcengineering/platform/issues/10349)) · Add ability to copy cards as table ([#10355](https://github.com/hcengineering/platform/issues/10355)) · Open relations in new tab from context menu ([#10359](https://github.com/hcengineering/platform/issues/10359)) · Add ability to copy issues as table ([#10366](https://github.com/hcengineering/platform/issues/10366)) · To get person info in export ([#10368](https://github.com/hcengineering/platform/issues/10368)) 
* 🐛 BUG FIXES: · Attribute permissions for restricted spaces ([#10269](https://github.com/hcengineering/platform/issues/10269)) · Process user input popup ([#10274](https://github.com/hcengineering/platform/issues/10274)) · Gmail messages duplication ([#10277](https://github.com/hcengineering/platform/issues/10277)) · Do not remember project version ([#10276](https://github.com/hcengineering/platform/issues/10276)) · Revert document patches ([#10278](https://github.com/hcengineering/platform/issues/10278)) · And update changelog ([#10273](https://github.com/hcengineering/platform/issues/10273)) · Childs permissions ([#10284](https://github.com/hcengineering/platform/issues/10284)) · Workspace open for guest users ([#10292](https://github.com/hcengineering/platform/issues/10292)) · Hide huly-mail integration ([#10291](https://github.com/hcengineering/platform/issues/10291)) · Merge location ([#10295](https://github.com/hcengineering/platform/issues/10295)) · Permissions for mixins/tags ([#10294](https://github.com/hcengineering/platform/issues/10294)) · Card update process trigger ([#10296](https://github.com/hcengineering/platform/issues/10296)) · Association freeze ([#10299](https://github.com/hcengineering/platform/issues/10299)) · Permissions check ([#10309](https://github.com/hcengineering/platform/issues/10309)) · Organization tree layout ([#10312](https://github.com/hcengineering/platform/issues/10312)) · Permission check for template deletion ([#10313](https://github.com/hcengineering/platform/issues/10313)) · Restricted space permission check ([#10316](https://github.com/hcengineering/platform/issues/10316)) · Not specified date ([#10317](https://github.com/hcengineering/platform/issues/10317)) · Copy as markdown action ([#10321](https://github.com/hcengineering/platform/issues/10321)) · Adjust table print styles ([#10322](https://github.com/hcengineering/platform/issues/10322)) · Add missing german translations ([#10325](https://github.com/hcengineering/platform/issues/10325)) · Add missing portuguese translations ([#10326](https://github.com/hcengineering/platform/issues/10326)) · Add missing French translations ([#10327](https://github.com/hcengineering/platform/issues/10327)) · Documents with notes and images ([#10328](https://github.com/hcengineering/platform/issues/10328)) · Add missing translations ([#10330](https://github.com/hcengineering/platform/issues/10330)) · Export notifications ([#10333](https://github.com/hcengineering/platform/issues/10333)) · Limits after workspace change ([#10340](https://github.com/hcengineering/platform/issues/10340)) · Relation query ([#10346](https://github.com/hcengineering/platform/issues/10346)) · Relationship table header order ([#10353](https://github.com/hcengineering/platform/issues/10353)) · Card spaces table ([#10352](https://github.com/hcengineering/platform/issues/10352)) · Exported table columns ([#10356](https://github.com/hcengineering/platform/issues/10356)) · Subprocess space ([#10358](https://github.com/hcengineering/platform/issues/10358)) · Viewlet settings loading for export ([#10362](https://github.com/hcengineering/platform/issues/10362)) · Show title instead of labels ([#10364](https://github.com/hcengineering/platform/issues/10364)) · Outdated baseline warning ([#10369](https://github.com/hcengineering/platform/issues/10369)) · Fulltext index if communication api is not enabled ([#10371](https://github.com/hcengineering/platform/issues/10371)) · Email notifications ([#10376](https://github.com/hcengineering/platform/issues/10376)) · Social id search ([#10379](https://github.com/hcengineering/platform/issues/10379)) · Exporter ([#10378](https://github.com/hcengineering/platform/issues/10378)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog · Actions/cache from 4 to 5 ([#10297](https://github.com/hcengineering/platform/issues/10297)) · Dependencies ([#10305](https://github.com/hcengineering/platform/issues/10305)) · Last document check ([#10315](https://github.com/hcengineering/platform/issues/10315)) · Local client configs in case of version change ([#10377](https://github.com/hcengineering/platform/issues/10377)) · Keybind to close current tab (problem with different keyboards) ([#10375](https://github.com/hcengineering/platform/issues/10375)) · Model version ([#10381](https://github.com/hcengineering/platform/issues/10381)) 
* QFIX: · External approver ([#10350](https://github.com/hcengineering/platform/issues/10350)) 

## [0.7.314] - 2025-12-04

* 🚀 FEATURES: · Attribute permissions presenter ([#10272](https://github.com/hcengineering/platform/issues/10272)) 
* 🐛 BUG FIXES: · Attribute permissions for restricted spaces ([#10269](https://github.com/hcengineering/platform/issues/10269)) · Process user input popup ([#10274](https://github.com/hcengineering/platform/issues/10274)) · Gmail messages duplication ([#10277](https://github.com/hcengineering/platform/issues/10277)) · Do not remember project version ([#10276](https://github.com/hcengineering/platform/issues/10276)) · Revert document patches ([#10278](https://github.com/hcengineering/platform/issues/10278)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog 

## [0.7.313] - 2025-12-03

* 🚀 FEATURES: · Product and document patch versions ([#10265](https://github.com/hcengineering/platform/issues/10265)) 

## [0.7.312] - 2025-11-30

* 🚀 FEATURES: · From ID presenter ([#10242](https://github.com/hcengineering/platform/issues/10242)) · Duplicate a card ([#10245](https://github.com/hcengineering/platform/issues/10245)) · Add bump-changes · Add tests for measurement and understand overhead · To compile svelte files · Add ui-test component for checking compile · Add 'foundations/utils/' from commit '063b52c1cac395319e99d017986c35abe6b79deb' · Add utility tests · Add utility tests · Add more tests for queue · Add api-test tests · Hierarchy + tests · Add more hierarchy tests · Add connection tests · Adjust hulylake client for storage adapter · Add rush check to CI · Add storage client · Add copilot memory file · Add global user profile · Add TypeIdentifier · Add change logs · Add subsciption methods to account client · To suspend errors on with · Add password login locked platform status · Add change log · Add txMatch to permission · Formatting check · Add support for custom exclude filters · Add password aging · Add 'foundations/core/' from commit '4f31d1b32637d2f124f555531ee12be8af3fd4fc' · Add docker tests setup · Add hulylake storage adapter · Add tx ordering middleware · Add tests for session manager · Add support for memory limit check · Add identifier middleware, bump core · Pg security perfomance · Guest to update its identities · Formatting check · Add change · Add 'foundations/server/' from commit 'afe85b988c56330dd14d44fb766e2c41871b64a7' · Add initial docker tests · Add publish of NPM packages · Add staging tags support · Add repository to rush.js · Add on update co connection · Add docker container build · Add re-registration request in case of timeouts · Add backrpc reconnect tests · Add client configurable timeouts · Add more client tests · Add more tests · Add more server tests · Add getting starting diagram · Add disposable tests · Add proxy and cast calls · Add 'foundations/net/' from commit '7722c9534141cf92ea7e990b8687c14ef3c747b2' · Compact compact worker ([#4](https://github.com/hcengineering/platform/issues/4)) · Add 'foundations/hulylake/' from commit 'eb911a3bc7a759ee0642b2698620a2f0f68f7b61' · Add option info · Add regorus engine with permit file · Removed actors, improved performance · Ping from server to clients added · Ping from server to clients added · Add version number to /status info · Add 'foundations/hulypulse/' from commit '27e5a23ee935ac15cdfdf032cd649644390572a5' · Add types generation ([#12](https://github.com/hcengineering/platform/issues/12)) · Add repository to package.json ([#14](https://github.com/hcengineering/platform/issues/14)) · Add repository for sdk-types ([#15](https://github.com/hcengineering/platform/issues/15)) · Add copyright ([#32](https://github.com/hcengineering/platform/issues/32)) · Add external_id column to message ([#40](https://github.com/hcengineering/platform/issues/40)) · Add github actions and fix format ([#42](https://github.com/hcengineering/platform/issues/42)) · Add card events and files meta ([#53](https://github.com/hcengineering/platform/issues/53)) · Add link preview ([#58](https://github.com/hcengineering/platform/issues/58)) · Add fixes ([#66](https://github.com/hcengineering/platform/issues/66)) · Add log ([#67](https://github.com/hcengineering/platform/issues/67)) · Add update blob event ([#81](https://github.com/hcengineering/platform/issues/81)) · Add tottal for notifications ([#91](https://github.com/hcengineering/platform/issues/91)) · Add close lg fn ([#96](https://github.com/hcengineering/platform/issues/96)) · Add findMessagesMeta to rest client, fix params type ([#104](https://github.com/hcengineering/platform/issues/104)) · Add processes · Add sources into build packages · Publish · Find methods schemas to convert to valid types · Add change description · Add ActivityCollaborativeChange · Add 'foundations/communication/' from commit 'f65deaa24be43513d3be1bd89c40c7d7c91c8b9b' · Add sentry do stream service · Use queue for transcoding tasks input · Use queue for transcoding tasks input ([#13](https://github.com/hcengineering/platform/issues/13)) · Fast live recording · Fast live recording ([#20](https://github.com/hcengineering/platform/issues/20)) · Add 'foundations/stream/' from commit 'b7b6930b0992ae48f08d37745d5e6e5e26517337' · Add password aging · To ignore features for an installation ([#10234](https://github.com/hcengineering/platform/issues/10234)) · Performance for separator ([#10258](https://github.com/hcengineering/platform/issues/10258)) · Cards permissions ([#10260](https://github.com/hcengineering/platform/issues/10260)) 
* 🐛 BUG FIXES: · Spam with expected invite errors ([#10241](https://github.com/hcengineering/platform/issues/10241)) · Domain not found error ([#10240](https://github.com/hcengineering/platform/issues/10240)) · Filters for card ([#10246](https://github.com/hcengineering/platform/issues/10246)) · Spaces to card navigator ([#10243](https://github.com/hcengineering/platform/issues/10243)) · Billing ([#10250](https://github.com/hcengineering/platform/issues/10250)) · Uptrace error e.dataset is undefined ([#10251](https://github.com/hcengineering/platform/issues/10251)) · Formatting ([#10254](https://github.com/hcengineering/platform/issues/10254)) · Compile · Use of peer deps · Publish script · Utils · Not updated lock file · Update-deps · Update-deps · Deps · Tests · Platform-rig detection · Lock file · Log levels rename compile ui -> compile ui-esbuild · Build · All exports · Lock file · Publish · Missing publish configs · Rate limits bug · Lock file · Bug in queue cleanup · Deps · Pnpm · Versions · Instructions · Front service upload · Lock file · Linting · Pnpm lock · Lock file · Pnpm cache · WithContext and allow pass options · Formatting · Uptrace normalizeMarkdown errors · Uptrace NaN error · Uptrace filter is not a function error · CI · Pnpm lock · Test to be executed only once · Package include source files · Pnpm lock · Packages publish · Export · Publish · Validation issues · Collaboration test · Unstable ydoc tests · Ordering tests · Kafka close of admin · Lock file · TxOrdering implementation · Pnpm lock · Pnpm · One second counters for memory usage · Kafka test · One second counters · Lock file · Identifier middleware · Permission middleware · Enum sorting · Compression param · Pnpm lock · Publish · Docker images · Build · Exports · Publish CI · Build · Rejection · Bump to use last git tag · Bugs · Json processing · Bump script v0.7.8 · Launch config · Security section · Auto disaposable · How stateless containers are passed · Docker and rushx dev · Readme and few author mistakes · Formatting · Part column type · Merge tests · Conditional patch · Broken build · Do not fail on deseralization error and add logs · Merge unit tests · Merge of large blobs feched from s3 · National comments in code · Workspace security for WebSocket · WS errors · If-Match headers logic · Error handling of parsing custom headers · Resolve ambiguity in Redis write conditions · Hearbeat activity for all messages, not 'ping' only · Key parameter added · Date type · Deps · Package.json ([#16](https://github.com/hcengineering/platform/issues/16)) · Package.json main ([#18](https://github.com/hcengineering/platform/issues/18)) · Package json 2 ([#19](https://github.com/hcengineering/platform/issues/19)) · Db schema ([#21](https://github.com/hcengineering/platform/issues/21)) · Undefined card in messages ([#25](https://github.com/hcengineering/platform/issues/25)) · Types ([#27](https://github.com/hcengineering/platform/issues/27)) · Version ([#29](https://github.com/hcengineering/platform/issues/29)) · Version ([#30](https://github.com/hcengineering/platform/issues/30)) · Connection info ([#34](https://github.com/hcengineering/platform/issues/34)) · Connection info ([#35](https://github.com/hcengineering/platform/issues/35)) · Token generation ([#38](https://github.com/hcengineering/platform/issues/38)) · Build, add turbo, add publish config ([#41](https://github.com/hcengineering/platform/issues/41)) · Messages query ([#46](https://github.com/hcengineering/platform/issues/46)) · Extran id constraint ([#47](https://github.com/hcengineering/platform/issues/47)) · Messages query ([#49](https://github.com/hcengineering/platform/issues/49)) · Threads and patches, recreate db schema ([#50](https://github.com/hcengineering/platform/issues/50)) · Context create ([#51](https://github.com/hcengineering/platform/issues/51)) · Undefined error ([#52](https://github.com/hcengineering/platform/issues/52)) · Insert message with extarnal_id ([#56](https://github.com/hcengineering/platform/issues/56)) · Label query, implement message remove ([#57](https://github.com/hcengineering/platform/issues/57)) · Context removing ([#60](https://github.com/hcengineering/platform/issues/60)) · Messages query ([#61](https://github.com/hcengineering/platform/issues/61)) · Migration ([#65](https://github.com/hcengineering/platform/issues/65)) · Incorrect types in rest-client extractJson ([#68](https://github.com/hcengineering/platform/issues/68)) · Notifications query ([#69](https://github.com/hcengineering/platform/issues/69)) · Notification update validation schema ([#71](https://github.com/hcengineering/platform/issues/71)) · Thread attach ([#72](https://github.com/hcengineering/platform/issues/72)) · Message id limit ([#74](https://github.com/hcengineering/platform/issues/74)) · Api ([#75](https://github.com/hcengineering/platform/issues/75)) · Async broadcast ([#76](https://github.com/hcengineering/platform/issues/76)) · Format ([#78](https://github.com/hcengineering/platform/issues/78)) · Query ([#79](https://github.com/hcengineering/platform/issues/79)) · Validation ([#83](https://github.com/hcengineering/platform/issues/83)) · Query ([#88](https://github.com/hcengineering/platform/issues/88)) · Query refresh ([#89](https://github.com/hcengineering/platform/issues/89)) · Total ([#92](https://github.com/hcengineering/platform/issues/92)) · Notifications total on update ([#93](https://github.com/hcengineering/platform/issues/93)) · Contexts sql ([#94](https://github.com/hcengineering/platform/issues/94)) · Notifications ([#97](https://github.com/hcengineering/platform/issues/97)) · Reaction notifications ([#98](https://github.com/hcengineering/platform/issues/98)) · Query ([#99](https://github.com/hcengineering/platform/issues/99)) · Update esbuild in comm types ([#101](https://github.com/hcengineering/platform/issues/101)) · Migration ([#103](https://github.com/hcengineering/platform/issues/103)) · Thread ([#107](https://github.com/hcengineering/platform/issues/107)) · Insert message group select · Insert message · Thread attach ([#110](https://github.com/hcengineering/platform/issues/110)) · Uuid ([#111](https://github.com/hcengineering/platform/issues/111)) · Deps · Publish · Message update ([#114](https://github.com/hcengineering/platform/issues/114)) · Lang store ([#115](https://github.com/hcengineering/platform/issues/115)) · Pnpm · Deps · Reaction notification ([#118](https://github.com/hcengineering/platform/issues/118)) · Peers ([#120](https://github.com/hcengineering/platform/issues/120)) · Correctly handle uploader termination · Linter · Issues with recordings with 1440p and above · Tests · Writer proper content type to datalake · Null pointer dereference in scheduler · Typos in README · Use proper content type when uploading to datalake ([#7](https://github.com/hcengineering/platform/issues/7)) · Enable conversion for mp4 files only · Increase min complexity · Asjust linter settings · More fixes · Enable conversion for mp4 files only ([#8](https://github.com/hcengineering/platform/issues/8)) · Lint issues · Copy audio stream · Copy audio stream ([#10](https://github.com/hcengineering/platform/issues/10)) · Change artifact name · Change artifact name ([#11](https://github.com/hcengineering/platform/issues/11)) · Properly initialize uploader · Typo fixes · Uploader ([#12](https://github.com/hcengineering/platform/issues/12)) · Add .gitignore · Build · Properly detect created hls segments · Wait until uploader finishes · Tests and lint issues · Incomplete upload ([#14](https://github.com/hcengineering/platform/issues/14)) · Adjust transcode result · Adjust transcode result ([#15](https://github.com/hcengineering/platform/issues/15)) · Proper upload rollback · Proper upload rollback ([#16](https://github.com/hcengineering/platform/issues/16)) · Nil pointer dereference · Nil pointer dereference ([#17](https://github.com/hcengineering/platform/issues/17)) · Ensure correct ffmpeg commands · Ensure correct ffmpeg commands ([#18](https://github.com/hcengineering/platform/issues/18)) · Extract command executor to separate class · Extract command executor to separate class ([#19](https://github.com/hcengineering/platform/issues/19)) · Ci and fmt issues · Use different paths for recording and transcoding ([#21](https://github.com/hcengineering/platform/issues/21)) · Provide service name in token extra · Provide service name in token extra ([#22](https://github.com/hcengineering/platform/issues/22)) · Do not cache m3u8 files · Do not cache m3u8 files ([#23](https://github.com/hcengineering/platform/issues/23)) · Set parent for recording blobs · Set parent for recording blobs ([#25](https://github.com/hcengineering/platform/issues/25)) · Transcode while recording · Build ([#26](https://github.com/hcengineering/platform/issues/26)) · Formatting · Format script · Format · Every time compacting and put images back to backup ([#10257](https://github.com/hcengineering/platform/issues/10257)) · Ws acrhived teset ([#10259](https://github.com/hcengineering/platform/issues/10259)) · Types role migration ([#10263](https://github.com/hcengineering/platform/issues/10263)) 
* 🧪 TESTING: · Rest_api.rs · Ws.rs 
* ⚙️ MISCELLANEOUS TASKS: · Packages ([#10244](https://github.com/hcengineering/platform/issues/10244)) · Versions using Rush.js · Esbuild-svelte · Version to 0.7.5 · Version to 0.7.6 · To new version of esbuild and typescript · Prettier and new update-deps script · Esbuild svelte version · Simplytyped dep · Versions · Versions · To latest platform-rig · Typescript · To latest platform-rig · Deps · Versions · Versions · Pnpm · Versions · Versions again · Lock file · Client · Versions · TxAccessLevel interface · Markdown version · Broken tests · Version · Versions · To latest platform rig and core · Typescript · Deps · Ordering · Instructions file · Version · Version · Versions · Version · Versions · Versions · + passwordAging · Script · To v0.7.2 · Lock file · Free disk space step · To v0.7.6 · Script · To 0.7.9 · Documenation · Of documenation · Twitter and roadmap for now · Types · Types · Types & db schema ([#3](https://github.com/hcengineering/platform/issues/3)) · Message place table ([#11](https://github.com/hcengineering/platform/issues/11)) · Version ([#22](https://github.com/hcengineering/platform/issues/22)) · Version and server-core ([#24](https://github.com/hcengineering/platform/issues/24)) · Adapter ([#33](https://github.com/hcengineering/platform/issues/33)) · Version ([#48](https://github.com/hcengineering/platform/issues/48)) · Dep conflicts ([#63](https://github.com/hcengineering/platform/issues/63)) · Log · Communication version to 0.7.0 · Version · Version · Platform-rig · Core · Version · Version · Version · Pnpm · Deps · Deps to platform.core · Core · Actions/checkout from 4 to 6 ([#10235](https://github.com/hcengineering/platform/issues/10235)) 
* BLOB: · :size -> Blob::length 
* CHORE: · Use fixed versions in update-deps · Commit changes 
* FIX: · Some hls players are not able to run recordings with 1440p and above ([#3](https://github.com/hcengineering/platform/issues/3)) 
* Q-FIX: · Sql ([#86](https://github.com/hcengineering/platform/issues/86)) 
* REFACTORING: · Typing, comments-into-names changes. 
* UBERF-11712: · Rework integration ([#73](https://github.com/hcengineering/platform/issues/73)) 
* UBERF-9192: · Add initial version of huly-stream ([#1](https://github.com/hcengineering/platform/issues/1)) 
* UBERF-9615: · Add possible to schedule transcoding tasks ([#4](https://github.com/hcengineering/platform/issues/4)) 
* UBERF-9641: · Add support for thumbnail · Add support for thumbnail ([#5](https://github.com/hcengineering/platform/issues/5)) 
* DEBUG: · Display redis configuration on start 
* QFIX: · Parse huly ops first 
* UPGRADE: · Memory engine optimized; change name  to  (was recommended by Copilot and Onnikov, TODO: CHANGE CLIENT TOO!!!) 

## [0.7.311] - 2025-11-25

* 🐛 BUG FIXES: · Billing ([#10250](https://github.com/hcengineering/platform/issues/10250)) · Uptrace error e.dataset is undefined ([#10251](https://github.com/hcengineering/platform/issues/10251)) 

## [0.7.310] - 2025-11-25

* 🚀 FEATURES: · Ignore billing ([#10233](https://github.com/hcengineering/platform/issues/10233)) · Ignore billing ([#10233](https://github.com/hcengineering/platform/issues/10233)) · From ID presenter ([#10242](https://github.com/hcengineering/platform/issues/10242)) · Duplicate a card ([#10245](https://github.com/hcengineering/platform/issues/10245)) 
* 🐛 BUG FIXES: · Duplicated inbox app ([#10236](https://github.com/hcengineering/platform/issues/10236)) · Runtime error in billing ([#10237](https://github.com/hcengineering/platform/issues/10237)) · Spam with expected invite errors ([#10241](https://github.com/hcengineering/platform/issues/10241)) · Domain not found error ([#10240](https://github.com/hcengineering/platform/issues/10240)) · Filters for card ([#10246](https://github.com/hcengineering/platform/issues/10246)) · Spaces to card navigator ([#10243](https://github.com/hcengineering/platform/issues/10243)) 
* ⚙️ MISCELLANEOUS TASKS: · Notifications migration ([#10238](https://github.com/hcengineering/platform/issues/10238)) · Packages ([#10244](https://github.com/hcengineering/platform/issues/10244)) 

## [0.7.306] - 2025-11-20

* 🐛 BUG FIXES: · Null error in getReviewers ([#10229](https://github.com/hcengineering/platform/issues/10229)) 
* ⚙️ MISCELLANEOUS TASKS: · Core and server versions ([#10230](https://github.com/hcengineering/platform/issues/10230)) 

## [0.7.305] - 2025-11-18

* 🚀 FEATURES: · Inbox in default config ([#10227](https://github.com/hcengineering/platform/issues/10227)) 
* 🐛 BUG FIXES: · QMS login tests ([#10210](https://github.com/hcengineering/platform/issues/10210)) · Value.every is not a function ([#10213](https://github.com/hcengineering/platform/issues/10213)) · Bandwidth constraint errors ([#10211](https://github.com/hcengineering/platform/issues/10211)) · Use slim docker image ([#10214](https://github.com/hcengineering/platform/issues/10214)) 
* 🚜 REFACTOR: · And improve free space action ([#10226](https://github.com/hcengineering/platform/issues/10226)) 
* EQMS-1401: · Track password changed events ([#10217](https://github.com/hcengineering/platform/issues/10217)) 

## [0.7.302] - 2025-11-14

* 🚀 FEATURES: · Add card parent in sidebar ([#10018](https://github.com/hcengineering/platform/issues/10018)) · To move many cards ([#10030](https://github.com/hcengineering/platform/issues/10030)) · Add FirstMatchValue and Filter functions ([#10042](https://github.com/hcengineering/platform/issues/10042)) · Replace translate boilerplate with extension in editor ([#10054](https://github.com/hcengineering/platform/issues/10054)) · Add storage adapter for hulylake ([#10032](https://github.com/hcengineering/platform/issues/10032)) · Ordering middleware ([#10077](https://github.com/hcengineering/platform/issues/10077)) · To perform markdown copy ([#10090](https://github.com/hcengineering/platform/issues/10090)) · Add copilot instructions ([#10092](https://github.com/hcengineering/platform/issues/10092)) · Build without login to docker hub ([#10095](https://github.com/hcengineering/platform/issues/10095)) · Add subprocess match trigger ([#10101](https://github.com/hcengineering/platform/issues/10101)) · Allow to customize typing ([#10111](https://github.com/hcengineering/platform/issues/10111)) · Add ai usage to billing  ([#10138](https://github.com/hcengineering/platform/issues/10138)) · To see archived channels ([#10148](https://github.com/hcengineering/platform/issues/10148)) · Add chunter-->card tool ([#10163](https://github.com/hcengineering/platform/issues/10163)) · Upgrade modal for non-billing manager ([#10180](https://github.com/hcengineering/platform/issues/10180)) · Office floor editing ([#10173](https://github.com/hcengineering/platform/issues/10173)) · Add usage indicator instead of upgrade button ([#10186](https://github.com/hcengineering/platform/issues/10186)) · PNPM workspaces ([#10192](https://github.com/hcengineering/platform/issues/10192)) 
* 🐛 BUG FIXES: · Add collabs on mentions whrn security enabled ([#9991](https://github.com/hcengineering/platform/issues/9991)) · Use values not arrays in activity ([#9992](https://github.com/hcengineering/platform/issues/9992)) · Missing functions ([#9993](https://github.com/hcengineering/platform/issues/9993)) · Threads ([#10000](https://github.com/hcengineering/platform/issues/10000)) · Create child handler ([#10002](https://github.com/hcengineering/platform/issues/10002)) · Use fixed chromium version ([#10010](https://github.com/hcengineering/platform/issues/10010)) · Item id in card feed ([#10014](https://github.com/hcengineering/platform/issues/10014)) · Update puppeteer version ([#10011](https://github.com/hcengineering/platform/issues/10011)) · Pass socialId when patching blobs ([#10017](https://github.com/hcengineering/platform/issues/10017)) · Calendar ([#10020](https://github.com/hcengineering/platform/issues/10020)) · Guest search security ([#10021](https://github.com/hcengineering/platform/issues/10021)) · Process array reduce ([#10036](https://github.com/hcengineering/platform/issues/10036)) · Subscribe initial state, fix switch workspace error, upgrade ping ([#10026](https://github.com/hcengineering/platform/issues/10026)) · Inner dsl ([#10053](https://github.com/hcengineering/platform/issues/10053)) · Data loss in editor ([#10056](https://github.com/hcengineering/platform/issues/10056)) · Paste as plain text when in code block ([#10058](https://github.com/hcengineering/platform/issues/10058)) · Todo trigger ([#10059](https://github.com/hcengineering/platform/issues/10059)) · Auto translate ([#10062](https://github.com/hcengineering/platform/issues/10062)) · User input for relations ([#10064](https://github.com/hcengineering/platform/issues/10064)) · Return original octet-stream blob as image preview ([#10075](https://github.com/hcengineering/platform/issues/10075)) · Admin integrations ([#10076](https://github.com/hcengineering/platform/issues/10076)) · Action layout in card feed ([#10088](https://github.com/hcengineering/platform/issues/10088)) · Properly unobserve ydoc in inline comments ([#10094](https://github.com/hcengineering/platform/issues/10094)) · Check pasted content before paste ([#10097](https://github.com/hcengineering/platform/issues/10097)) · Moved packages ([#10104](https://github.com/hcengineering/platform/issues/10104)) · Editor table performance improvements ([#10106](https://github.com/hcengineering/platform/issues/10106)) · Translate service ([#10118](https://github.com/hcengineering/platform/issues/10118)) · Restructure workspace general settings ([#10120](https://github.com/hcengineering/platform/issues/10120)) · Card close ([#10123](https://github.com/hcengineering/platform/issues/10123)) · Timezone updates ([#10127](https://github.com/hcengineering/platform/issues/10127)) · Inbox ([#10129](https://github.com/hcengineering/platform/issues/10129)) · I18n ([#10132](https://github.com/hcengineering/platform/issues/10132)) · Relation cards presenter ([#10135](https://github.com/hcengineering/platform/issues/10135)) · Proper transcode large files ([#10137](https://github.com/hcengineering/platform/issues/10137)) · Pulse issues ([#10144](https://github.com/hcengineering/platform/issues/10144)) · Error for message without translation ([#10152](https://github.com/hcengineering/platform/issues/10152)) · Case sensitive search for issues ([#10153](https://github.com/hcengineering/platform/issues/10153)) · Use proper doc key when compacting backup ([#10155](https://github.com/hcengineering/platform/issues/10155)) · Optimize editor toolbar loading state check ([#10174](https://github.com/hcengineering/platform/issues/10174)) · Imports ([#10194](https://github.com/hcengineering/platform/issues/10194)) · Double submenu in settings ([#10196](https://github.com/hcengineering/platform/issues/10196)) · Use deleted email for login ([#10202](https://github.com/hcengineering/platform/issues/10202)) · Process roles ([#10203](https://github.com/hcengineering/platform/issues/10203)) · Mail notifications ([#10208](https://github.com/hcengineering/platform/issues/10208)) · Table issues ([#10207](https://github.com/hcengineering/platform/issues/10207)) 
* ⚙️ MISCELLANEOUS TASKS: · NPM rc ([#9990](https://github.com/hcengineering/platform/issues/9990)) · Cards feed view ([#9979](https://github.com/hcengineering/platform/issues/9979)) · Debug info ([#9999](https://github.com/hcengineering/platform/issues/9999)) · A lot of ping spans ([#10003](https://github.com/hcengineering/platform/issues/10003)) · Local time ([#10019](https://github.com/hcengineering/platform/issues/10019)) · Moved to huly.server packages ([#10061](https://github.com/hcengineering/platform/issues/10061)) · Deps oct 11 ([#10069](https://github.com/hcengineering/platform/issues/10069)) · Electron to 38.2.2 ([#10079](https://github.com/hcengineering/platform/issues/10079)) · Templates check on CI ([#10084](https://github.com/hcengineering/platform/issues/10084)) · All core/server packages to latest version ([#10082](https://github.com/hcengineering/platform/issues/10082)) · Unused ts-standard dependency ([#10086](https://github.com/hcengineering/platform/issues/10086)) · Versions ([#10087](https://github.com/hcengineering/platform/issues/10087)) · Server to include proper gauges ([#10091](https://github.com/hcengineering/platform/issues/10091)) · Chat ([#10098](https://github.com/hcengineering/platform/issues/10098)) · Actions/setup-node from 4 to 6 ([#10093](https://github.com/hcengineering/platform/issues/10093)) · Versions to latest core/server ([#10108](https://github.com/hcengineering/platform/issues/10108)) · Redundant question marks ([#10109](https://github.com/hcengineering/platform/issues/10109)) · Communication version ([#10117](https://github.com/hcengineering/platform/issues/10117)) · Process notification popup ([#10122](https://github.com/hcengineering/platform/issues/10122)) · Redundant tooltip for card type ([#10145](https://github.com/hcengineering/platform/issues/10145)) · Versions of all deps ([#10154](https://github.com/hcengineering/platform/issues/10154)) · Core deps ([#10156](https://github.com/hcengineering/platform/issues/10156)) · Packages ([#10162](https://github.com/hcengineering/platform/issues/10162)) · Changelog and fix api client reference ([#10169](https://github.com/hcengineering/platform/issues/10169)) · Versions ([#10170](https://github.com/hcengineering/platform/issues/10170)) · Chat scroll ([#10182](https://github.com/hcengineering/platform/issues/10182)) · Server ([#10185](https://github.com/hcengineering/platform/issues/10185)) 
* CHORE: · Use modern api sass ([#10070](https://github.com/hcengineering/platform/issues/10070)) · Improve sass warning suppression, add huly.utils and server to pmpm config overrides ([#10078](https://github.com/hcengineering/platform/issues/10078)) 
* EQMS-1402: · Limit password login max attempts ([#10184](https://github.com/hcengineering/platform/issues/10184)) 
* EQMS-1650: · External approvers ([#9987](https://github.com/hcengineering/platform/issues/9987)) · External approvers fixes ([#10181](https://github.com/hcengineering/platform/issues/10181)) 
* FIX: · Reduced theme blinking on desktop app start (windows). ([#10119](https://github.com/hcengineering/platform/issues/10119)) 
* OFFICE: · Use pulse for invites and join requests ([#9941](https://github.com/hcengineering/platform/issues/9941)) · Forbid anonymous invites & join requests ([#10065](https://github.com/hcengineering/platform/issues/10065)) 
* QFIX: · Account client type ([#9988](https://github.com/hcengineering/platform/issues/9988)) · Use css var for calendar zone bg color ([#10013](https://github.com/hcengineering/platform/issues/10013)) · Billing livekit errors ([#10015](https://github.com/hcengineering/platform/issues/10015)) · Move user profile to default card space ([#10029](https://github.com/hcengineering/platform/issues/10029)) · Ai assistant desktop ([#10031](https://github.com/hcengineering/platform/issues/10031)) · Delete milestone ([#10043](https://github.com/hcengineering/platform/issues/10043)) · Add fulltext dlq ([#10046](https://github.com/hcengineering/platform/issues/10046)) · Add ai-assitant to list of allowed integration services ([#10052](https://github.com/hcengineering/platform/issues/10052)) · Double approval of review/approve request ([#10199](https://github.com/hcengineering/platform/issues/10199)) 
* UBERF-13844,13845: · Edit card type UI improvements ([#10009](https://github.com/hcengineering/platform/issues/10009)) 
* UBERF-13864: · Fix social id presenter ([#10035](https://github.com/hcengineering/platform/issues/10035)) 
* UBERF-13891: · Global user profile ([#10102](https://github.com/hcengineering/platform/issues/10102)) 
* QFIX: · Add user/socialId/workspace into rpc call traces. ([#9983](https://github.com/hcengineering/platform/issues/9983)) · Use measurements from published packages ([#9984](https://github.com/hcengineering/platform/issues/9984)) · Use generateId instead of generateUuid ([#9995](https://github.com/hcengineering/platform/issues/9995)) · Use natural mermaid diagram width and scroll ([#10006](https://github.com/hcengineering/platform/issues/10006)) · Do not allow to disable contacts plugin ([#10025](https://github.com/hcengineering/platform/issues/10025)) · Log window reload reason ([#10033](https://github.com/hcengineering/platform/issues/10033)) · Fix card open to more native ([#10047](https://github.com/hcengineering/platform/issues/10047)) · Remove token logging ([#10049](https://github.com/hcengineering/platform/issues/10049)) · Validate workspace uuid in datalake ([#10048](https://github.com/hcengineering/platform/issues/10048)) · Remove indexeddb provider ([#10073](https://github.com/hcengineering/platform/issues/10073)) · Show billing in settings ([#10116](https://github.com/hcengineering/platform/issues/10116)) 
* QIFX: · Address sentry issues ([#10027](https://github.com/hcengineering/platform/issues/10027)) 
* UBERF-13874: · Generate token for ai assistant ([#10038](https://github.com/hcengineering/platform/issues/10038)) 

## [0.7.266] - 2025-10-02

* 🚀 FEATURES: · Add min and max value support for number inputs ([#9916](https://github.com/hcengineering/platform/issues/9916)) · Add all section for cards and use feed view by default ([#9935](https://github.com/hcengineering/platform/issues/9935)) · Add process activity to card ([#9952](https://github.com/hcengineering/platform/issues/9952)) · Add relation action ([#9970](https://github.com/hcengineering/platform/issues/9970)) · Add complete Turkish (tr) language support to Huly Platform ([#9975](https://github.com/hcengineering/platform/issues/9975)) 
* 🐛 BUG FIXES: · Use pulse for presence ([#9896](https://github.com/hcengineering/platform/issues/9896)) · Process ui ([#9898](https://github.com/hcengineering/platform/issues/9898)) · Trigger params editors ([#9897](https://github.com/hcengineering/platform/issues/9897)) · Process time ([#9900](https://github.com/hcengineering/platform/issues/9900)) · Process infinity loop ([#9903](https://github.com/hcengineering/platform/issues/9903)) · Handle disabled contacts plugin in mentions popup ([#9904](https://github.com/hcengineering/platform/issues/9904)) · Communication ([#9912](https://github.com/hcengineering/platform/issues/9912)) · Refactor presence and typing to use svelte actions ([#9908](https://github.com/hcengineering/platform/issues/9908)) · Handle submit and tabs in editor ([#9918](https://github.com/hcengineering/platform/issues/9918)) · Report analytics from print ([#9922](https://github.com/hcengineering/platform/issues/9922)) · Presence update ([#9924](https://github.com/hcengineering/platform/issues/9924)) · Ctrl-w handling even in background. ([#9925](https://github.com/hcengineering/platform/issues/9925)) · Communication indexing after new communication api ([#9931](https://github.com/hcengineering/platform/issues/9931)) · Request user input ([#9936](https://github.com/hcengineering/platform/issues/9936)) · Result input without result ([#9937](https://github.com/hcengineering/platform/issues/9937)) · Arrow up/down for old activity ([#9938](https://github.com/hcengineering/platform/issues/9938)) · Disable http client spans in datalake client ([#9940](https://github.com/hcengineering/platform/issues/9940)) · Order of messages in activity ([#9943](https://github.com/hcengineering/platform/issues/9943)) · Insert message group select ([#9944](https://github.com/hcengineering/platform/issues/9944)) · Expose card class and id in location data ([#9945](https://github.com/hcengineering/platform/issues/9945)) · Insert message ([#9949](https://github.com/hcengineering/platform/issues/9949)) · Threads and attachments overflow for large messages ([#9950](https://github.com/hcengineering/platform/issues/9950)) · Use known aspect ratio for video to prevent scroll ([#9954](https://github.com/hcengineering/platform/issues/9954)) · Use auto image aspect ratio in text editor ([#9953](https://github.com/hcengineering/platform/issues/9953)) · Number presenter ([#9956](https://github.com/hcengineering/platform/issues/9956)) · Process todo notification ([#9959](https://github.com/hcengineering/platform/issues/9959)) · Default space for new card form ([#9962](https://github.com/hcengineering/platform/issues/9962)) · Layout for new card popup ([#9964](https://github.com/hcengineering/platform/issues/9964)) · Duplicate marks support ([#9969](https://github.com/hcengineering/platform/issues/9969)) · Array size mode selector ([#9973](https://github.com/hcengineering/platform/issues/9973)) · Hidden popups in fullscreen meeting ([#9982](https://github.com/hcengineering/platform/issues/9982)) · Modal layout ([#9980](https://github.com/hcengineering/platform/issues/9980)) 
* ⚙️ MISCELLANEOUS TASKS: · Migration ([#9923](https://github.com/hcengineering/platform/issues/9923)) · Communication ([#9939](https://github.com/hcengineering/platform/issues/9939)) 
* OFFICE: · Refactor meeting creation ([#9905](https://github.com/hcengineering/platform/issues/9905)) · Meeting control bar with large buttons ([#9946](https://github.com/hcengineering/platform/issues/9946)) 
* QFIX: · Region when restoring from v6 ([#9920](https://github.com/hcengineering/platform/issues/9920)) · Restore draft condition ([#9921](https://github.com/hcengineering/platform/issues/9921)) 
* UBERF-13692: · Adjut merge contacts to global accounts ([#9911](https://github.com/hcengineering/platform/issues/9911)) 
* EQMS-1618: · Fix server branding ([#9907](https://github.com/hcengineering/platform/issues/9907)) 
* QFIX: · Hide large values from activity ([#9894](https://github.com/hcengineering/platform/issues/9894)) · Desktop should recover on network lose ([#9967](https://github.com/hcengineering/platform/issues/9967)) · Handle outside clicks only when popup is top level ([#9972](https://github.com/hcengineering/platform/issues/9972)) 

## [0.7.252] - 2025-09-21

* 🐛 BUG FIXES: · Build rekoni and print images ([#9860](https://github.com/hcengineering/platform/issues/9860)) · Default space for cards ([#9868](https://github.com/hcengineering/platform/issues/9868)) · Scroll in chat navigator ([#9872](https://github.com/hcengineering/platform/issues/9872)) · Use latest base image ([#9874](https://github.com/hcengineering/platform/issues/9874)) · Properly update pulse typing sub ([#9875](https://github.com/hcengineering/platform/issues/9875)) · Processes mixin work ([#9876](https://github.com/hcengineering/platform/issues/9876)) · Subprocess trigger ([#9884](https://github.com/hcengineering/platform/issues/9884)) · Reset typing state on resubscribe ([#9881](https://github.com/hcengineering/platform/issues/9881)) · Directs order ([#9885](https://github.com/hcengineering/platform/issues/9885)) · Processes rollback ([#9886](https://github.com/hcengineering/platform/issues/9886)) · Function context presenter ([#9887](https://github.com/hcengineering/platform/issues/9887)) 
* ⚙️ MISCELLANEOUS TASKS: · Email mask ([#9862](https://github.com/hcengineering/platform/issues/9862)) · Electron app to 38 ([#9878](https://github.com/hcengineering/platform/issues/9878)) 
* PROCESS: · Use previous step context in the same transition ([#9877](https://github.com/hcengineering/platform/issues/9877)) 
* QFIX: · Import tool owner permissions ([#9883](https://github.com/hcengineering/platform/issues/9883)) 
* UBERF-13587: · Huly secretary integration ([#9861](https://github.com/hcengineering/platform/issues/9861)) 
* UBERF-13725: · Fix Github service oom ([#9891](https://github.com/hcengineering/platform/issues/9891)) 
* SELFH-199: · V7 restore providers social ids ([#9892](https://github.com/hcengineering/platform/issues/9892)) 
* UBERF-13587: · Fix integrating ai-assistant in workspaces other than the first one ([#9882](https://github.com/hcengineering/platform/issues/9882)) 

## [0.7.245] - 2025-09-15

* 🚀 FEATURES: · Add search for card types dropdown ([#9836](https://github.com/hcengineering/platform/issues/9836)) 
* 🐛 BUG FIXES: · Handle html tags in markdown comparison ([#9838](https://github.com/hcengineering/platform/issues/9838)) · Processes triggers (On card update, on subprocesses done) ([#9841](https://github.com/hcengineering/platform/issues/9841)) · Use pulse typing in communication chat ([#9844](https://github.com/hcengineering/platform/issues/9844)) · Update docker images to latest base ([#9854](https://github.com/hcengineering/platform/issues/9854)) · Do not show error when love recording not available ([#9852](https://github.com/hcengineering/platform/issues/9852)) · Search by title when moving files and couments ([#9849](https://github.com/hcengineering/platform/issues/9849)) · Handle pong response in pulse client ([#9853](https://github.com/hcengineering/platform/issues/9853)) · Role selection logic in Owners component ([#9850](https://github.com/hcengineering/platform/issues/9850)) 
* UBERF-13511: · Support guest tokens with open account ([#9834](https://github.com/hcengineering/platform/issues/9834)) 
* EQMS-1644: · Fix mixins in server pipeline of workspace service ([#9839](https://github.com/hcengineering/platform/issues/9839)) 

## [0.7.242] - 2025-09-12

* 🚀 FEATURES: · Loop transition ([#9783](https://github.com/hcengineering/platform/issues/9783)) · Add content to new card form in Home ([#9803](https://github.com/hcengineering/platform/issues/9803)) · Add Home application ([#9811](https://github.com/hcengineering/platform/issues/9811)) · Add logging for event processing and transition handling in messageHandler ([#9823](https://github.com/hcengineering/platform/issues/9823)) 
* 🐛 BUG FIXES: · Show card icon in card title ([#9792](https://github.com/hcengineering/platform/issues/9792)) · Do not fail collab from json when wrong content type ([#9791](https://github.com/hcengineering/platform/issues/9791)) · Autofocus to qms comment popup ([#9800](https://github.com/hcengineering/platform/issues/9800)) · Office person assignee ([#9798](https://github.com/hcengineering/platform/issues/9798)) · Subprocess params ([#9805](https://github.com/hcengineering/platform/issues/9805)) · Add missing translations ([#9806](https://github.com/hcengineering/platform/issues/9806)) · Context class set ([#9830](https://github.com/hcengineering/platform/issues/9830)) · Home in desktop ([#9832](https://github.com/hcengineering/platform/issues/9832)) · Old inbox notifications ([#9835](https://github.com/hcengineering/platform/issues/9835)) 
* ⚙️ MISCELLANEOUS TASKS: · All icon in Home ([#9821](https://github.com/hcengineering/platform/issues/9821)) 
* UBERF-13510: · Card space public link ([#9804](https://github.com/hcengineering/platform/issues/9804)) 
* UBERF-13564: · Fix logout caused by connectivity issues ([#9809](https://github.com/hcengineering/platform/issues/9809)) 
* HULYLAKE: · Initial integration (build + dev docker compose) ([#9802](https://github.com/hcengineering/platform/issues/9802)) 
* QFIX: · Add separate gauges for sessions ([#9810](https://github.com/hcengineering/platform/issues/9810)) · Fix github measurements ([#9816](https://github.com/hcengineering/platform/issues/9816)) · Count anonymous users ([#9833](https://github.com/hcengineering/platform/issues/9833)) 
* UBERF-13507: · Support space membership via token claim ([#9786](https://github.com/hcengineering/platform/issues/9786)) 

## [0.7.235] - 2025-09-06

* 🚀 FEATURES: · Add exports for some packages used as external deps  ([#8116](https://github.com/hcengineering/platform/issues/8116)) · Refactor markup to markdown utils ([#8134](https://github.com/hcengineering/platform/issues/8134)) · Rate limit on sendInvite ([#8150](https://github.com/hcengineering/platform/issues/8150)) · Add public schedule ([#8155](https://github.com/hcengineering/platform/issues/8155)) · Add datalake service ([#8184](https://github.com/hcengineering/platform/issues/8184)) · WS tests stability ([#8196](https://github.com/hcengineering/platform/issues/8196)) · Add a token for stream requests ([#8288](https://github.com/hcengineering/platform/issues/8288)) · Add lazy for emojis groups ([#8292](https://github.com/hcengineering/platform/issues/8292)) · Change type ([#8337](https://github.com/hcengineering/platform/issues/8337)) · Add search for meetings ([#8341](https://github.com/hcengineering/platform/issues/8341)) · Export for organizations ([#8346](https://github.com/hcengineering/platform/issues/8346)) · Add exception to rules for ai bot in identity ([#8397](https://github.com/hcengineering/platform/issues/8397)) · Add confidence number to transcription ([#8429](https://github.com/hcengineering/platform/issues/8429)) · Add createInviteLink to account rest client ([#8456](https://github.com/hcengineering/platform/issues/8456)) · Add auto-start functionality and related triggers for processes ([#8478](https://github.com/hcengineering/platform/issues/8478)) · UpdateCard editor ([#8479](https://github.com/hcengineering/platform/issues/8479)) · Add parallel execution restriction feature to processes ([#8477](https://github.com/hcengineering/platform/issues/8477)) · Add user to card collaborators when card created in personal space ([#8487](https://github.com/hcengineering/platform/issues/8487)) · Add limit for types in navigator and add list view for types ([#8489](https://github.com/hcengineering/platform/issues/8489)) · Add voice activity ui ([#8460](https://github.com/hcengineering/platform/issues/8460)) · Add browser notifications sound ([#8515](https://github.com/hcengineering/platform/issues/8515)) · Auto topic creation in consumer ([#8529](https://github.com/hcengineering/platform/issues/8529)) · Add personal labels for cards ([#8534](https://github.com/hcengineering/platform/issues/8534)) · Media state plugin ([#8674](https://github.com/hcengineering/platform/issues/8674)) · Add new chat fixes ([#8687](https://github.com/hcengineering/platform/issues/8687)) · Add connectRest helper to api-client ([#8756](https://github.com/hcengineering/platform/issues/8756)) · Add sample rate to config ([#8797](https://github.com/hcengineering/platform/issues/8797)) · Add Milestones to issue cards in kanban board view ([#8822](https://github.com/hcengineering/platform/issues/8822)) · Add more logs for tg bot ([#8829](https://github.com/hcengineering/platform/issues/8829)) · Add StorageClient for api-client ([#8850](https://github.com/hcengineering/platform/issues/8850)) · Add config for new activity/chat/inbox ([#8951](https://github.com/hcengineering/platform/issues/8951)) · Add fixes for new chat/inbox ([#8984](https://github.com/hcengineering/platform/issues/8984)) · Add guests in contacts ([#8998](https://github.com/hcengineering/platform/issues/8998)) · Add favorite/starred cards ([#9006](https://github.com/hcengineering/platform/issues/9006)) · Add chat fixes and drafts, message remove action ([#9069](https://github.com/hcengineering/platform/issues/9069)) · Add link preview in new chat ([#9090](https://github.com/hcengineering/platform/issues/9090)) · Add {PROVIDER}_DISPLAY_NAME env-var  ([#8967](https://github.com/hcengineering/platform/issues/8967)) · Add beta label to processes module ([#9106](https://github.com/hcengineering/platform/issues/9106)) · Cpu profiling for ui tests ([#9149](https://github.com/hcengineering/platform/issues/9149)) · Add chat q-fixes ([#9173](https://github.com/hcengineering/platform/issues/9173)) · Workspace owners to edit spaces ([#9194](https://github.com/hcengineering/platform/issues/9194)) · Use queue for transcoding tasks ([#9216](https://github.com/hcengineering/platform/issues/9216)) · Add blockTime property to calendar events ([#9275](https://github.com/hcengineering/platform/issues/9275)) · Add card ui fixes ([#9301](https://github.com/hcengineering/platform/issues/9301)) · Add extra handlers to room controls ([#9221](https://github.com/hcengineering/platform/issues/9221)) · Space in sql filter ([#9330](https://github.com/hcengineering/platform/issues/9330)) · To disable surveys ([#9349](https://github.com/hcengineering/platform/issues/9349)) · Add text transformations ([#9351](https://github.com/hcengineering/platform/issues/9351)) · Add mathematical transformation functions ([#9357](https://github.com/hcengineering/platform/issues/9357)) · Add more chat/cards ui fixes ([#9358](https://github.com/hcengineering/platform/issues/9358)) · Add calendar to allowed ([#9373](https://github.com/hcengineering/platform/issues/9373)) · Add card icon ([#9379](https://github.com/hcengineering/platform/issues/9379)) · Add error messages to the middleware ([#9387](https://github.com/hcengineering/platform/issues/9387)) · Add red dot on desktop ([#9393](https://github.com/hcengineering/platform/issues/9393)) · Calendar sync ([#9400](https://github.com/hcengineering/platform/issues/9400)) · Add desktop pushes for new inbox ([#9414](https://github.com/hcengineering/platform/issues/9414)) · Backup logging ([#9434](https://github.com/hcengineering/platform/issues/9434)) · Add link to email notifications ([#9438](https://github.com/hcengineering/platform/issues/9438)) · To use realted object as value in processes ([#9439](https://github.com/hcengineering/platform/issues/9439)) · Newest first for activity by default ([#9454](https://github.com/hcengineering/platform/issues/9454)) · Add proccess execution log ([#9474](https://github.com/hcengineering/platform/issues/9474)) · Add jest global timeout ([#9498](https://github.com/hcengineering/platform/issues/9498)) · Add card readonly ([#9527](https://github.com/hcengineering/platform/issues/9527)) · Processes context ([#9537](https://github.com/hcengineering/platform/issues/9537)) · Add a separate setting to control if guests can join WS ([#9540](https://github.com/hcengineering/platform/issues/9540)) · Add array manipulation functions and editors for process ([#9594](https://github.com/hcengineering/platform/issues/9594)) · Notifications count ([#9598](https://github.com/hcengineering/platform/issues/9598)) · To edit description of Channel ([#9607](https://github.com/hcengineering/platform/issues/9607)) · To get blob metadata without authorization ([#9615](https://github.com/hcengineering/platform/issues/9615)) · Minimized screen recorder ([#9619](https://github.com/hcengineering/platform/issues/9619)) · Pass tracing info with websocket ([#9627](https://github.com/hcengineering/platform/issues/9627)) · Add IP geolocation support to analytics collector ([#9632](https://github.com/hcengineering/platform/issues/9632)) · Process ui ([#9645](https://github.com/hcengineering/platform/issues/9645)) · Add account method to get full social ids by person ids ([#9654](https://github.com/hcengineering/platform/issues/9654)) · Add script to restore Github integrations  ([#9700](https://github.com/hcengineering/platform/issues/9700)) · Add process temporal ([#9744](https://github.com/hcengineering/platform/issues/9744)) · Add search to Home page ([#9772](https://github.com/hcengineering/platform/issues/9772)) · Add filter to Home ([#9774](https://github.com/hcengineering/platform/issues/9774)) 
* 🐛 BUG FIXES: · Build · Ui tests · Failed tests · Check guest access with cookie token ([#8122](https://github.com/hcengineering/platform/issues/8122)) · Svelte-check errors ([#8127](https://github.com/hcengineering/platform/issues/8127)) · Creating meeting when create event ([#8131](https://github.com/hcengineering/platform/issues/8131)) · Missing screen share thumbnails in desktop ([#8135](https://github.com/hcengineering/platform/issues/8135)) · Participant name format ([#8141](https://github.com/hcengineering/platform/issues/8141)) · Create of elastic index · Multiple single queries, add  lazy, load with limit ([#8142](https://github.com/hcengineering/platform/issues/8142)) · Backup all and disable full check for migration · Typo in threads ([#8158](https://github.com/hcengineering/platform/issues/8158)) · Enums ([#8168](https://github.com/hcengineering/platform/issues/8168)) · Envs for huly-stream app for local dev ([#8171](https://github.com/hcengineering/platform/issues/8171)) · Encode content disposition file name ([#8190](https://github.com/hcengineering/platform/issues/8190)) · Enhance datalake performance logging ([#8197](https://github.com/hcengineering/platform/issues/8197)) · Keep alive consistency for account + front ([#8198](https://github.com/hcengineering/platform/issues/8198)) · Merge · Image preview not displayed ([#8207](https://github.com/hcengineering/platform/issues/8207)) · Schedule link text ([#8216](https://github.com/hcengineering/platform/issues/8216)) · Use readonly connections for guests ([#8221](https://github.com/hcengineering/platform/issues/8221)) · Attachment spaces ([#8200](https://github.com/hcengineering/platform/issues/8200)) · Use huly.local in webpack proxy config ([#8233](https://github.com/hcengineering/platform/issues/8233)) · Reindex ([#8236](https://github.com/hcengineering/platform/issues/8236)) · Account migration mongo to cr ([#8237](https://github.com/hcengineering/platform/issues/8237)) · Master tag remove ([#8239](https://github.com/hcengineering/platform/issues/8239)) · Model order ([#8250](https://github.com/hcengineering/platform/issues/8250)) · Datalake fixes ([#8251](https://github.com/hcengineering/platform/issues/8251)) · Backup-all script ([#8255](https://github.com/hcengineering/platform/issues/8255)) · Use host + port in datalake address ([#8276](https://github.com/hcengineering/platform/issues/8276)) · Override sidebar with thread ([#8277](https://github.com/hcengineering/platform/issues/8277)) · DocGuest set status cause tx and error record ([#8279](https://github.com/hcengineering/platform/issues/8279)) ([#8282](https://github.com/hcengineering/platform/issues/8282)) · Customize view freezes ([#8281](https://github.com/hcengineering/platform/issues/8281)) · Pg object query ([#8284](https://github.com/hcengineering/platform/issues/8284)) · Preload video by default ([#8286](https://github.com/hcengineering/platform/issues/8286)) · Code block styling fixes ([#8289](https://github.com/hcengineering/platform/issues/8289)) · Card available tags ([#8297](https://github.com/hcengineering/platform/issues/8297)) · Link preview size ([#8294](https://github.com/hcengineering/platform/issues/8294)) · Chat unscroll after chat freeze ([#8299](https://github.com/hcengineering/platform/issues/8299)) · Modify blob url if it has scheme ([#8301](https://github.com/hcengineering/platform/issues/8301)) · Mentions and threads ([#8309](https://github.com/hcengineering/platform/issues/8309)) · Multipart upload in datalake service ([#8307](https://github.com/hcengineering/platform/issues/8307)) · Object-fit mistake ([#8314](https://github.com/hcengineering/platform/issues/8314)) · Sql batch update ([#8296](https://github.com/hcengineering/platform/issues/8296)) · Contact array presenter ([#8332](https://github.com/hcengineering/platform/issues/8332)) · Ai reply loop ([#8333](https://github.com/hcengineering/platform/issues/8333)) · Handle token errors in front service ([#8336](https://github.com/hcengineering/platform/issues/8336)) · Thread open ([#8344](https://github.com/hcengineering/platform/issues/8344)) · Exclude first segment from account cookie domain ([#8348](https://github.com/hcengineering/platform/issues/8348)) · Remove quotes from print blob id ([#8356](https://github.com/hcengineering/platform/issues/8356)) · Handle double quotes in etag ([#8362](https://github.com/hcengineering/platform/issues/8362)) · Meeting window width ([#8365](https://github.com/hcengineering/platform/issues/8365)) · Change type ([#8388](https://github.com/hcengineering/platform/issues/8388)) · Mixins for calendar event ([#8393](https://github.com/hcengineering/platform/issues/8393)) · Meeting window width ([#8382](https://github.com/hcengineering/platform/issues/8382)) · Card migration ([#8402](https://github.com/hcengineering/platform/issues/8402)) · Update settings context on changes & update system theme ([#8405](https://github.com/hcengineering/platform/issues/8405)) · Freeze app for wrong class in mentions ([#8411](https://github.com/hcengineering/platform/issues/8411)) · Reduce amount of text typed ([#8414](https://github.com/hcengineering/platform/issues/8414)) · Stt ([#8415](https://github.com/hcengineering/platform/issues/8415)) · Fix list applications display ([#8417](https://github.com/hcengineering/platform/issues/8417)) · Build msg2file container ([#8424](https://github.com/hcengineering/platform/issues/8424)) · Transcript score ([#8434](https://github.com/hcengineering/platform/issues/8434)) · Cards view settings ([#8437](https://github.com/hcengineering/platform/issues/8437)) · Open doc on mention click in collaborative content ([#8442](https://github.com/hcengineering/platform/issues/8442)) · Admin pending ops ([#8449](https://github.com/hcengineering/platform/issues/8449)) · Duplication of views ([#8450](https://github.com/hcengineering/platform/issues/8450)) · Lookups from array ([#8453](https://github.com/hcengineering/platform/issues/8453)) · Inbound mail attachment upload ([#8472](https://github.com/hcengineering/platform/issues/8472)) · Nested tags ([#8474](https://github.com/hcengineering/platform/issues/8474)) · Office load waiting before joining meeting ([#8484](https://github.com/hcengineering/platform/issues/8484)) · Fix huge statistics send ([#8483](https://github.com/hcengineering/platform/issues/8483)) · Handle token error in collaborator service ([#8493](https://github.com/hcengineering/platform/issues/8493)) · Lookup workspace filter ([#8513](https://github.com/hcengineering/platform/issues/8513)) · Calendar visibility dev ([#8514](https://github.com/hcengineering/platform/issues/8514)) · Card spaces ([#8517](https://github.com/hcengineering/platform/issues/8517)) · Adjust text editor quote and hr styles ([#8524](https://github.com/hcengineering/platform/issues/8524)) · Mentions font-size ([#8526](https://github.com/hcengineering/platform/issues/8526)) · Override script · Calendar migration ([#8531](https://github.com/hcengineering/platform/issues/8531)) · Add error reporting in datalake ([#8535](https://github.com/hcengineering/platform/issues/8535)) · Custom field grouping ([#8538](https://github.com/hcengineering/platform/issues/8538)) · Removed types ([#8544](https://github.com/hcengineering/platform/issues/8544)) · Build for external PRs. ([#8579](https://github.com/hcengineering/platform/issues/8579)) · Handle pong message in presence client ([#8597](https://github.com/hcengineering/platform/issues/8597)) · Append port to s3 endpoint ([#8601](https://github.com/hcengineering/platform/issues/8601)) · TypedSpaces empty owners ([#8574](https://github.com/hcengineering/platform/issues/8574)) · Find for direct persons ([#8632](https://github.com/hcengineering/platform/issues/8632)) · Bot access to send messages under other persons ([#8633](https://github.com/hcengineering/platform/issues/8633)) · Otp admin login ([#8639](https://github.com/hcengineering/platform/issues/8639)) · Show warning of not visited workspace only once ([#8641](https://github.com/hcengineering/platform/issues/8641)) · Region filter in admin panel ([#8646](https://github.com/hcengineering/platform/issues/8646)) · Notifications query ([#8644](https://github.com/hcengineering/platform/issues/8644)) · Threads in new chat ([#8653](https://github.com/hcengineering/platform/issues/8653)) · Related issues query ([#8684](https://github.com/hcengineering/platform/issues/8684)) · Removed cards ([#8694](https://github.com/hcengineering/platform/issues/8694)) · The description of a user creation in dev mode in README ([#8492](https://github.com/hcengineering/platform/issues/8492)) · Increase beforeAll timeout on API tests ([#8707](https://github.com/hcengineering/platform/issues/8707)) · Remove file upload console log ([#8722](https://github.com/hcengineering/platform/issues/8722)) · Add more logs do collaborator doc saving ([#8721](https://github.com/hcengineering/platform/issues/8721)) · Incompatibilities of front files server and datalake ([#8730](https://github.com/hcengineering/platform/issues/8730)) · Adjust media popup styles ([#8724](https://github.com/hcengineering/platform/issues/8724)) · Admin panel show inactive workspaces ([#8716](https://github.com/hcengineering/platform/issues/8716)) · Child card spaces ([#8742](https://github.com/hcengineering/platform/issues/8742)) · Removed types ([#8749](https://github.com/hcengineering/platform/issues/8749)) · Checking for guest in meetings ([#8750](https://github.com/hcengineering/platform/issues/8750)) · Activity for removed tags ([#8761](https://github.com/hcengineering/platform/issues/8761)) · Use front base for datalake ([#8772](https://github.com/hcengineering/platform/issues/8772)) · Datalake pod · Improve backup find tool ([#8783](https://github.com/hcengineering/platform/issues/8783)) · Issue status icon presentation ([#8795](https://github.com/hcengineering/platform/issues/8795)) · Datalake url in dev env ([#8833](https://github.com/hcengineering/platform/issues/8833)) · Messages loading ([#8865](https://github.com/hcengineering/platform/issues/8865)) · Close media popup on meeting leave ([#8877](https://github.com/hcengineering/platform/issues/8877)) · Init workspace in dev ([#8799](https://github.com/hcengineering/platform/issues/8799)) · Undefined error in new chat ([#8892](https://github.com/hcengineering/platform/issues/8892)) · Storage adapter throw error on stat ([#8893](https://github.com/hcengineering/platform/issues/8893)) · Keep snapshots ([#8904](https://github.com/hcengineering/platform/issues/8904)) · Close room popup on stop share ([#8914](https://github.com/hcengineering/platform/issues/8914)) · Custom emojis in reactions ([#8921](https://github.com/hcengineering/platform/issues/8921)) · Adjust embedded video player style ([#8947](https://github.com/hcengineering/platform/issues/8947)) · Communication api config ([#8955](https://github.com/hcengineering/platform/issues/8955)) · Remove datalake extra retries on 404 ([#8962](https://github.com/hcengineering/platform/issues/8962)) · Scheduled events inbox notifications ([#8964](https://github.com/hcengineering/platform/issues/8964)) · Email notifications ([#8978](https://github.com/hcengineering/platform/issues/8978)) · Calendar service ([#8981](https://github.com/hcengineering/platform/issues/8981)) · Processes ([#9014](https://github.com/hcengineering/platform/issues/9014)) · Favorites ([#9020](https://github.com/hcengineering/platform/issues/9020)) · Retry for some kind of errors in Github ([#9055](https://github.com/hcengineering/platform/issues/9055)) · Ts-config to fix ts-server ([#9019](https://github.com/hcengineering/platform/issues/9019)) · Remove analytics from SplitLogger ([#9086](https://github.com/hcengineering/platform/issues/9086)) · Remove duplicate handler errors ([#9084](https://github.com/hcengineering/platform/issues/9084)) · Do not report some datalake errors to analytics ([#9085](https://github.com/hcengineering/platform/issues/9085)) · Space icons ([#9089](https://github.com/hcengineering/platform/issues/9089)) · Backlinks header ([#9107](https://github.com/hcengineering/platform/issues/9107)) · Notification when Request.requested changed ([#9105](https://github.com/hcengineering/platform/issues/9105)) · Everyone/here mentions ([#9109](https://github.com/hcengineering/platform/issues/9109)) · Add recorder assets to desktop ([#9122](https://github.com/hcengineering/platform/issues/9122)) · Prevent closing recording popup ([#9125](https://github.com/hcengineering/platform/issues/9125)) · Add stream to ext services ([#9126](https://github.com/hcengineering/platform/issues/9126)) · Invalid sql query from findAll with empty sort ([#9135](https://github.com/hcengineering/platform/issues/9135)) · Correct filename in content-disposition header ([#9139](https://github.com/hcengineering/platform/issues/9139)) · Do not find for a Card for rank ([#9145](https://github.com/hcengineering/platform/issues/9145)) · Build fix for browser list · Get rid of node-fetch ([#9150](https://github.com/hcengineering/platform/issues/9150)) · Connection reservation logic ([#9153](https://github.com/hcengineering/platform/issues/9153)) · Card parent loop ([#9159](https://github.com/hcengineering/platform/issues/9159)) · Rpc response body size ([#9160](https://github.com/hcengineering/platform/issues/9160)) · Datalake memory leak fixes ([#9161](https://github.com/hcengineering/platform/issues/9161)) · Handle links with spaces in markdown ([#9164](https://github.com/hcengineering/platform/issues/9164)) · Card migration loop ([#9176](https://github.com/hcengineering/platform/issues/9176)) · Rendering of custom attributes without icons ([#9171](https://github.com/hcengineering/platform/issues/9171)) · Services rate limit ([#9193](https://github.com/hcengineering/platform/issues/9193)) · Properly configure keep-alive in datalake HTTP server ([#9198](https://github.com/hcengineering/platform/issues/9198)) · False positive emoji detection ([#9211](https://github.com/hcengineering/platform/issues/9211)) · Image paste in new chat ([#9203](https://github.com/hcengineering/platform/issues/9203)) · Table inplace edit ([#9220](https://github.com/hcengineering/platform/issues/9220)) · Communication migration ([#9228](https://github.com/hcengineering/platform/issues/9228)) · Type properties editor ([#9227](https://github.com/hcengineering/platform/issues/9227)) · Get workspaces mode is missing ([#9237](https://github.com/hcengineering/platform/issues/9237)) · Create transcode topics on start ([#9225](https://github.com/hcengineering/platform/issues/9225)) · Rate limits ([#9242](https://github.com/hcengineering/platform/issues/9242)) · Old token ([#9238](https://github.com/hcengineering/platform/issues/9238)) · Restore in workspace service for old workspaces ([#9241](https://github.com/hcengineering/platform/issues/9241)) · Github migration + few checks ([#9244](https://github.com/hcengineering/platform/issues/9244)) · Ensure workspace and account uuid when generating token ([#9246](https://github.com/hcengineering/platform/issues/9246)) · Github service startup ([#9251](https://github.com/hcengineering/platform/issues/9251)) · Empty workspace uuid when generating token ([#9252](https://github.com/hcengineering/platform/issues/9252)) · Empty comments in github ([#9258](https://github.com/hcengineering/platform/issues/9258)) · Show collaborator connection errors ([#9259](https://github.com/hcengineering/platform/issues/9259)) · Handle processing errors in indexer ([#9262](https://github.com/hcengineering/platform/issues/9262)) · Backup fixes ([#9256](https://github.com/hcengineering/platform/issues/9256)) · Delete markup description from update ([#9269](https://github.com/hcengineering/platform/issues/9269)) · Calendar sync ([#9271](https://github.com/hcengineering/platform/issues/9271)) · Initialize server secret before storage config ([#9274](https://github.com/hcengineering/platform/issues/9274)) · Calendar migration tool ([#9279](https://github.com/hcengineering/platform/issues/9279)) · Emoji input rule ([#9280](https://github.com/hcengineering/platform/issues/9280)) · Error on removing default task states ([#9281](https://github.com/hcengineering/platform/issues/9281)) · Calendar freeze ([#9286](https://github.com/hcengineering/platform/issues/9286)) · Mixin projection ([#9287](https://github.com/hcengineering/platform/issues/9287)) · Restore markup refs corrupted by github ([#9284](https://github.com/hcengineering/platform/issues/9284)) · Integration template values ([#9294](https://github.com/hcengineering/platform/issues/9294)) · Suppress unused regex escaping ([#9299](https://github.com/hcengineering/platform/issues/9299)) · Restore api client functionality ([#9292](https://github.com/hcengineering/platform/issues/9292)) · Team ([#9307](https://github.com/hcengineering/platform/issues/9307)) · Optimize getWorkspaceInfo use ([#9302](https://github.com/hcengineering/platform/issues/9302)) · Check last visit in gmail service ([#9300](https://github.com/hcengineering/platform/issues/9300)) · Notifications read ([#9316](https://github.com/hcengineering/platform/issues/9316)) · Messages to file ([#9319](https://github.com/hcengineering/platform/issues/9319)) · Hide deleted workspaces from select workspace list ([#9337](https://github.com/hcengineering/platform/issues/9337)) · Collaborators tests ([#9331](https://github.com/hcengineering/platform/issues/9331)) · Transcode livekit videos uploaded to s3 ([#9342](https://github.com/hcengineering/platform/issues/9342)) · Adjust video player controls ([#9343](https://github.com/hcengineering/platform/issues/9343)) · Skip communication apply-templates ([#9341](https://github.com/hcengineering/platform/issues/9341)) · Backup service ([#9347](https://github.com/hcengineering/platform/issues/9347)) · Meeting minutes security ([#9348](https://github.com/hcengineering/platform/issues/9348)) · Office empty meeting ([#9353](https://github.com/hcengineering/platform/issues/9353)) · Ignore transcoding for some videos ([#9354](https://github.com/hcengineering/platform/issues/9354)) · Back /api/v1/event/:workspaceId ([#9367](https://github.com/hcengineering/platform/issues/9367)) · Reindex inplace ([#9365](https://github.com/hcengineering/platform/issues/9365)) · New collab presenter ([#9368](https://github.com/hcengineering/platform/issues/9368)) · Collab security ([#9370](https://github.com/hcengineering/platform/issues/9370)) · Secret in billing pod ([#9377](https://github.com/hcengineering/platform/issues/9377)) · Calendar freeze ([#9378](https://github.com/hcengineering/platform/issues/9378)) · Calendar sync ([#9392](https://github.com/hcengineering/platform/issues/9392)) · Adjust live recording ([#9394](https://github.com/hcengineering/platform/issues/9394)) · Meeting minutes activity ([#9395](https://github.com/hcengineering/platform/issues/9395)) · Office preferences ([#9399](https://github.com/hcengineering/platform/issues/9399)) · Calendar flood ([#9405](https://github.com/hcengineering/platform/issues/9405)) · Request camera and microphone once ([#9410](https://github.com/hcengineering/platform/issues/9410)) · Use worker for recording timing ([#9420](https://github.com/hcengineering/platform/issues/9420)) · Miss broadcast for http requests ([#9422](https://github.com/hcengineering/platform/issues/9422)) · Sort model on client ([#9421](https://github.com/hcengineering/platform/issues/9421)) · Properly parse and serialize html link ([#9427](https://github.com/hcengineering/platform/issues/9427)) · Pass cache control from request to created blob ([#9430](https://github.com/hcengineering/platform/issues/9430)) · Use object title as print file name ([#9437](https://github.com/hcengineering/platform/issues/9437)) · Desktop notifications ([#9447](https://github.com/hcengineering/platform/issues/9447)) · Use plyr player for non-hls video ([#9446](https://github.com/hcengineering/platform/issues/9446)) · Card scroll ([#9461](https://github.com/hcengineering/platform/issues/9461)) · Emoji data import for missing locales ([#9442](https://github.com/hcengineering/platform/issues/9442)) · Fix reducedCalls to stop in case of error ([#9482](https://github.com/hcengineering/platform/issues/9482)) · Telegram-bot connect ([#9488](https://github.com/hcengineering/platform/issues/9488)) · Migration ([#9497](https://github.com/hcengineering/platform/issues/9497)) · Configure love recording quality ([#9509](https://github.com/hcengineering/platform/issues/9509)) · Re-enable references in the new chat input ([#9507](https://github.com/hcengineering/platform/issues/9507)) · Communication ([#9520](https://github.com/hcengineering/platform/issues/9520)) · Config ([#9544](https://github.com/hcengineering/platform/issues/9544)) · Calendar serviced and kvs client ([#9551](https://github.com/hcengineering/platform/issues/9551)) · Red dot on new inbox ([#9555](https://github.com/hcengineering/platform/issues/9555)) · Miss config ([#9556](https://github.com/hcengineering/platform/issues/9556)) · Communication refresh ([#9559](https://github.com/hcengineering/platform/issues/9559)) · Navigation buttons visibility on mobile devices ([#9569](https://github.com/hcengineering/platform/issues/9569)) · Grouping error in Execution viewlet configuration ([#9568](https://github.com/hcengineering/platform/issues/9568)) · Fix edit request type ([#9570](https://github.com/hcengineering/platform/issues/9570)) · Show members edit table for department ([#9571](https://github.com/hcengineering/platform/issues/9571)) · Use the same hr style in editor and preview ([#9574](https://github.com/hcengineering/platform/issues/9574)) · Dev elastic healthcheck ([#9576](https://github.com/hcengineering/platform/issues/9576)) · Gmail sync retry ([#9575](https://github.com/hcengineering/platform/issues/9575)) · Messages sync for outdated gmail history id ([#9583](https://github.com/hcengineering/platform/issues/9583)) · Gmail config reset on reboot ([#9587](https://github.com/hcengineering/platform/issues/9587)) · Duplicated gmail sync on startup ([#9590](https://github.com/hcengineering/platform/issues/9590)) · Use system token when saving collaborative doc ([#9592](https://github.com/hcengineering/platform/issues/9592)) · Processes ui ([#9601](https://github.com/hcengineering/platform/issues/9601)) · Cannot find social id error for system ([#9603](https://github.com/hcengineering/platform/issues/9603)) · PayloadTooLargeError in analytics collector ([#9604](https://github.com/hcengineering/platform/issues/9604)) · Calendar ([#9620](https://github.com/hcengineering/platform/issues/9620)) · Model txes order ([#9626](https://github.com/hcengineering/platform/issues/9626)) · Log more stats in datalake ([#9624](https://github.com/hcengineering/platform/issues/9624)) · Broken ui test ([#9629](https://github.com/hcengineering/platform/issues/9629)) · Generate separate bundle for recorder worker ([#9633](https://github.com/hcengineering/platform/issues/9633)) · User mention icon and link previews ([#9635](https://github.com/hcengineering/platform/issues/9635)) · Tracker todo close time tracking ([#9636](https://github.com/hcengineering/platform/issues/9636)) · Notification navigation ([#9642](https://github.com/hcengineering/platform/issues/9642)) · Default gmail port for local setup ([#9650](https://github.com/hcengineering/platform/issues/9650)) · Gmail disconnect error ([#9649](https://github.com/hcengineering/platform/issues/9649)) · Livekit retry counter ([#9651](https://github.com/hcengineering/platform/issues/9651)) · Result editor ([#9653](https://github.com/hcengineering/platform/issues/9653)) · EQMS-1630: Separator resize logic ([#9662](https://github.com/hcengineering/platform/issues/9662)) · Ignore existing blobs in datalake migration ([#9664](https://github.com/hcengineering/platform/issues/9664)) · Notification counter in navigatoir ([#9665](https://github.com/hcengineering/platform/issues/9665)) · Increment join index even for empty result ([#9667](https://github.com/hcengineering/platform/issues/9667)) · Notify about new messages in initial Gmail sync ([#9673](https://github.com/hcengineering/platform/issues/9673)) · Use native bcrypt module ([#9675](https://github.com/hcengineering/platform/issues/9675)) · Huly mail headers format ([#9676](https://github.com/hcengineering/platform/issues/9676)) · Datalake upload fixes ([#9680](https://github.com/hcengineering/platform/issues/9680)) · Allow to edit channels from candidate card ([#9683](https://github.com/hcengineering/platform/issues/9683)) · Inbox ui ([#9688](https://github.com/hcengineering/platform/issues/9688)) · Allow undefined space and fix layout ([#9689](https://github.com/hcengineering/platform/issues/9689)) · Some issues with livekit connection ([#9690](https://github.com/hcengineering/platform/issues/9690)) · Telegram bot ([#9693](https://github.com/hcengineering/platform/issues/9693)) · ParticipantView overflow ([#9694](https://github.com/hcengineering/platform/issues/9694)) · Datalake cache memory leaks ([#9699](https://github.com/hcengineering/platform/issues/9699)) · Properly close iterators ([#9705](https://github.com/hcengineering/platform/issues/9705)) · Limit clone depth ([#9716](https://github.com/hcengineering/platform/issues/9716)) · Direct title ([#9721](https://github.com/hcengineering/platform/issues/9721)) · Set account cookie to origin and target domains ([#9719](https://github.com/hcengineering/platform/issues/9719)) · Notifications ([#9732](https://github.com/hcengineering/platform/issues/9732)) · Reaction notifications ([#9734](https://github.com/hcengineering/platform/issues/9734)) · Navigator ([#9737](https://github.com/hcengineering/platform/issues/9737)) · Load more in Home ([#9739](https://github.com/hcengineering/platform/issues/9739)) · Scroll in the meeting widget ([#9749](https://github.com/hcengineering/platform/issues/9749)) · Calendar rec events ([#9755](https://github.com/hcengineering/platform/issues/9755)) · Push base preview image ([#9756](https://github.com/hcengineering/platform/issues/9756)) · Broadcasting txes with collab security ([#9740](https://github.com/hcengineering/platform/issues/9740)) · Worker docker ([#9760](https://github.com/hcengineering/platform/issues/9760)) · Avatar for system user in Home ([#9762](https://github.com/hcengineering/platform/issues/9762)) · Race condition during lk connection ([#9764](https://github.com/hcengineering/platform/issues/9764)) · Use image/png content type for bot avatar ([#9765](https://github.com/hcengineering/platform/issues/9765)) · Image preview in preview service ([#9767](https://github.com/hcengineering/platform/issues/9767)) · Tags layout in Home ([#9768](https://github.com/hcengineering/platform/issues/9768)) · Thread name display ([#9771](https://github.com/hcengineering/platform/issues/9771)) · Preview text files ([#9773](https://github.com/hcengineering/platform/issues/9773)) · Support transcoding for attachment transactions ([#9775](https://github.com/hcengineering/platform/issues/9775)) 
* ⚙️ MISCELLANEOUS TASKS: · Model · Version · Model ([#8300](https://github.com/hcengineering/platform/issues/8300)) · Communication ([#8422](https://github.com/hcengineering/platform/issues/8422)) · Livekit client ([#8427](https://github.com/hcengineering/platform/issues/8427)) · Update tiptap & hocuspocus ([#8428](https://github.com/hcengineering/platform/issues/8428)) · Communication ([#8436](https://github.com/hcengineering/platform/issues/8436)) · Readme ([#8454](https://github.com/hcengineering/platform/issues/8454)) · Unused green service anymore ([#8480](https://github.com/hcengineering/platform/issues/8480)) · Livekit agent ([#8518](https://github.com/hcengineering/platform/issues/8518)) · Model ([#8522](https://github.com/hcengineering/platform/issues/8522)) · Communication ([#8578](https://github.com/hcengineering/platform/issues/8578)) · Version · API client documentation ([#8832](https://github.com/hcengineering/platform/issues/8832)) · Deprecated types packages from dependencies ([#8856](https://github.com/hcengineering/platform/issues/8856)) · Unstable/unused Github project support ([#8891](https://github.com/hcengineering/platform/issues/8891)) · Github integrations · Model version ([#8963](https://github.com/hcengineering/platform/issues/8963)) · Version ([#9057](https://github.com/hcengineering/platform/issues/9057)) · Node to v22 ([#9151](https://github.com/hcengineering/platform/issues/9151)) · Extra logs ([#9250](https://github.com/hcengineering/platform/issues/9250)) · Communication ([#9340](https://github.com/hcengineering/platform/issues/9340)) · Mongodb from dev setup ([#9336](https://github.com/hcengineering/platform/issues/9336)) · Extra in for contact.mixin.Employee ([#9356](https://github.com/hcengineering/platform/issues/9356)) · Favorite on card removed ([#9364](https://github.com/hcengineering/platform/issues/9364)) · Emoji img margin ([#9471](https://github.com/hcengineering/platform/issues/9471)) · Communication ([#9487](https://github.com/hcengineering/platform/issues/9487)) · Fulltext indexing from non-text fields, index calendar events/todos ([#9493](https://github.com/hcengineering/platform/issues/9493)) · Communication ([#9548](https://github.com/hcengineering/platform/issues/9548)) · Model version · Card trigger ([#9579](https://github.com/hcengineering/platform/issues/9579)) · Extra ([#9582](https://github.com/hcengineering/platform/issues/9582)) · Rush to 158.1 ([#9752](https://github.com/hcengineering/platform/issues/9752)) · Livekit packages ([#9763](https://github.com/hcengineering/platform/issues/9763)) · Card space icon ([#9779](https://github.com/hcengineering/platform/issues/9779)) · Model version · Readme.md 
* ANALYTICS: · Add OAuth authentication and guest access events ([#9541](https://github.com/hcengineering/platform/issues/9541)) 
* BUMP: · Bump few deps with fixes ([#9093](https://github.com/hcengineering/platform/issues/9093)) 
* EQMS-1302: · Fixed RBAC bypass for space / team related wizards and popups (develop port) ([#8979](https://github.com/hcengineering/platform/issues/8979)) 
* EQMS-1406: · Added html doc link presenter for qms docs ([#9382](https://github.com/hcengineering/platform/issues/9382)) 
* EQMS-1411: · Fixed the approval-to-effective status transition in QMS documents ([#8598](https://github.com/hcengineering/platform/issues/8598)) 
* EQMS-1441: · Editable QMS doc reviewers and approvers during requests. ([#8699](https://github.com/hcengineering/platform/issues/8699)) 
* EQMS-1443: · Fixed qms-comments position / decoration mapping (develop branch) ([#8119](https://github.com/hcengineering/platform/issues/8119)) · Fix qms-comments position / decoration mapping ([#8118](https://github.com/hcengineering/platform/issues/8118)) 
* EQMS-1471: · Fixed authorship and ownership semantics & labels in qms to prevent confusion ([#8629](https://github.com/hcengineering/platform/issues/8629)) 
* EQMS-1475: · Space browser for qms documents ([#8668](https://github.com/hcengineering/platform/issues/8668)) 
* EQMS-1484: · Fixed permission checks when sending a QMS document for approval from the Workflow Validation tab ([#8628](https://github.com/hcengineering/platform/issues/8628)) 
* EQMS-1510: · QMS documents now start at version 1.0 instead of 0.1 ([#8669](https://github.com/hcengineering/platform/issues/8669)) 
* EQMS-1524: · Fixed c-state cleanup after state transition in qms docs ([#8697](https://github.com/hcengineering/platform/issues/8697)) 
* EQMS-1537: · Cleanup all review/approval requests on qms doc deletion ([#8790](https://github.com/hcengineering/platform/issues/8790)) 
* EQMS-1541: · Fixes TeamStep in qms document wizard ([#8840](https://github.com/hcengineering/platform/issues/8840)) 
* EQMS-1548: · TraceX desktop app ([#9666](https://github.com/hcengineering/platform/issues/9666)) 
* EQMS-1560: · Fix & migrate duplicate active review/approval requests in qms ([#9062](https://github.com/hcengineering/platform/issues/9062)) 
* EQMS-1561: · Fixed approval/review requests query when switching between documents ([#9059](https://github.com/hcengineering/platform/issues/9059)) 
* EQMS-1569: · Fixed ui crash when editing product members ([#9229](https://github.com/hcengineering/platform/issues/9229)) 
* EQMS-1586: · Fixed training related editable state in qms doc's team tab ([#9282](https://github.com/hcengineering/platform/issues/9282)) 
* EQMS-1587: · Fixed impacted doc list selector in qms ([#9374](https://github.com/hcengineering/platform/issues/9374)) 
* EQMS-1622: · Fixed query for older qms docs in version release trigger ([#9611](https://github.com/hcengineering/platform/issues/9611)) 
* LOVE: · Scaling the floor ([#8145](https://github.com/hcengineering/platform/issues/8145)) · Updated layout of floors and ParticipantView ([#8270](https://github.com/hcengineering/platform/issues/8270)) · Updated ParticipantView layout ([#8287](https://github.com/hcengineering/platform/issues/8287)) · Updated ParticipantView layout ([#8426](https://github.com/hcengineering/platform/issues/8426)) · Fixed the size for avatars ([#8443](https://github.com/hcengineering/platform/issues/8443)) · Correcting the layout ([#8599](https://github.com/hcengineering/platform/issues/8599)) · Updated ParticipantView ([#8811](https://github.com/hcengineering/platform/issues/8811)) 
* OFFICE: · Refactor livekit logic ([#9679](https://github.com/hcengineering/platform/issues/9679)) 
* PLATF-8339: · Allow test project editing(dev) ([#8354](https://github.com/hcengineering/platform/issues/8354)) 
* Q-FIX: · Update communication ([#9524](https://github.com/hcengineering/platform/issues/9524)) 
* QFIX: · Allow mail service to ensure person ([#8140](https://github.com/hcengineering/platform/issues/8140)) · Add mail domain ([#8147](https://github.com/hcengineering/platform/issues/8147)) · (drive) add title providers for files and folders ([#8224](https://github.com/hcengineering/platform/issues/8224)) · Fix duplicated secret env ([#8416](https://github.com/hcengineering/platform/issues/8416)) · Show proper current employee ([#8435](https://github.com/hcengineering/platform/issues/8435)) · Keep alive connections in account client ([#8503](https://github.com/hcengineering/platform/issues/8503)) · Fix default timezone ([#8547](https://github.com/hcengineering/platform/issues/8547)) · Fix gmail history migration ([#8778](https://github.com/hcengineering/platform/issues/8778)) · Added appropriate styling for unavailable mentions ([#8803](https://github.com/hcengineering/platform/issues/8803)) · Add external ws for gmail ([#8910](https://github.com/hcengineering/platform/issues/8910)) · Updated color for disabled mentions ([#8918](https://github.com/hcengineering/platform/issues/8918)) · Add ws dependency to gmail ([#8922](https://github.com/hcengineering/platform/issues/8922)) · Continue processing other workspaces in case of error ([#8923](https://github.com/hcengineering/platform/issues/8923)) · Fix MTA-hook token ([#8954](https://github.com/hcengineering/platform/issues/8954)) · Fix hang in our rate limitter ([#9243](https://github.com/hcengineering/platform/issues/9243)) · Rate limit hello ([#9245](https://github.com/hcengineering/platform/issues/9245)) · Restore old workspaces ([#9260](https://github.com/hcengineering/platform/issues/9260)) · Public links ([#9264](https://github.com/hcengineering/platform/issues/9264)) · Hide achievements until achievement service implementation ([#9266](https://github.com/hcengineering/platform/issues/9266)) · Fix account use in github service ([#9276](https://github.com/hcengineering/platform/issues/9276)) · Find options ([#9290](https://github.com/hcengineering/platform/issues/9290)) · Fix parseMail test ([#9303](https://github.com/hcengineering/platform/issues/9303)) · Fix errors when disabling gmail synchronization  ([#9310](https://github.com/hcengineering/platform/issues/9310)) · Remove unactual tests and mongo-memory-server ([#9345](https://github.com/hcengineering/platform/issues/9345)) · Fixed parsing of trailing parentless text and empty markers in the markdown -> markup converter ([#9360](https://github.com/hcengineering/platform/issues/9360)) · Fix attachments in mail threads ([#9371](https://github.com/hcengineering/platform/issues/9371)) · Statistics contexts ([#9380](https://github.com/hcengineering/platform/issues/9380)) · Fix mail messages order ([#9419](https://github.com/hcengineering/platform/issues/9419)) · Markdown parsing & serialization fixes for images & tables ([#9429](https://github.com/hcengineering/platform/issues/9429)) · Use new hulygun API for mail ([#9426](https://github.com/hcengineering/platform/issues/9426)) · Clean up gmail logs ([#9433](https://github.com/hcengineering/platform/issues/9433)) · Editor toolbar z-index ([#9549](https://github.com/hcengineering/platform/issues/9549)) · Handle Hulygram errors ([#9637](https://github.com/hcengineering/platform/issues/9637)) · Use actual Gmail address ([#9727](https://github.com/hcengineering/platform/issues/9727)) 
* QFIX: · The numbers look like emojis ([#8266](https://github.com/hcengineering/platform/issues/8266)) · ListView header ([#8570](https://github.com/hcengineering/platform/issues/8570)) · Remove dev migrations ([#8651](https://github.com/hcengineering/platform/issues/8651)) · Emoji input detection ([#8927](https://github.com/hcengineering/platform/issues/8927)) · Make github login/signup case insensitive ([#9247](https://github.com/hcengineering/platform/issues/9247)) · Ws filter in fixed tool ([#9291](https://github.com/hcengineering/platform/issues/9291)) · Tg-bot fix typo in token generation and remove mongo ([#9306](https://github.com/hcengineering/platform/issues/9306)) · Fast migration cmd of created/modified by ([#9375](https://github.com/hcengineering/platform/issues/9375)) · Adding/deleting social ids ([#9466](https://github.com/hcengineering/platform/issues/9466)) · Qms tests ([#9557](https://github.com/hcengineering/platform/issues/9557)) · Org space auto join in import ([#9562](https://github.com/hcengineering/platform/issues/9562)) · Calendar user migration ([#9707](https://github.com/hcengineering/platform/issues/9707)) · Do not cache desktop packaging results ([#9708](https://github.com/hcengineering/platform/issues/9708)) · Migrate deleted social ids in calendar events user ([#9709](https://github.com/hcengineering/platform/issues/9709)) 
* UBER-1290: · Fix refresh token in subsequent requests ([#9550](https://github.com/hcengineering/platform/issues/9550)) 
* UBERF-10222: · Fix Github reviews field update ([#9013](https://github.com/hcengineering/platform/issues/9013)) 
* UBERF-10224: · Always include a link target in the markup when rendering (QFix) ([#8566](https://github.com/hcengineering/platform/issues/8566)) 
* UBERF-10248: · Fix timezone loading ([#8586](https://github.com/hcengineering/platform/issues/8586)) · Fix avatar status in compact mode ([#8583](https://github.com/hcengineering/platform/issues/8583)) · Fix local time ([#8623](https://github.com/hcengineering/platform/issues/8623)) · Reduce profile preview size ([#8723](https://github.com/hcengineering/platform/issues/8723)) 
* UBERF-10254: · Manage own social ids ([#9398](https://github.com/hcengineering/platform/issues/9398)) 
* UBERF-10272: · Allow workspace owners to enable/disable modules ([#8638](https://github.com/hcengineering/platform/issues/8638)) 
* UBERF-10303: · Always sign up with OTP ([#8665](https://github.com/hcengineering/platform/issues/8665)) 
* UBERF-10346: · Combined ensure person ([#8701](https://github.com/hcengineering/platform/issues/8701)) 
* UBERF-10368: · Fix direct create ([#8760](https://github.com/hcengineering/platform/issues/8760)) 
* UBERF-10375: · Fix full email messages sync ([#8758](https://github.com/hcengineering/platform/issues/8758)) 
* UBERF-10376: · Allow todos filtering ([#8729](https://github.com/hcengineering/platform/issues/8729)) 
* UBERF-10386: · Fix SES client ([#8737](https://github.com/hcengineering/platform/issues/8737)) 
* UBERF-10407: · Fix Team display ([#8762](https://github.com/hcengineering/platform/issues/8762)) 
* UBERF-10408: · New gmail integration ([#8869](https://github.com/hcengineering/platform/issues/8869)) 
* UBERF-10412: · Make rate limit less aggressive ([#8765](https://github.com/hcengineering/platform/issues/8765)) 
* UBERF-10413: · Fix update of %hash% and update migration ([#8771](https://github.com/hcengineering/platform/issues/8771)) 
* UBERF-10417: · Corrected red and green colors, icons ([#8808](https://github.com/hcengineering/platform/issues/8808)) 
* UBERF-10418: · Removed empty popup in the user's personal room ([#8775](https://github.com/hcengineering/platform/issues/8775)) 
* UBERF-10441: · Fix configure and board item displayed ([#8789](https://github.com/hcengineering/platform/issues/8789)) 
* UBERF-10471: · Fix Github miss status updates and allow to re-integrate existing repos ([#8842](https://github.com/hcengineering/platform/issues/8842)) 
* UBERF-10491: · Fix gmail client duplicates ([#8837](https://github.com/hcengineering/platform/issues/8837)) 
* UBERF-10499: · Fix team planner ([#8847](https://github.com/hcengineering/platform/issues/8847)) 
* UBERF-10523: · Fixes for backup/compact ([#8888](https://github.com/hcengineering/platform/issues/8888)) 
* UBERF-10525: · Update MTA-hook integration ([#8925](https://github.com/hcengineering/platform/issues/8925)) 
* UBERF-10550: · Support internal endpoint in getLoginInfoByToken ([#8902](https://github.com/hcengineering/platform/issues/8902)) 
* UBERF-10555: · Fix gmail migration ([#8900](https://github.com/hcengineering/platform/issues/8900)) 
* UBERF-10557: · Use communication queue ([#8993](https://github.com/hcengineering/platform/issues/8993)) 
* UBERF-10590: · Suport disabled integrations ([#8937](https://github.com/hcengineering/platform/issues/8937)) 
* UBERF-10593: · Fix MTA hook and reuse clients ([#8938](https://github.com/hcengineering/platform/issues/8938)) 
* UBERF-10599: · Fix ws not found in gmail ([#8943](https://github.com/hcengineering/platform/issues/8943)) 
* UBERF-10631: · Fix attachments in old gmail integration ([#8971](https://github.com/hcengineering/platform/issues/8971)) 
* UBERF-10632: · Fix email thread creation date ([#8968](https://github.com/hcengineering/platform/issues/8968)) 
* UBERF-10637: · Fix duplication on github with few integerations added ([#8970](https://github.com/hcengineering/platform/issues/8970)) 
* UBERF-10653: · Handle gmail integration errors ([#8985](https://github.com/hcengineering/platform/issues/8985)) 
* UBERF-10664: · Fix person preview ([#8995](https://github.com/hcengineering/platform/issues/8995)) 
* UBERF-10669: · Fix email channel duplicates ([#8996](https://github.com/hcengineering/platform/issues/8996)) 
* UBERF-10672: · Fix person duplicates ([#9004](https://github.com/hcengineering/platform/issues/9004)) 
* UBERF-10691: · Fix user selection component to not miss selection ([#9017](https://github.com/hcengineering/platform/issues/9017)) 
* UBERF-10741: · The application name has been corrected and the Customize label has been added ([#9056](https://github.com/hcengineering/platform/issues/9056)) 
* UBERF-10925: · Save gmail messages only for integration owner ([#9061](https://github.com/hcengineering/platform/issues/9061)) 
* UBERF-11004: · Fix mta-hook email content parsing ([#9066](https://github.com/hcengineering/platform/issues/9066)) 
* UBERF-11067: · Fix html to md conversion for complex links ([#9070](https://github.com/hcengineering/platform/issues/9070)) 
* UBERF-11111: · Add retry package ([#9081](https://github.com/hcengineering/platform/issues/9081)) 
* UBERF-11156: · Decode encoded mail content and subject ([#9157](https://github.com/hcengineering/platform/issues/9157)) 
* UBERF-11175: · Fix new person names in mail ([#9094](https://github.com/hcengineering/platform/issues/9094)) 
* UBERF-11203: · Display address in gmail integration ([#9095](https://github.com/hcengineering/platform/issues/9095)) 
* UBERF-11206: · Few fixes related to Github sync ([#9102](https://github.com/hcengineering/platform/issues/9102)) · Few more fixes related to Github ([#9117](https://github.com/hcengineering/platform/issues/9117)) 
* UBERF-11233: · Fix non-confirmed sign-up/login flow ([#9108](https://github.com/hcengineering/platform/issues/9108)) 
* UBERF-11239: · Fix multipart content in mta-hook ([#9110](https://github.com/hcengineering/platform/issues/9110)) 
* UBERF-11342: · Fix race conditions handling in mail sync mutex ([#9111](https://github.com/hcengineering/platform/issues/9111)) 
* UBERF-11347: · Fix gmail recipients ([#9115](https://github.com/hcengineering/platform/issues/9115)) 
* UBERF-11383: · Fix gmail push processing ([#9127](https://github.com/hcengineering/platform/issues/9127)) 
* UBERF-11392: · Fixes to statistics ([#9138](https://github.com/hcengineering/platform/issues/9138)) 
* UBERF-11398: · Fixing rate limits ([#9143](https://github.com/hcengineering/platform/issues/9143)) 
* UBERF-11411: · Add communication threads for emails ([#9156](https://github.com/hcengineering/platform/issues/9156)) 
* UBERF-11414: · Integrations ([#9610](https://github.com/hcengineering/platform/issues/9610)) 
* UBERF-11415: · Optimise contact UI stores ([#9185](https://github.com/hcengineering/platform/issues/9185)) 
* UBERF-11423: · Fix attachments in emails ([#9166](https://github.com/hcengineering/platform/issues/9166)) 
* UBERF-11451: · Replace ses service with notification service ([#9200](https://github.com/hcengineering/platform/issues/9200)) 
* UBERF-11529: · Fix parseMail test ([#9255](https://github.com/hcengineering/platform/issues/9255)) 
* UBERF-11533: · Speed up gmail migration ([#9257](https://github.com/hcengineering/platform/issues/9257)) 
* UBERF-11586: · Fix gmail migration ([#9277](https://github.com/hcengineering/platform/issues/9277)) 
* UBERF-11657: · Better handling of disabled employees ([#9389](https://github.com/hcengineering/platform/issues/9389)) 
* UBERF-11712: · Rework communication integration ([#9335](https://github.com/hcengineering/platform/issues/9335)) 
* UBERF-11769: · Adjust gmail for communication updates ([#9346](https://github.com/hcengineering/platform/issues/9346)) · Fix messages order in mail thread ([#9350](https://github.com/hcengineering/platform/issues/9350)) 
* UBERF-11786: · Do not notify about old emails ([#9352](https://github.com/hcengineering/platform/issues/9352)) 
* UBERF-11998: · Support account deletion from admin page ([#9441](https://github.com/hcengineering/platform/issues/9441)) 
* UBERF-12146: · Fix queries with lookup conditions ([#9495](https://github.com/hcengineering/platform/issues/9495)) 
* UBERF-12149: · Fix email send with irrelevant social id ([#9452](https://github.com/hcengineering/platform/issues/9452)) 
* UBERF-12214: · Fix GitHub assignee update ([#9515](https://github.com/hcengineering/platform/issues/9515)) 
* UBERF-12227: · Stabilize UI tests ([#9521](https://github.com/hcengineering/platform/issues/9521)) 
* UBERF-12229: · Fix default gmail integration selection ([#9486](https://github.com/hcengineering/platform/issues/9486)) 
* UBERF-12299: · Fix gmail integration selection ([#9505](https://github.com/hcengineering/platform/issues/9505)) 
* UBERF-12313: · Pass editor-kit options in StyledTextBox ([#9512](https://github.com/hcengineering/platform/issues/9512)) 
* UBERF-12323: · Include accounts info into backup ([#9659](https://github.com/hcengineering/platform/issues/9659)) 
* UBERF-12325: · Add mongo warning for v7 ([#9543](https://github.com/hcengineering/platform/issues/9543)) 
* UBERF-12445: · Fix adding second Github integration for same user ([#9531](https://github.com/hcengineering/platform/issues/9531)) 
* UBERF-12509: · Trusted accounts migration tool ([#9652](https://github.com/hcengineering/platform/issues/9652)) 
* UBERF-12633: · Fix GH local identities ([#9566](https://github.com/hcengineering/platform/issues/9566)) 
* UBERF-12966: · Send messages from Gmail threads ([#9657](https://github.com/hcengineering/platform/issues/9657)) 
* UBERF-12970: · Migrate integrations data ([#9640](https://github.com/hcengineering/platform/issues/9640)) 
* UBERF-12988: · Add integration status and redesign integration state ([#9643](https://github.com/hcengineering/platform/issues/9643)) 
* UBERF-13118: · Send emails from Huly mail threads ([#9669](https://github.com/hcengineering/platform/issues/9669)) 
* UBERF-13120: · Support SMTP mail for different accounts ([#9674](https://github.com/hcengineering/platform/issues/9674)) 
* UBERF-13123: · Fix mail message duplicates ([#9684](https://github.com/hcengineering/platform/issues/9684)) 
* UBERF-13124: · Format hulygram phone number ([#9686](https://github.com/hcengineering/platform/issues/9686)) 
* UBERF-13241: · Support gmail space config ([#9710](https://github.com/hcengineering/platform/issues/9710)) 
* UBERF-13271: · Add Huly mail integration ([#9722](https://github.com/hcengineering/platform/issues/9722)) 
* UBERF-13383: · Guest access token ([#9747](https://github.com/hcengineering/platform/issues/9747)) 
* UBERF-13430: · Display date and space for cards in Home ([#9759](https://github.com/hcengineering/platform/issues/9759)) 
* UBERF-13433: · Migrate channels to threads ([#9761](https://github.com/hcengineering/platform/issues/9761)) 
* UBERF-13485: · Restore v6 from storage tool ([#9777](https://github.com/hcengineering/platform/issues/9777)) 
* UBERF-8425: · Speed up accounts migration ([#8994](https://github.com/hcengineering/platform/issues/8994)) · More adjustments for migration scripts and tools ([#9099](https://github.com/hcengineering/platform/issues/9099)) · Improve parallel ws upgrade logging within one ws service ([#9118](https://github.com/hcengineering/platform/issues/9118)) · Improved pg/acc/ws error handling ([#9144](https://github.com/hcengineering/platform/issues/9144)) · Fix account upgrade deadlocks ([#9163](https://github.com/hcengineering/platform/issues/9163)) 
* UBERF-8522: · Allow to use any assignee for github projects ([#8179](https://github.com/hcengineering/platform/issues/8179)) 
* UBERF-9126: · Drive plugins + init version of screen recorder ([#8126](https://github.com/hcengineering/platform/issues/8126)) 
* UBERF-9500: · Fix indexing on staging ([#8231](https://github.com/hcengineering/platform/issues/8231)) 
* UBERF-9502: · Account uuids in models ([#8125](https://github.com/hcengineering/platform/issues/8125)) 
* UBERF-9503: · Generated social ids ([#8208](https://github.com/hcengineering/platform/issues/8208)) 
* UBERF-9504: · Add role to employee mixin ([#8072](https://github.com/hcengineering/platform/issues/8072)) 
* UBERF-9516: · Disable my space and use standard presenters ([#8114](https://github.com/hcengineering/platform/issues/8114)) 
* UBERF-9521: · Refactor session manager ([#8560](https://github.com/hcengineering/platform/issues/8560)) 
* UBERF-9537: · Fix Invalid navigate to guest not authorised ([#8121](https://github.com/hcengineering/platform/issues/8121)) 
* UBERF-9540: · Fix invite message and add rate limit ([#8123](https://github.com/hcengineering/platform/issues/8123)) 
* UBERF-9542: · Add mail service with SMTP and SES support ([#8130](https://github.com/hcengineering/platform/issues/8130)) 
* UBERF-9543: · Restore-all tool ([#8132](https://github.com/hcengineering/platform/issues/8132)) 
* UBERF-9550: · Add backup with verify ([#8137](https://github.com/hcengineering/platform/issues/8137)) · Fix backup verification memory usage ([#8138](https://github.com/hcengineering/platform/issues/8138)) 
* UBERF-9551: · Add web push URL ([#8133](https://github.com/hcengineering/platform/issues/8133)) 
* UBERF-9557: · Support attachments in mail service ([#8139](https://github.com/hcengineering/platform/issues/8139)) 
* UBERF-9559: · Make CR accounts migrations concurrency safe ([#8821](https://github.com/hcengineering/platform/issues/8821)) 
* UBERF-9560: · Filter query fixes 
* UBERF-9568: · Fix person space filter ([#8183](https://github.com/hcengineering/platform/issues/8183)) 
* UBERF-9569: · Fix hanging transactor connections ([#8152](https://github.com/hcengineering/platform/issues/8152)) 
* UBERF-9575: · Fix filter disappear problem ([#8159](https://github.com/hcengineering/platform/issues/8159)) 
* UBERF-9577: · Fix using default from address in emails ([#8163](https://github.com/hcengineering/platform/issues/8163)) 
* UBERF-9578: · The correct display of the user's personal avatar in Direct messages. ([#8595](https://github.com/hcengineering/platform/issues/8595)) 
* UBERF-9604: · Add edit permission check per row in Table ([#8528](https://github.com/hcengineering/platform/issues/8528)) 
* UBERF-9605: · Test MTA hook integration ([#8189](https://github.com/hcengineering/platform/issues/8189)) 
* UBERF-9606: · Limit a number of workspaces per user ([#8192](https://github.com/hcengineering/platform/issues/8192)) ([#8199](https://github.com/hcengineering/platform/issues/8199)) 
* UBERF-9624: · Add card viewlet settings ([#8258](https://github.com/hcengineering/platform/issues/8258)) 
* UBERF-9633: · Reduce migration calls during workspace creation ([#8242](https://github.com/hcengineering/platform/issues/8242)) ([#8244](https://github.com/hcengineering/platform/issues/8244)) · More proper fix ([#8249](https://github.com/hcengineering/platform/issues/8249)) 
* UBERF-9636: · Meeting links ([#8334](https://github.com/hcengineering/platform/issues/8334)) · Meeting links - more cases ([#8369](https://github.com/hcengineering/platform/issues/8369)) 
* UBERF-9639: · Master-detail view for cards ([#8413](https://github.com/hcengineering/platform/issues/8413)) 
* UBERF-9661: · Use MAIL_URL env for mail integration ([#8272](https://github.com/hcengineering/platform/issues/8272)) 
* UBERF-9693: · Allow to reindex from migration ([#8345](https://github.com/hcengineering/platform/issues/8345)) 
* UBERF-9694: · Queue processing improvements ([#8418](https://github.com/hcengineering/platform/issues/8418)) 
* UBERF-9698: · Fix identity swap issue ([#8360](https://github.com/hcengineering/platform/issues/8360)) 
* UBERF-9703: · Profile cards for persons ([#8410](https://github.com/hcengineering/platform/issues/8410)) 
* UBERF-9705: · Fix issues labels add remove ([#8373](https://github.com/hcengineering/platform/issues/8373)) 
* UBERF-9710: · Fix always on status on front ([#8391](https://github.com/hcengineering/platform/issues/8391)) 
* UBERF-9711: · Add by region groupping for admin console ([#8396](https://github.com/hcengineering/platform/issues/8396)) 
* UBERF-9712: · Improve mail TLS settings and logs for self hosters ([#8399](https://github.com/hcengineering/platform/issues/8399)) ([#8400](https://github.com/hcengineering/platform/issues/8400)) 
* UBERF-9714: · Support subsecutive meeting joins ([#8421](https://github.com/hcengineering/platform/issues/8421)) 
* UBERF-9716: · New profile preview and initial achievements ([#8504](https://github.com/hcengineering/platform/issues/8504)) 
* UBERF-9724: · Use updated accounts ([#8452](https://github.com/hcengineering/platform/issues/8452)) · Fix github functionality on 0.7 ([#8554](https://github.com/hcengineering/platform/issues/8554)) 
* UBERF-9726: · Fix integrations in accounts for CR 24.1 ([#8490](https://github.com/hcengineering/platform/issues/8490)) 
* UBERF-9732: · Use huly id as primary social id ([#8499](https://github.com/hcengineering/platform/issues/8499)) 
* UBERF-9734: · Set default account timezone ([#8469](https://github.com/hcengineering/platform/issues/8469)) 
* UBERF-9736: · Fix backup hang ([#8468](https://github.com/hcengineering/platform/issues/8468)) 
* UBERF-9739: · Try to fix backup hang ([#8496](https://github.com/hcengineering/platform/issues/8496)) 
* UBERF-9740: · Send mail errors to Sentry ([#8481](https://github.com/hcengineering/platform/issues/8481)) 
* UBERF-9748: · Refactor server-ws ([#8495](https://github.com/hcengineering/platform/issues/8495)) 
* UBERF-9752: · Properly handle streams to avoid datalake memory leak ([#8502](https://github.com/hcengineering/platform/issues/8502)) 
* UBERF-9756: · Speed up CR account migrations ([#8573](https://github.com/hcengineering/platform/issues/8573)) 
* UBERF-9764: · Adjust gmail for new accounts ([#8681](https://github.com/hcengineering/platform/issues/8681)) 
* UBERF-13261: · Improve office UX ([#9733](https://github.com/hcengineering/platform/issues/9733)) 
* UBERF-9663: · Improve mail logging ([#8275](https://github.com/hcengineering/platform/issues/8275)) 
* ANALYTICS: · Add IP headers collection for geo debugging and session tracking ([#9648](https://github.com/hcengineering/platform/issues/9648)) 
* EQMS-1533: · Fix template versions query ([#8753](https://github.com/hcengineering/platform/issues/8753)) ([#8766](https://github.com/hcengineering/platform/issues/8766)) 
* EQMS-1548: · Fix linux dist for desktop ([#9670](https://github.com/hcengineering/platform/issues/9670)) 
* EQMS-1576: · Hide region in ws selector for a regular user ([#9231](https://github.com/hcengineering/platform/issues/9231)) 
* EQMS-1582: · Fix roles migration ([#9230](https://github.com/hcengineering/platform/issues/9230)) 
* QFIX: · ListView, Table ([#9213](https://github.com/hcengineering/platform/issues/9213)) 
* QFIX: · Add missed recorderId for desktop ([#8172](https://github.com/hcengineering/platform/issues/8172)) · Fix url for recording videos ([#8174](https://github.com/hcengineering/platform/issues/8174)) · Remove cf workers to fix ci/build on develop branch ([#8226](https://github.com/hcengineering/platform/issues/8226)) · Fix issues with hls player ([#8268](https://github.com/hcengineering/platform/issues/8268)) · Upload a folder produces duplicates ([#8269](https://github.com/hcengineering/platform/issues/8269)) · Add support for recording videos from desktop ([#8306](https://github.com/hcengineering/platform/issues/8306)) · Disable mixins migration · Ignore ancestor error for txremovedoc ([#9267](https://github.com/hcengineering/platform/issues/9267)) · Backup recheck ([#9288](https://github.com/hcengineering/platform/issues/9288)) · Backup info cors ([#9308](https://github.com/hcengineering/platform/issues/9308)) · Property pass context with OnThreadMessageCreated ([#9311](https://github.com/hcengineering/platform/issues/9311)) · Backup download skip support ([#9312](https://github.com/hcengineering/platform/issues/9312)) · Tune backup limits ([#9381](https://github.com/hcengineering/platform/issues/9381)) · Use a fulltext queue for blocked ops ([#9388](https://github.com/hcengineering/platform/issues/9388)) · Update last visit · Update last visit ([#9401](https://github.com/hcengineering/platform/issues/9401)) · Get pending data id ([#9402](https://github.com/hcengineering/platform/issues/9402)) · Increment attempts on restore retry ([#9403](https://github.com/hcengineering/platform/issues/9403)) · Account unit test ([#9409](https://github.com/hcengineering/platform/issues/9409)) · Allow tool to create workspace with dataid for testing ([#9404](https://github.com/hcengineering/platform/issues/9404)) · Backups using pipeline ([#9396](https://github.com/hcengineering/platform/issues/9396)) · Refactor love plugin to not import . ([#9413](https://github.com/hcengineering/platform/issues/9413)) · Backup blob info ([#9496](https://github.com/hcengineering/platform/issues/9496)) · Connection mgr close ([#9502](https://github.com/hcengineering/platform/issues/9502)) · Remap github installation to another workspace ([#9553](https://github.com/hcengineering/platform/issues/9553)) · Allow backup api to be used by admin ([#9560](https://github.com/hcengineering/platform/issues/9560)) · Fix export service ([#9558](https://github.com/hcengineering/platform/issues/9558)) · Add Logs/metrics to telemetry ([#9595](https://github.com/hcengineering/platform/issues/9595)) · Remove sentry on server ([#9597](https://github.com/hcengineering/platform/issues/9597)) · A better fulltext service logs ([#9606](https://github.com/hcengineering/platform/issues/9606)) · Rework span creation ([#9613](https://github.com/hcengineering/platform/issues/9613)) · Connect timeout + service ws info cache ([#9622](https://github.com/hcengineering/platform/issues/9622)) · Backward compatible multiple desktop updates channels ([#9687](https://github.com/hcengineering/platform/issues/9687)) · Show space for document's ([#9701](https://github.com/hcengineering/platform/issues/9701)) · Filter content for admin in case person is present in workspace ([#9720](https://github.com/hcengineering/platform/issues/9720)) · Update traces send to opentelemetry ([#9728](https://github.com/hcengineering/platform/issues/9728)) · Docker config mem usage ([#9745](https://github.com/hcengineering/platform/issues/9745)) 
* SELFH-182: · Add v7 tools for migration from v6 ([#9678](https://github.com/hcengineering/platform/issues/9678)) 
* SELFH-195: · Generate uuid for workspaces where missing ([#9751](https://github.com/hcengineering/platform/issues/9751)) 
* TOOL: · Reindex all workspaces ([#9249](https://github.com/hcengineering/platform/issues/9249)) 
* TXU-105: · Fix model lookups ([#8386](https://github.com/hcengineering/platform/issues/8386)) 
* UBERF-10222: · Add logging ([#8709](https://github.com/hcengineering/platform/issues/8709)) 
* UBERF-10227: · Fix createdOn type in getUserWorkspaces ([#8584](https://github.com/hcengineering/platform/issues/8584)) 
* UBERF-10228: · Expose release social id to services ([#8562](https://github.com/hcengineering/platform/issues/8562)) 
* UBERF-10252: · Fix collaborators activity presenter ([#8594](https://github.com/hcengineering/platform/issues/8594)) 
* UBERF-10255: · Migrate accounts in saved filters ([#8846](https://github.com/hcengineering/platform/issues/8846)) 
* UBERF-10308: · Adjust onboarding ([#8949](https://github.com/hcengineering/platform/issues/8949)) 
* UBERF-10318: · Fix push subscriptions ([#8666](https://github.com/hcengineering/platform/issues/8666)) 
* UBERF-10342: · Fix init script executor ([#8702](https://github.com/hcengineering/platform/issues/8702)) 
* UBERF-10454: · Support ensure person by system user ([#8807](https://github.com/hcengineering/platform/issues/8807)) 
* UBERF-10455: · Merge accounts for merged persons ([#8942](https://github.com/hcengineering/platform/issues/8942)) 
* UBERF-10488: · Allow ws limit per account ([#8864](https://github.com/hcengineering/platform/issues/8864)) 
* UBERF-10626: · Fix social identity duplicate key exception ([#8969](https://github.com/hcengineering/platform/issues/8969)) 
* UBERF-10649: · Fix last visit for stale workspaces ([#8999](https://github.com/hcengineering/platform/issues/8999)) 
* UBERF-11415: · Person cache unit tests ([#9202](https://github.com/hcengineering/platform/issues/9202)) 
* UBERF-11651: · Fix huly id confirmation for dev setup ([#9296](https://github.com/hcengineering/platform/issues/9296)) 
* UBERF-11798: · Win arm build ([#9366](https://github.com/hcengineering/platform/issues/9366)) 
* UBERF-12170: · Support merging person in addSocialIdToPerson ([#9470](https://github.com/hcengineering/platform/issues/9470)) 
* UBERF-12632: · Fix profile name change ([#9691](https://github.com/hcengineering/platform/issues/9691)) 
* UBERF-8425: · Retry tx account ([#9133](https://github.com/hcengineering/platform/issues/9133)) · Improve account methods params checks ([#9278](https://github.com/hcengineering/platform/issues/9278)) · Fix created-modified owners tool ([#9283](https://github.com/hcengineering/platform/issues/9283)) 
* UBERF-9485: · Fix state description save ([#9483](https://github.com/hcengineering/platform/issues/9483)) 
* UBERF-9488: · Account operations unit tests ([#9503](https://github.com/hcengineering/platform/issues/9503)) 
* UBERF-9530: · Support old guest link ([#8506](https://github.com/hcengineering/platform/issues/8506)) 
* UBERF-9534: · Ensure person ([#8117](https://github.com/hcengineering/platform/issues/8117)) 
* UBERF-9571: · Fix empty threads ([#8153](https://github.com/hcengineering/platform/issues/8153)) 
* UBERF-9603: · Fix account rename ([#8371](https://github.com/hcengineering/platform/issues/8371)) 
* UBERF-9670: · Fix reply avatars ([#8302](https://github.com/hcengineering/platform/issues/8302)) 
* UBERF-9671: · Fix gh accounts migration ([#8308](https://github.com/hcengineering/platform/issues/8308)) 
* UBERF-9691: · Expose full social ids in own account ([#8340](https://github.com/hcengineering/platform/issues/8340)) 
* UBERF-9713: · Fix auto join condition ([#8404](https://github.com/hcengineering/platform/issues/8404)) 
* UBERF-9725: · Fix accounts mismatch in plugins config ([#8430](https://github.com/hcengineering/platform/issues/8430)) 
* UBERF-9726: · Manage integrations in accounts ([#8475](https://github.com/hcengineering/platform/issues/8475)) 
* UBERF-9727: · Allow adding social id to existing person ([#8439](https://github.com/hcengineering/platform/issues/8439)) 
* UBERF-9754: · Fix account timestamp ([#8520](https://github.com/hcengineering/platform/issues/8520)) 
* UBERF-9797: · Idp auth state ([#9196](https://github.com/hcengineering/platform/issues/9196)) 

## [0.6.458] - 2025-02-27

* 🐛 BUG FIXES: · Join ([#8105](https://github.com/hcengineering/platform/issues/8105)) · Fix REST API + few minors ([#8108](https://github.com/hcengineering/platform/issues/8108)) 

## [0.6.457] - 2025-02-27

* 🐛 BUG FIXES: · Calendar ([#8104](https://github.com/hcengineering/platform/issues/8104)) 

## [0.6.456] - 2025-02-26

* 🐛 BUG FIXES: · Relations ([#8097](https://github.com/hcengineering/platform/issues/8097)) 
* UBERF-9513: · Support model operations ([#8100](https://github.com/hcengineering/platform/issues/8100)) 
* UBERF-9522: · Fix memory backpressure ([#8098](https://github.com/hcengineering/platform/issues/8098)) 

## [0.6.455] - 2025-02-25

* 🐛 BUG FIXES: · Issues status order ([#8095](https://github.com/hcengineering/platform/issues/8095)) 

## [0.6.454] - 2025-02-24

* EQMS-1451/1453/1455: · Reference tweaks for QMS documents ([#8083](https://github.com/hcengineering/platform/issues/8083)) 
* UBERF-9511: · Allow to unarchive workspace by user request ([#8084](https://github.com/hcengineering/platform/issues/8084)) 

## [0.6.453] - 2025-02-24

* 🐛 BUG FIXES: · Filter props on component update ([#8080](https://github.com/hcengineering/platform/issues/8080)) 

## [0.6.452] - 2025-02-24

* 🚀 FEATURES: · Cookie token ([#8057](https://github.com/hcengineering/platform/issues/8057)) 
* 🐛 BUG FIXES: · Status order ([#8067](https://github.com/hcengineering/platform/issues/8067)) · Status order ([#8070](https://github.com/hcengineering/platform/issues/8070)) · HideAdd does not prevent adding by keyboard on TagsPopup ([#7246](https://github.com/hcengineering/platform/issues/7246)) · Build ([#8079](https://github.com/hcengineering/platform/issues/8079)) · Filter props on component update ([#8080](https://github.com/hcengineering/platform/issues/8080)) · Extract video player to separate component ([#8086](https://github.com/hcengineering/platform/issues/8086)) · Relations ([#8102](https://github.com/hcengineering/platform/issues/8102)) · Calendar push handler and remove unused client management ([#8078](https://github.com/hcengineering/platform/issues/8078)) 
* 📚 DOCUMENTATION: · Add API client documentation reference ([#8099](https://github.com/hcengineering/platform/issues/8099)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#6984](https://github.com/hcengineering/platform/issues/6984)) 
* UBERF-9501: · Fix use of Date.now() ([#8069](https://github.com/hcengineering/platform/issues/8069)) 
* UBERF-9516: · Use cards for mail threads ([#8088](https://github.com/hcengineering/platform/issues/8088)) 

## [0.6.450] - 2025-02-20

* 🚀 FEATURES: · TRANSACTOR_OVERRIDE in front service 
* 🐛 BUG FIXES: · Limit tooltip size for left and right location ([#8055](https://github.com/hcengineering/platform/issues/8055)) · Max width for left tooltip position ([#8064](https://github.com/hcengineering/platform/issues/8064)) 
* EQMS-1437: · Use different label to display trainees' results "owner". ([#8046](https://github.com/hcengineering/platform/issues/8046)) 
* EQMS-1440: · Disable delayed qms doc effectiveness and review interval ([#8049](https://github.com/hcengineering/platform/issues/8049)) 
* UBERF-8545: · Fix links in readonly documents ([#8050](https://github.com/hcengineering/platform/issues/8050)) 
* UBERF-9144: · Stay in same view after delete sub-issue ([#8051](https://github.com/hcengineering/platform/issues/8051)) 
* UBERF-9334: · Fixed ActionContext managment ([#8047](https://github.com/hcengineering/platform/issues/8047)) 
* UBERF-9488: · More account unit tests ([#8058](https://github.com/hcengineering/platform/issues/8058)) 
* UBERF-9488: · Part of account unit tests ([#8054](https://github.com/hcengineering/platform/issues/8054)) 
* UBERF-9492: · Allow restricting hostnames for print service ([#8059](https://github.com/hcengineering/platform/issues/8059)) 

## [0.6.449] - 2025-02-18

* 🐛 BUG FIXES: · Use workspace uuid in front service ([#8024](https://github.com/hcengineering/platform/issues/8024)) · Allow to copy workspace uuid from admin ([#8025](https://github.com/hcengineering/platform/issues/8025)) · Fix missing SES_AUTH_TOKEN ([#8026](https://github.com/hcengineering/platform/issues/8026)) 
* CF: · Transactor fixes ([#8045](https://github.com/hcengineering/platform/issues/8045)) 
* EQMS-1435: · Enable watermark in obsolete documents ([#8032](https://github.com/hcengineering/platform/issues/8032)) 
* EQMS-1445: · Fixed qms doc commments theme styling ([#8031](https://github.com/hcengineering/platform/issues/8031)) 
* UBERF-9297: · Fix space selection for emails ([#8035](https://github.com/hcengineering/platform/issues/8035)) · Store smtp mail id ([#8044](https://github.com/hcengineering/platform/issues/8044)) 
* UBERF-9400: · Show name on login screen ([#8013](https://github.com/hcengineering/platform/issues/8013)) 
* UBERF-9458: · OTP sign up ([#8043](https://github.com/hcengineering/platform/issues/8043)) 
* UBERF-9489: · Fixes and cleanup ([#8048](https://github.com/hcengineering/platform/issues/8048)) 
* UBERF-9394: · Adjust readme to account changes ([#8030](https://github.com/hcengineering/platform/issues/8030)) 
* UBERF-9428: · Migrate accounts with multiple active services ([#8027](https://github.com/hcengineering/platform/issues/8027)) 
* UBERF-9451: · Drop old tokens from local storage ([#8028](https://github.com/hcengineering/platform/issues/8028)) 

## [0.6.448] - 2025-02-17

* 🐛 BUG FIXES: · Pnpm lock file · Svelte-check merge issue · Create employee case senstive ([#8004](https://github.com/hcengineering/platform/issues/8004)) · Handle token decode errors ([#8018](https://github.com/hcengineering/platform/issues/8018)) · Use workspace uuid in image and blob links ([#8019](https://github.com/hcengineering/platform/issues/8019)) · Do not display empty link preview in case of file error ([#8020](https://github.com/hcengineering/platform/issues/8020)) 
* QFIX: · Pass extra token details in selectWorkspace ([#8010](https://github.com/hcengineering/platform/issues/8010)) · Load spinner ([#8014](https://github.com/hcengineering/platform/issues/8014)) 
* UBERF-8425: · Fix get pending workspace on CR ([#8009](https://github.com/hcengineering/platform/issues/8009)) 
* UBERF-9429: · Provide workspace ids to storage adapters ([#7956](https://github.com/hcengineering/platform/issues/7956)) 
* UBERF-9479: · Fix adapter security selection ([#8007](https://github.com/hcengineering/platform/issues/8007)) 
* UBERF-9484: · Fix findAll for PG driver ([#8022](https://github.com/hcengineering/platform/issues/8022)) 
* UBERF-9383: · Fix ws init and import ([#8005](https://github.com/hcengineering/platform/issues/8005)) 
* UBERF-9430: · Fix provider auth case ([#8011](https://github.com/hcengineering/platform/issues/8011)) 
* UBERF-9476: · Optimize person store ([#8012](https://github.com/hcengineering/platform/issues/8012)) 

## [0.6.447] - 2025-02-13

* 🐛 BUG FIXES: · 'Code' style ([#7999](https://github.com/hcengineering/platform/issues/7999)) · Minor changes to cloud transactor ([#7998](https://github.com/hcengineering/platform/issues/7998)) · Versions · Add promise catches ([#8002](https://github.com/hcengineering/platform/issues/8002)) 
* ⚙️ MISCELLANEOUS TASKS: · Push of latest image in develop ([#8000](https://github.com/hcengineering/platform/issues/8000)) · S0.7.1 

## [0.6.443] - 2025-02-12

* 🐛 BUG FIXES: · Attribute class in activity for arrays ([#7983](https://github.com/hcengineering/platform/issues/7983)) · Reaction migration ([#7985](https://github.com/hcengineering/platform/issues/7985)) · Cloud transactor extra size ([#7988](https://github.com/hcengineering/platform/issues/7988)) · Standalone mode for IPhone/IPad ([#7989](https://github.com/hcengineering/platform/issues/7989)) · Directs activity ([#7991](https://github.com/hcengineering/platform/issues/7991)) · Typo 
* ⚙️ MISCELLANEOUS TASKS: · Version to 442 · Model 445 
* QFIX: · Mongo status collection ([#7990](https://github.com/hcengineering/platform/issues/7990)) 
* UBERF-8425: · Account DB unit tests ([#7994](https://github.com/hcengineering/platform/issues/7994)) 
* UBERF-9457: · Region move fixes + tests ([#7986](https://github.com/hcengineering/platform/issues/7986)) 
* UBERF-8425: · Fix getPendingWorkspace in CR ([#7996](https://github.com/hcengineering/platform/issues/7996)) 

## [0.6.441] - 2025-02-11

* UBERF-9465: · Fix ping/pong in Blob format ([#7981](https://github.com/hcengineering/platform/issues/7981)) 
* UBERF-9447: · Move accounts to pg tool ([#7976](https://github.com/hcengineering/platform/issues/7976)) 

## [0.6.438] - 2025-02-11

* 🐛 BUG FIXES: · Remove debug output ([#7973](https://github.com/hcengineering/platform/issues/7973)) · Transactor api auth ([#7974](https://github.com/hcengineering/platform/issues/7974)) · Desktop nav link · Nav link 
* ⚙️ MISCELLANEOUS TASKS: · Upgrade livekit sdk to fix sharing issues ([#7972](https://github.com/hcengineering/platform/issues/7972)) 
* UBERF-9435: · Restore workbench tab preferences ([#7965](https://github.com/hcengineering/platform/issues/7965)) 

## [0.6.436] - 2025-02-10

* ⚙️ MISCELLANEOUS TASKS: · Version to v0.6.436 
* UBERF-9448: · Fix svelte-check ([#7975](https://github.com/hcengineering/platform/issues/7975)) 
* UBERF-9453: · Fixed the size of avatars in the Office ([#7978](https://github.com/hcengineering/platform/issues/7978)) 
* UBERF-9455: · Fix change of configurations and proper notifyTx ([#7969](https://github.com/hcengineering/platform/issues/7969)) 
* UBERF-9434: · Migrate doc update messages ([#7967](https://github.com/hcengineering/platform/issues/7967)) 

## [0.6.435] - 2025-02-08

* 🐛 BUG FIXES: · Infinite loop ([#7952](https://github.com/hcengineering/platform/issues/7952)) · Bump version · Formatting · Notifications ([#7955](https://github.com/hcengineering/platform/issues/7955)) · Admin panel ([#7953](https://github.com/hcengineering/platform/issues/7953)) · Green reserve ([#7951](https://github.com/hcengineering/platform/issues/7951)) · Cleanup DocumentEmbeddings in database ([#7958](https://github.com/hcengineering/platform/issues/7958)) 
* ⚙️ MISCELLANEOUS TASKS: · 0.7 tagTime versioning · Redundant update and extra operations in migrations ([#7954](https://github.com/hcengineering/platform/issues/7954)) · Model version 
* EQMS-1430: · Fixed infinite loop in Channellnput ([#7961](https://github.com/hcengineering/platform/issues/7961)) 
* QFIX: · Check getWeekInfo (support for older browsers, Firefox). ([#7963](https://github.com/hcengineering/platform/issues/7963)) 
* QFIX: · Remove types cmd ([#7962](https://github.com/hcengineering/platform/issues/7962)) 
* QFIX: · Correctly display long strings ([#7957](https://github.com/hcengineering/platform/issues/7957)) 

## [0.6.432] - 2025-02-06

* 🐛 BUG FIXES: · Wrong workspace id passed to collaborator client ([#7950](https://github.com/hcengineering/platform/issues/7950)) 
* ⚙️ MISCELLANEOUS TASKS: · 0.7 tagTime versioning 

## [0.6.430] - 2025-02-06

* 🐛 BUG FIXES: · Lookup timestamps for postgre ([#7940](https://github.com/hcengineering/platform/issues/7940)) · Hash update ([#7946](https://github.com/hcengineering/platform/issues/7946)) · Remove project ([#7941](https://github.com/hcengineering/platform/issues/7941)) · Publish document plugin ([#7945](https://github.com/hcengineering/platform/issues/7945)) · Links ([#7944](https://github.com/hcengineering/platform/issues/7944)) 

## [0.6.429] - 2025-02-05

* 🐛 BUG FIXES: · Share audio label ([#7907](https://github.com/hcengineering/platform/issues/7907)) · Add retry to notarize ([#7912](https://github.com/hcengineering/platform/issues/7912)) · Archived and viewlet bugs ([#7927](https://github.com/hcengineering/platform/issues/7927)) 
* QFIX: · Ensure target mappings are not undefined ([#7936](https://github.com/hcengineering/platform/issues/7936)) 

## [0.6.428] - 2025-02-04

* 🚀 FEATURES: · PRs from staging/staging-new · PRs from staging/staging-new · PRs from staging/staging-new 
* 🐛 BUG FIXES: · Share audio label ([#7907](https://github.com/hcengineering/platform/issues/7907)) · Versions in launch configurations · Add retry to notarize ([#7912](https://github.com/hcengineering/platform/issues/7912)) 
* ⚙️ MISCELLANEOUS TASKS: · Branches and Clean PR template ([#7919](https://github.com/hcengineering/platform/issues/7919)) 
* UBERF-9220: · Set first day of the week ([#7770](https://github.com/hcengineering/platform/issues/7770)) 
* UBERF-9367: · Use domain hash ([#7897](https://github.com/hcengineering/platform/issues/7897)) 
* QFIX: · Provide token when fetching video meta ([#7890](https://github.com/hcengineering/platform/issues/7890)) 
* UBERF-9381: · Group by in migration ([#7914](https://github.com/hcengineering/platform/issues/7914)) 
* UBERF-9382: · Fix upgrading workspace access ([#7908](https://github.com/hcengineering/platform/issues/7908)) 
* UBERF-9385: · Fix select workspace redirects ([#7942](https://github.com/hcengineering/platform/issues/7942)) 

## [0.6.427] - 2025-02-04

* 🐛 BUG FIXES: · Depend on ui tests 
* ⚙️ MISCELLANEOUS TASKS: · Model version 

## [0.6.426] - 2025-02-04

* UBERF-8425: · Global accounts ([#7573](https://github.com/hcengineering/platform/issues/7573)) 
* QFIX: · Provide token when fetching video meta ([#7890](https://github.com/hcengineering/platform/issues/7890)) 

## [0.6.425] - 2025-02-03

* 🐛 BUG FIXES: · Browsers list · Browsers list · Show upgrading workspaces ([#7872](https://github.com/hcengineering/platform/issues/7872)) · Allow access to any workspace with system email ([#7865](https://github.com/hcengineering/platform/issues/7865)) · Drawing board deletion when typing ([#7878](https://github.com/hcengineering/platform/issues/7878)) · Better analytics in collaborator service ([#7879](https://github.com/hcengineering/platform/issues/7879)) 
* ⚙️ MISCELLANEOUS TASKS: · Update hocuspocus to 2.15.1 ([#7880](https://github.com/hcengineering/platform/issues/7880)) 
* UBERF-9279: · Ctrl/Cmd + K for hyperlinks ([#7857](https://github.com/hcengineering/platform/issues/7857)) 

## [0.6.423] - 2025-01-31

* 🚀 FEATURES: · Add auth to datalake ([#7852](https://github.com/hcengineering/platform/issues/7852)) 
* 🐛 BUG FIXES: · Todo notifications from unavailable space ([#7850](https://github.com/hcengineering/platform/issues/7850)) 
* UBERF-8555: · Cleaning up broken tables ([#7848](https://github.com/hcengineering/platform/issues/7848)) 
* UBERF-9263: · Make reactions tooltip reactive ([#7849](https://github.com/hcengineering/platform/issues/7849)) 
* UBERF-9299: · Fix backup service order and add parallel ([#7846](https://github.com/hcengineering/platform/issues/7846)) 
* QFIX: · Properly increase month in HR calendar ([#7855](https://github.com/hcengineering/platform/issues/7855)) 

## [0.6.422] - 2025-01-31

* 🐛 BUG FIXES: · Cards activity ([#7832](https://github.com/hcengineering/platform/issues/7832)) · Double DM context ([#7835](https://github.com/hcengineering/platform/issues/7835)) · Reconi stats with wrong token ([#7840](https://github.com/hcengineering/platform/issues/7840)) 
* ⚙️ MISCELLANEOUS TASKS: · Deps + script to find ones ([#7843](https://github.com/hcengineering/platform/issues/7843)) 
* CREATECANDIDATE: · Added a button to change the places of the first and last name ([#7836](https://github.com/hcengineering/platform/issues/7836)) 
* EZQMS-1268: · Doc ID changes editable phases ([#7834](https://github.com/hcengineering/platform/issues/7834)) 
* EZQMS-1392: · Obsolete documents ([#7833](https://github.com/hcengineering/platform/issues/7833)) 
* UBERF-9299: · Fix backup service backup order ([#7826](https://github.com/hcengineering/platform/issues/7826)) 

## [0.6.421] - 2025-01-29

* 🐛 BUG FIXES: · Destroy hls player on destroy ([#7821](https://github.com/hcengineering/platform/issues/7821)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version 

## [0.6.420] - 2025-01-28

* 🐛 BUG FIXES: · Links co-authors notifications ([#7802](https://github.com/hcengineering/platform/issues/7802)) · Allow to use relative video metadata links ([#7808](https://github.com/hcengineering/platform/issues/7808)) 
* EZQMS-1393: · Implemented folders in controlled documents ([#7803](https://github.com/hcengineering/platform/issues/7803)) 
* UBERF-9095: · Fix wrong size in datalake ([#7800](https://github.com/hcengineering/platform/issues/7800)) 
* UBERF-9224: · Use context variables to hold context data ([#7754](https://github.com/hcengineering/platform/issues/7754)) 
* UBERF-9262: · Hide document activity & inline comments for guests & PDFs ([#7807](https://github.com/hcengineering/platform/issues/7807)) 
* UBERF-9264: · Fix set/unset parent issue ([#7799](https://github.com/hcengineering/platform/issues/7799)) 
* UBERF-9273: · Link preview presenter may get stuck in loading state ([#7801](https://github.com/hcengineering/platform/issues/7801)) 

## [0.6.419] - 2025-01-27

* 🚀 FEATURES: · Hide archived ([#7772](https://github.com/hcengineering/platform/issues/7772)) · Added configurable password validation  ([#7640](https://github.com/hcengineering/platform/issues/7640)) 

## [0.6.418] - 2025-01-24

* 🐛 BUG FIXES: · Do not use default cursor by default ([#7782](https://github.com/hcengineering/platform/issues/7782)) · Save link preview as file ([#7781](https://github.com/hcengineering/platform/issues/7781)) · Links after translation and in tg ([#7788](https://github.com/hcengineering/platform/issues/7788)) 

## [0.6.417] - 2025-01-24

* 🐛 BUG FIXES: · Upload artifacts · Upload artifacts ([#7776](https://github.com/hcengineering/platform/issues/7776)) 
* QFIX: · Upload desktop version descriptor files ([#7777](https://github.com/hcengineering/platform/issues/7777)) 

## [0.6.416] - 2025-01-23

* 🐛 BUG FIXES: · Publish script should fail on error ([#7771](https://github.com/hcengineering/platform/issues/7771)) · Miss mentions in translated text ([#7773](https://github.com/hcengineering/platform/issues/7773)) · Notifications ([#7775](https://github.com/hcengineering/platform/issues/7775)) 

## [0.6.415] - 2025-01-22

* UBERF-9236: · Fetch GH usernames ([#7766](https://github.com/hcengineering/platform/issues/7766)) 

## [0.6.414] - 2025-01-22

* 🐛 BUG FIXES: · PG query ([#7758](https://github.com/hcengineering/platform/issues/7758)) 
* ⚙️ MISCELLANEOUS TASKS: · Redundant map ([#7763](https://github.com/hcengineering/platform/issues/7763)) 
* UBERF-9230: · Fix ses webpush ([#7760](https://github.com/hcengineering/platform/issues/7760)) 

## [0.6.413] - 2025-01-21

* 🐛 BUG FIXES: · Send unavailable notifications ([#7737](https://github.com/hcengineering/platform/issues/7737)) · Increase collaborator body parser limit ([#7744](https://github.com/hcengineering/platform/issues/7744)) · Properly handle stream errors in datalake migration tool ([#7747](https://github.com/hcengineering/platform/issues/7747)) 
* UBERF-8968: · Get rid of prosemirror in transactor ([#7746](https://github.com/hcengineering/platform/issues/7746)) 
* UBERF-9212: · Fix for Array variable handling ([#7745](https://github.com/hcengineering/platform/issues/7745)) 

## [0.6.412] - 2025-01-20

* 🐛 BUG FIXES: · Undefined exception ([#7716](https://github.com/hcengineering/platform/issues/7716)) 
* UBERF-9165: · Fix archived workspace select ([#7712](https://github.com/hcengineering/platform/issues/7712)) 
* UBERF-9172: · Fix $lookup order by ([#7714](https://github.com/hcengineering/platform/issues/7714)) 
* TOOL: · Add qms ranks ([#7713](https://github.com/hcengineering/platform/issues/7713)) 

## [0.6.411] - 2025-01-18

* 🐛 BUG FIXES: · PG query 

## [0.6.410] - 2025-01-17

* 🐛 BUG FIXES: · PG query and SES ([#7700](https://github.com/hcengineering/platform/issues/7700)) · Desktop BackupURL ([#7701](https://github.com/hcengineering/platform/issues/7701)) · Enhance markup comparison performance ([#7702](https://github.com/hcengineering/platform/issues/7702)) 
* QFIX: · Backup info page ([#7703](https://github.com/hcengineering/platform/issues/7703)) 

## [0.6.409] - 2025-01-17

* UBERF-9158: · Use parameters in SQL queries ([#7690](https://github.com/hcengineering/platform/issues/7690)) 

## [0.6.408] - 2025-01-17

* 🚀 FEATURES: · Add viber ([#7684](https://github.com/hcengineering/platform/issues/7684)) 
* EZQMS-1234: · Means for transferring controlled documents between spaces ([#7691](https://github.com/hcengineering/platform/issues/7691)) 

## [0.6.407] - 2025-01-15

* 🚀 FEATURES: · Add links preview ([#7600](https://github.com/hcengineering/platform/issues/7600)) 
* 🐛 BUG FIXES: · Add mermaid plugin to server kit ([#7671](https://github.com/hcengineering/platform/issues/7671)) · Ignore invalid blob data json files ([#7679](https://github.com/hcengineering/platform/issues/7679)) 
* EZQMS-1234: · Ability to relocate and reorder controlled documents within the space ([#7668](https://github.com/hcengineering/platform/issues/7668)) 
* UBERF-9107: · Add backup list support ([#7662](https://github.com/hcengineering/platform/issues/7662)) 
* UBERF-9137: · Fix Support for suspended installations ([#7667](https://github.com/hcengineering/platform/issues/7667)) 
* UBERF-9140: · Pass fulltext URI ([#7670](https://github.com/hcengineering/platform/issues/7670)) 

## [0.6.406] - 2025-01-14

* 🚀 FEATURES: · Add front base image · Add relation functionality ([#7653](https://github.com/hcengineering/platform/issues/7653)) 
* 🐛 BUG FIXES: · Reject query promise on error ([#7650](https://github.com/hcengineering/platform/issues/7650)) · Push of base images · Base image build · Docker base build · Push · Front base image build · Push version · Expandables ([#7655](https://github.com/hcengineering/platform/issues/7655)) · Front pod base image · Edge case for Link extenstions ([#7646](https://github.com/hcengineering/platform/issues/7646)) · Auth error in transactor rcp ([#7661](https://github.com/hcengineering/platform/issues/7661)) 
* EZQMS-1317: · Authors signature on review and approval request & block review bypass ([#7631](https://github.com/hcengineering/platform/issues/7631)) 

## [0.6.405] - 2025-01-12

* ⚙️ MISCELLANEOUS TASKS: · Unused 'progress' parameter from the AttachmentPresenter ([#7644](https://github.com/hcengineering/platform/issues/7644)) 
* UBERF-9114: · Optimize memory usage ([#7643](https://github.com/hcengineering/platform/issues/7643)) 
* QFIX: · Do not use intalic for blockquotes ([#7645](https://github.com/hcengineering/platform/issues/7645)) 

## [0.6.404] - 2025-01-11

* 🚀 FEATURES: · Add german translation ([#7636](https://github.com/hcengineering/platform/issues/7636)) 
* 🐛 BUG FIXES: · Restore services work ([#7641](https://github.com/hcengineering/platform/issues/7641)) 

## [0.6.403] - 2025-01-10

* 🐛 BUG FIXES: · Bold style ([#7633](https://github.com/hcengineering/platform/issues/7633)) 
* ⚙️ MISCELLANEOUS TASKS: · Import from Tracker ([#7632](https://github.com/hcengineering/platform/issues/7632)) 
* UBERF-9099: · Rate limits ([#7629](https://github.com/hcengineering/platform/issues/7629)) 

## [0.6.402] - 2025-01-10

* UBERF-9093: · Fix connection establish ([#7623](https://github.com/hcengineering/platform/issues/7623)) 

## [0.6.401] - 2025-01-09

* 🚀 FEATURES: · Kick participant from office ([#7620](https://github.com/hcengineering/platform/issues/7620)) 
* 🐛 BUG FIXES: · Fix Double model ([#7617](https://github.com/hcengineering/platform/issues/7617)) 
* UBER-1233: · Milestone related fixes ([#7614](https://github.com/hcengineering/platform/issues/7614)) 

## [0.6.400] - 2025-01-09

* 🐛 BUG FIXES: · Migrate UUID ([#7602](https://github.com/hcengineering/platform/issues/7602)) · Edit employee ([#7609](https://github.com/hcengineering/platform/issues/7609)) 
* UBERF-8899: · Reconnect performance issues ([#7611](https://github.com/hcengineering/platform/issues/7611)) 

## [0.6.399] - 2025-01-08

* 🐛 BUG FIXES: · User status ([#7601](https://github.com/hcengineering/platform/issues/7601)) 
* QFIX: · LastTx event check fix ([#7598](https://github.com/hcengineering/platform/issues/7598)) 

## [0.6.398] - 2025-01-07

* 🐛 BUG FIXES: · Hide all attributes ([#7583](https://github.com/hcengineering/platform/issues/7583)) · Closing description todo ([#7584](https://github.com/hcengineering/platform/issues/7584)) · Label count in issue template ([#7555](https://github.com/hcengineering/platform/issues/7555)) · *(github)* Broken images in issue description ([#7534](https://github.com/hcengineering/platform/issues/7534)) · Tracker templates issues ([#7590](https://github.com/hcengineering/platform/issues/7590)) · Backup restore after restore ([#7594](https://github.com/hcengineering/platform/issues/7594)) 
* UBERF-8581: · Optimise session data ([#7582](https://github.com/hcengineering/platform/issues/7582)) 
* UBERF-8899: · Fix Reconnect performance ([#7597](https://github.com/hcengineering/platform/issues/7597)) 
* UBERF-9062: · Fix My applications for Recruit module ([#7593](https://github.com/hcengineering/platform/issues/7593)) 

## [0.6.397] - 2025-01-02

* 🚀 FEATURES: · Move task statuses between categories ([#7569](https://github.com/hcengineering/platform/issues/7569)) 
* 🐛 BUG FIXES: · H1/h2/h3 in inbox ([#7570](https://github.com/hcengineering/platform/issues/7570)) 
* UBERF-9028: · Remove unused Svelte components ([#7559](https://github.com/hcengineering/platform/issues/7559)) 
* UBERF-9049: · Fix adapter initialization ([#7580](https://github.com/hcengineering/platform/issues/7580)) 

## [0.6.396] - 2024-12-26

* UBERF-9032: · Fix proper query initializers ([#7563](https://github.com/hcengineering/platform/issues/7563)) 

## [0.6.395] - 2024-12-26

* 🐛 BUG FIXES: · Combine presence avatars ([#7551](https://github.com/hcengineering/platform/issues/7551)) · Github Auth ([#7558](https://github.com/hcengineering/platform/issues/7558)) 
* UBERF-9025: · Fix backup service ([#7557](https://github.com/hcengineering/platform/issues/7557)) 

## [0.6.394] - 2024-12-25

* 🚀 FEATURES: · Add storage key for viewlet view options ([#7545](https://github.com/hcengineering/platform/issues/7545)) 
* UBERF-9015: · Remove confusing SYSTEM_EMAIL env ([#7548](https://github.com/hcengineering/platform/issues/7548)) 
* UBERF-9017: · Reduce createTable calls ([#7550](https://github.com/hcengineering/platform/issues/7550)) 

## [0.6.393] - 2024-12-25

* 🐛 BUG FIXES: · Extra inbox tabs ([#7543](https://github.com/hcengineering/platform/issues/7543)) 

## [0.6.392] - 2024-12-24

* 🐛 BUG FIXES: · Backup info size display ([#7540](https://github.com/hcengineering/platform/issues/7540)) 
* ⚙️ MISCELLANEOUS TASKS: · Mongo driver to 6.12 ([#7537](https://github.com/hcengineering/platform/issues/7537)) · Express.js to 4.21 ([#7536](https://github.com/hcengineering/platform/issues/7536)) 
* UBERF-8993: · Fix handling of known errors ([#7526](https://github.com/hcengineering/platform/issues/7526)) · Fix some flacky tests because of login ([#7535](https://github.com/hcengineering/platform/issues/7535)) · Part2 ([#7532](https://github.com/hcengineering/platform/issues/7532)) 

## [0.6.391] - 2024-12-23

* UBERF-8532: · Rework how ping work ([#7522](https://github.com/hcengineering/platform/issues/7522)) 

## [0.6.390] - 2024-12-20

* 🚀 FEATURES: · Add initial transactor rpc ([#7490](https://github.com/hcengineering/platform/issues/7490)) · Resend invitation to kicked employee ([#7472](https://github.com/hcengineering/platform/issues/7472)) 
* 🐛 BUG FIXES: · Chat menu actions ([#7493](https://github.com/hcengineering/platform/issues/7493)) · Search in slash command menu ([#7495](https://github.com/hcengineering/platform/issues/7495)) · Add missing 'mode IN' to archivingSql query ([#7510](https://github.com/hcengineering/platform/issues/7510)) · Enable all available languages by default ([#7513](https://github.com/hcengineering/platform/issues/7513)) 
* UBERF-8895: · Workspace UUIDs in PG/CR data tables ([#7471](https://github.com/hcengineering/platform/issues/7471)) 
* UBERF-8957: · Allow to use storage in backup-restore via tool ([#7491](https://github.com/hcengineering/platform/issues/7491)) 
* UBERF-8969: · Fix deps for cloud transactor ([#7503](https://github.com/hcengineering/platform/issues/7503)) 

## [0.6.389] - 2024-12-16

* 🚀 FEATURES: · Add openai transcription provider ([#7480](https://github.com/hcengineering/platform/issues/7480)) 
* 🐛 BUG FIXES: · Improve reactions tooltip ([#7470](https://github.com/hcengineering/platform/issues/7470)) · Restore wiki content fixes ([#7474](https://github.com/hcengineering/platform/issues/7474)) · Extra proxies ([#7483](https://github.com/hcengineering/platform/issues/7483)) 
* QFIX: · Add limit to count queries ([#7458](https://github.com/hcengineering/platform/issues/7458)) 

## [0.6.388] - 2024-12-13

* 🐛 BUG FIXES: · List of workspaces ([#7452](https://github.com/hcengineering/platform/issues/7452)) 
* UBERF-8851: · Fix isDone is wrong ([#7456](https://github.com/hcengineering/platform/issues/7456)) 
* UBERF-8889: · Fix test suite selection ([#7454](https://github.com/hcengineering/platform/issues/7454)) 

## [0.6.387] - 2024-12-13

* UBERF-8888: · Fix backup ([#7451](https://github.com/hcengineering/platform/issues/7451)) 

## [0.6.386] - 2024-12-13

* QFIX: · One-line hot keys in the tooltip ([#7446](https://github.com/hcengineering/platform/issues/7446)) 
* UBERF-7670: · Per region moves ([#7444](https://github.com/hcengineering/platform/issues/7444)) 
* UBERF-8626: · Add test plans ([#7421](https://github.com/hcengineering/platform/issues/7421)) 
* UBERF-8887: · Allow override region settings ([#7450](https://github.com/hcengineering/platform/issues/7450)) 

## [0.6.384] - 2024-12-12

* 🚀 FEATURES: · Add optional size parameter to move method for ([#7442](https://github.com/hcengineering/platform/issues/7442)) 
* 🐛 BUG FIXES: · Chat red dots ([#7440](https://github.com/hcengineering/platform/issues/7440)) 

## [0.6.383] - 2024-12-12

* 🐛 BUG FIXES: · Remove unused elastic url ([#7436](https://github.com/hcengineering/platform/issues/7436)) · Query mixins ([#7434](https://github.com/hcengineering/platform/issues/7434)) · Change issue status when change assignee ([#7438](https://github.com/hcengineering/platform/issues/7438)) · Cached error ([#7439](https://github.com/hcengineering/platform/issues/7439)) 

## [0.6.382] - 2024-12-11

* 🐛 BUG FIXES: · Content shift on select workspace page ([#7424](https://github.com/hcengineering/platform/issues/7424)) 
* ⚙️ MISCELLANEOUS TASKS: · Duplicated column, fix adding surveys to vacancies ([#7422](https://github.com/hcengineering/platform/issues/7422)) 
* TOOL: · Restore controlled docs content ([#7423](https://github.com/hcengineering/platform/issues/7423)) · Restore controlled docs content ([#7423](https://github.com/hcengineering/platform/issues/7423)) 

## [0.6.381] - 2024-12-10

* 🐛 BUG FIXES: · Duplicated messages in activity ([#7418](https://github.com/hcengineering/platform/issues/7418)) · Connect button ([#7419](https://github.com/hcengineering/platform/issues/7419)) 
* TOOL: · Restore wiki content ([#7415](https://github.com/hcengineering/platform/issues/7415)) 

## [0.6.380] - 2024-12-10

* 🐛 BUG FIXES: · Drawing bugs and process touch events ([#7412](https://github.com/hcengineering/platform/issues/7412)) 
* UBERF-8856: · Fix space security query and schema update ([#7413](https://github.com/hcengineering/platform/issues/7413)) 
* UBERF-8877: · Fix indexer concurrency ([#7416](https://github.com/hcengineering/platform/issues/7416)) 
* QFIX: · Export markup type from api client ([#7410](https://github.com/hcengineering/platform/issues/7410)) 

## [0.6.379] - 2024-12-10

* 🚀 FEATURES: · Add room settings on panel & reduce finds ([#7399](https://github.com/hcengineering/platform/issues/7399)) · Default activity in documents ([#7401](https://github.com/hcengineering/platform/issues/7401)) 
* 🐛 BUG FIXES: · Recruit viewlets selector ([#7400](https://github.com/hcengineering/platform/issues/7400)) · *(tracker)* Edit workflow status redirect ([#7392](https://github.com/hcengineering/platform/issues/7392)) · Security ([#7403](https://github.com/hcengineering/platform/issues/7403)) · Chat nav ([#7404](https://github.com/hcengineering/platform/issues/7404)) 
* ⚙️ MISCELLANEOUS TASKS: · Outdated aside ([#7405](https://github.com/hcengineering/platform/issues/7405)) 

## [0.6.378] - 2024-12-09

* 🐛 BUG FIXES: · *(github integration)* Handle request failed gracefully with option to close tab ([#7387](https://github.com/hcengineering/platform/issues/7387)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog file 
* UBERF-8848: · Fix github account link ([#7391](https://github.com/hcengineering/platform/issues/7391)) 
* UBERF-8849: · Fix update performance ([#7393](https://github.com/hcengineering/platform/issues/7393)) 

## [0.6.377] - 2024-12-08

* 🐛 BUG FIXES: · Docker push script and mongo dump script ([#7293](https://github.com/hcengineering/platform/issues/7293)) 

## [0.6.376] - 2024-12-08

* 🐛 BUG FIXES: · Fallback to defaultIcon when value is undefined ([#7294](https://github.com/hcengineering/platform/issues/7294)) · Do not fail on wrong content type in collaborator ([#7296](https://github.com/hcengineering/platform/issues/7296)) 
* 🎨 STYLING: · *(drive)* Fix pdf appears small  ([#7291](https://github.com/hcengineering/platform/issues/7291)) 

## [0.6.375] - 2024-12-07

* UBERF-8612: · Fix modifiedOn for apply tx ([#7292](https://github.com/hcengineering/platform/issues/7292)) 

## [0.6.374] - 2024-12-07

* 🐛 BUG FIXES: · Chromium install 

## [0.6.373] - 2024-12-06

* 🐛 BUG FIXES: · Better error handling in json migration ([#7279](https://github.com/hcengineering/platform/issues/7279)) · Office sidebar ([#7283](https://github.com/hcengineering/platform/issues/7283)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog 

## [0.6.372] - 2024-12-06

* 🐛 BUG FIXES: · Datalake migration cosmetic fixes ([#7281](https://github.com/hcengineering/platform/issues/7281)) 
* UBERF-8614: · Mermaidjs integration ([#7272](https://github.com/hcengineering/platform/issues/7272)) 

## [0.6.371] - 2024-12-06

* 🚀 FEATURES: · Add text tool for drawings ([#7266](https://github.com/hcengineering/platform/issues/7266)) 
* 🐛 BUG FIXES: · Space security ([#7278](https://github.com/hcengineering/platform/issues/7278)) 
* UBERF-8619: · Rework backup %hash% usage ([#7273](https://github.com/hcengineering/platform/issues/7273)) 
* UBERF-8627: · Enable test management ([#7274](https://github.com/hcengineering/platform/issues/7274)) 
* UBERF-8628: · Disable run button if there is nothing to run ([#7277](https://github.com/hcengineering/platform/issues/7277)) 

## [0.6.369] - 2024-12-05

* 🐛 BUG FIXES: · OnConnect handler ([#7265](https://github.com/hcengineering/platform/issues/7265)) 

## [0.6.368] - 2024-12-05

* 🐛 BUG FIXES: · Schema update ([#7264](https://github.com/hcengineering/platform/issues/7264)) 
* UBERF-8620: · Fix OOM in fulltext service ([#7263](https://github.com/hcengineering/platform/issues/7263)) 
* TOOL: · Copy files from R2 to datalake ([#7262](https://github.com/hcengineering/platform/issues/7262)) 

## [0.6.367] - 2024-12-05

* 🐛 BUG FIXES: · Pg numeric sort ([#7261](https://github.com/hcengineering/platform/issues/7261)) 
* UBERF-8618: · Redesign test runner ([#7259](https://github.com/hcengineering/platform/issues/7259)) 

## [0.6.366] - 2024-12-05

* 🐛 BUG FIXES: · Double meeting initialization ([#7256](https://github.com/hcengineering/platform/issues/7256)) 
* UBERF-8613: · Rename all test cases and fix list viewlet ([#7255](https://github.com/hcengineering/platform/issues/7255)) 
* UBERF-8615: · Backup/restore fixes ([#7258](https://github.com/hcengineering/platform/issues/7258)) 

## [0.6.365] - 2024-12-03

* 🚀 FEATURES: · No operation update flow ([#7251](https://github.com/hcengineering/platform/issues/7251)) · Add next test button ([#7247](https://github.com/hcengineering/platform/issues/7247)) 
* 🐛 BUG FIXES: · Optimize json content migration ([#7252](https://github.com/hcengineering/platform/issues/7252)) · Make todos and commands working in meeting minutes ([#7244](https://github.com/hcengineering/platform/issues/7244)) · Queries for $in: [null, ...etc] in pg ([#7253](https://github.com/hcengineering/platform/issues/7253)) 

## [0.6.364] - 2024-12-02

* 🚀 FEATURES: · Add drawing board to collaborative doc editor ([#7243](https://github.com/hcengineering/platform/issues/7243)) 
* 🐛 BUG FIXES: · Add document inline editor ([#7233](https://github.com/hcengineering/platform/issues/7233)) · Meetings transcription ([#7240](https://github.com/hcengineering/platform/issues/7240)) · Test suite and test run default selection ([#7250](https://github.com/hcengineering/platform/issues/7250)) 
* UBERF-8584: · Add test runs ([#7235](https://github.com/hcengineering/platform/issues/7235)) 
* UBERF-8607: · Fix inbox embedding ([#7236](https://github.com/hcengineering/platform/issues/7236)) 
* UBERF-8608: · Rework connection management ([#7248](https://github.com/hcengineering/platform/issues/7248)) 

## [0.6.363] - 2024-11-26

* 🐛 BUG FIXES: · Check connect ([#7227](https://github.com/hcengineering/platform/issues/7227)) · Limit tooltip size in inbox ([#7228](https://github.com/hcengineering/platform/issues/7228)) 
* UBERF-8603: · Fix memory leak ([#7229](https://github.com/hcengineering/platform/issues/7229)) 

## [0.6.362] - 2024-11-22

* 🐛 BUG FIXES: · CreatedOn be set on middleware ([#7224](https://github.com/hcengineering/platform/issues/7224)) · Query cache ([#7226](https://github.com/hcengineering/platform/issues/7226)) 

## [0.6.361] - 2024-11-22

* 🐛 BUG FIXES: · Meetings ([#7213](https://github.com/hcengineering/platform/issues/7213)) · Datalake issues ([#7217](https://github.com/hcengineering/platform/issues/7217)) · Kanban drag-and-drop ([#7219](https://github.com/hcengineering/platform/issues/7219)) · Better handle markup in api client ([#7180](https://github.com/hcengineering/platform/issues/7180)) · Backup restore scripts ([#7195](https://github.com/hcengineering/platform/issues/7195)) · Push titles ([#7220](https://github.com/hcengineering/platform/issues/7220)) · Transcription button highlight ([#7222](https://github.com/hcengineering/platform/issues/7222)) 
* UBERF-8595: · Fix backup/restore performance ([#7188](https://github.com/hcengineering/platform/issues/7188)) 

## [0.6.360] - 2024-11-21

* 🐛 BUG FIXES: · Migration ([#7197](https://github.com/hcengineering/platform/issues/7197)) · Unfinished meetings ([#7198](https://github.com/hcengineering/platform/issues/7198)) · Configure csp ([#7206](https://github.com/hcengineering/platform/issues/7206)) · Table config ([#7205](https://github.com/hcengineering/platform/issues/7205)) · Checkbox state ([#7202](https://github.com/hcengineering/platform/issues/7202)) · Pg in query ([#7207](https://github.com/hcengineering/platform/issues/7207)) · Create workspace region selector ([#7212](https://github.com/hcengineering/platform/issues/7212)) 
* ⚙️ MISCELLANEOUS TASKS: · Mongo driver to 6.10 ([#7211](https://github.com/hcengineering/platform/issues/7211)) 
* UBERF-8592: · Fix live query performance ([#7189](https://github.com/hcengineering/platform/issues/7189)) 
* UBERF-8597: · Fix workspace handshake ([#7199](https://github.com/hcengineering/platform/issues/7199)) 

## [0.6.359] - 2024-11-19

* 🐛 BUG FIXES: · Test management header button ([#7172](https://github.com/hcengineering/platform/issues/7172)) · Full text attribute error ([#7173](https://github.com/hcengineering/platform/issues/7173)) · Pg nested query ([#7175](https://github.com/hcengineering/platform/issues/7175)) · Meeting minutes ([#7181](https://github.com/hcengineering/platform/issues/7181)) · Save documents maxWidth to local storage ([#7184](https://github.com/hcengineering/platform/issues/7184)) · Pg escape ([#7187](https://github.com/hcengineering/platform/issues/7187)) · Office meeting minutes ([#7193](https://github.com/hcengineering/platform/issues/7193)) 
* ⚙️ MISCELLANEOUS TASKS: · Collection tx ([#7171](https://github.com/hcengineering/platform/issues/7171)) 
* UBERF-8587: · Fix github auth and delete issues ([#7174](https://github.com/hcengineering/platform/issues/7174)) 

## [0.6.358] - 2024-11-13

* 🐛 BUG FIXES: · Undefined error on thread open ([#7169](https://github.com/hcengineering/platform/issues/7169)) 
* QFIX: · Fix separator and folder scroll in test management ([#7165](https://github.com/hcengineering/platform/issues/7165)) 

## [0.6.357] - 2024-11-13

* 🚀 FEATURES: · Calendar schema ([#7156](https://github.com/hcengineering/platform/issues/7156)) · Add draft survey app ([#7162](https://github.com/hcengineering/platform/issues/7162)) 
* UBERF-8520: · Test management ([#7154](https://github.com/hcengineering/platform/issues/7154)) 
* UBERF-8582: · Fix triggers ([#7155](https://github.com/hcengineering/platform/issues/7155)) 

## [0.6.356] - 2024-11-12

* 🚀 FEATURES: · Raw update ([#7160](https://github.com/hcengineering/platform/issues/7160)) 
* 🐛 BUG FIXES: · Indexer start ([#7157](https://github.com/hcengineering/platform/issues/7157)) · Pg set null ([#7159](https://github.com/hcengineering/platform/issues/7159)) 
* UBERF-8433: · Support for archived workspaces ([#6937](https://github.com/hcengineering/platform/issues/6937)) 

## [0.6.355] - 2024-11-11

* 🚀 FEATURES: · Add rate limiting to push notification sending process ([#7149](https://github.com/hcengineering/platform/issues/7149)) 
* UBERF-8552: · Extract indexer into separate service ([#7120](https://github.com/hcengineering/platform/issues/7120)) 

## [0.6.354] - 2024-11-11

* UBERF-8580: · Labels for Tracker ([#7141](https://github.com/hcengineering/platform/issues/7141)) 

## [0.6.353] - 2024-11-11

* 🚀 FEATURES: · Infer type ([#7137](https://github.com/hcengineering/platform/issues/7137)) 
* 🐛 BUG FIXES: · More explicit api client interface ([#7138](https://github.com/hcengineering/platform/issues/7138)) 

## [0.6.352] - 2024-11-08

* 🐛 BUG FIXES: · Backup ([#7134](https://github.com/hcengineering/platform/issues/7134)) · Github pg ([#7135](https://github.com/hcengineering/platform/issues/7135)) 
* UBERF-8578: · Fix extra stat call for storage adapter ([#7132](https://github.com/hcengineering/platform/issues/7132)) 

## [0.6.351] - 2024-11-08

* 🐛 BUG FIXES: · Specify files in package.json ([#7131](https://github.com/hcengineering/platform/issues/7131)) 

## [0.6.350] - 2024-11-07

* 🐛 BUG FIXES: · Love metadata update ([#7124](https://github.com/hcengineering/platform/issues/7124)) · Tg replies on mentions ([#7122](https://github.com/hcengineering/platform/issues/7122)) · Adjust bump script ([#7121](https://github.com/hcengineering/platform/issues/7121)) · Using wrong stats token ([#7127](https://github.com/hcengineering/platform/issues/7127)) 
* UBERF-8577: · Fix desktop lang ([#7126](https://github.com/hcengineering/platform/issues/7126)) 

## [0.6.349] - 2024-11-07

* 🐛 BUG FIXES: · Desktop file menu on Linux ([#7106](https://github.com/hcengineering/platform/issues/7106)) · Force move tool ([#7110](https://github.com/hcengineering/platform/issues/7110)) · Tooltips in chat ([#7113](https://github.com/hcengineering/platform/issues/7113)) · Ai bot workspace assign ([#7116](https://github.com/hcengineering/platform/issues/7116)) · Move ([#7118](https://github.com/hcengineering/platform/issues/7118)) 
* ⚙️ MISCELLANEOUS TASKS: · User mapping details in clickup readme ([#7107](https://github.com/hcengineering/platform/issues/7107)) 

## [0.6.348] - 2024-11-05

* 🚀 FEATURES: · Add italian fixes ([#7096](https://github.com/hcengineering/platform/issues/7096)) 
* 🐛 BUG FIXES: · Pg application name ([#7087](https://github.com/hcengineering/platform/issues/7087)) · Add missing commit ([#7097](https://github.com/hcengineering/platform/issues/7097)) · Class editor ([#7099](https://github.com/hcengineering/platform/issues/7099)) 
* ⚙️ MISCELLANEOUS TASKS: · Notification subscriptions when an employee is deactivated ([#7089](https://github.com/hcengineering/platform/issues/7089)) 
* UBERF-8569: · Backup service regions support ([#7090](https://github.com/hcengineering/platform/issues/7090)) 

## [0.6.347] - 2024-11-02

* 🐛 BUG FIXES: · Front service ([#7070](https://github.com/hcengineering/platform/issues/7070)) · Links to readme files ([#7071](https://github.com/hcengineering/platform/issues/7071)) · Get rid of @html usages ([#7072](https://github.com/hcengineering/platform/issues/7072)) · Mentions to handle non-latin names during import ([#7078](https://github.com/hcengineering/platform/issues/7078)) · Hr module employee inactivate handler ([#7079](https://github.com/hcengineering/platform/issues/7079)) 
* ⚙️ MISCELLANEOUS TASKS: · Outdated push subscription ([#7080](https://github.com/hcengineering/platform/issues/7080)) 
* UBERF-8563: · Fix due date selection ([#7073](https://github.com/hcengineering/platform/issues/7073)) 

## [0.6.346] - 2024-10-30

* 🚀 FEATURES: · Add warning for telegram integration ([#7065](https://github.com/hcengineering/platform/issues/7065)) · Add docs for supported import formats ([#7064](https://github.com/hcengineering/platform/issues/7064)) 

## [0.6.345] - 2024-10-29

* 🚀 FEATURES: · Add select domain for move tool ([#7057](https://github.com/hcengineering/platform/issues/7057)) 
* UBERF-8547: · Inbox cleanup  and other ([#7058](https://github.com/hcengineering/platform/issues/7058)) 
* UBERF-8553: · Stats as separate service ([#7054](https://github.com/hcengineering/platform/issues/7054)) 

## [0.6.344] - 2024-10-28

* 🐛 BUG FIXES: · Get rid of sentry error and extra logging ([#7050](https://github.com/hcengineering/platform/issues/7050)) · Sort model ([#7053](https://github.com/hcengineering/platform/issues/7053)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog 
* UBERF-8544: · Improve memdb account handling ([#7047](https://github.com/hcengineering/platform/issues/7047)) 

## [0.6.343] - 2024-10-26

* 🐛 BUG FIXES: · Show users online status by default ([#7046](https://github.com/hcengineering/platform/issues/7046)) 
* UBERF-8488: · Fix github re-auth ([#7041](https://github.com/hcengineering/platform/issues/7041)) 

## [0.6.342] - 2024-10-26

* UBERF-8540: · Allow derived operations with apply ([#7044](https://github.com/hcengineering/platform/issues/7044)) 

## [0.6.341] - 2024-10-25

* 🐛 BUG FIXES: · Online/offline status when person has multiple accounts ([#7036](https://github.com/hcengineering/platform/issues/7036)) 
* UBERF-8537: · Fix component ([#7040](https://github.com/hcengineering/platform/issues/7040)) 
* UBERF-8538: · Handle backup service errors ([#7042](https://github.com/hcengineering/platform/issues/7042)) 
* UBERF-8539: · Do not store TypingInfo into memdb ([#7043](https://github.com/hcengineering/platform/issues/7043)) 

## [0.6.339] - 2024-10-25

* 🐛 BUG FIXES: · More datalake logs ([#7019](https://github.com/hcengineering/platform/issues/7019)) · Use proper blob size in backup ([#7032](https://github.com/hcengineering/platform/issues/7032)) 
* ⚙️ MISCELLANEOUS TASKS: · Update datalake configs ([#7033](https://github.com/hcengineering/platform/issues/7033)) 
* QFIX: · Fix setting ui metadata from config ([#7025](https://github.com/hcengineering/platform/issues/7025)) 
* UBERF-8528: · Share VS code formatter and plugin settings ([#7024](https://github.com/hcengineering/platform/issues/7024)) 

## [0.6.336] - 2024-10-23

* 🚀 FEATURES: · Convert guest to user via invite link ([#7014](https://github.com/hcengineering/platform/issues/7014)) 
* 🐛 BUG FIXES: · Use string content type instead of enum ([#7007](https://github.com/hcengineering/platform/issues/7007)) · Workspace creation with index enabled ([#7013](https://github.com/hcengineering/platform/issues/7013)) · Allow empty string filters ([#7010](https://github.com/hcengineering/platform/issues/7010)) · Datalake logs and fixes ([#7015](https://github.com/hcengineering/platform/issues/7015)) · Datalake fixes and perftest ([#7016](https://github.com/hcengineering/platform/issues/7016)) · Datalake memory limit issue ([#7018](https://github.com/hcengineering/platform/issues/7018)) · Cockroach ([#6965](https://github.com/hcengineering/platform/issues/6965)) 
* UBERF-8525: · Fix Github stuck on adding new integrations ([#7009](https://github.com/hcengineering/platform/issues/7009)) 

## [0.6.334] - 2024-10-21

* 🐛 BUG FIXES: · Backup check tool ([#6997](https://github.com/hcengineering/platform/issues/6997)) · Pass isDerived to apply ([#7001](https://github.com/hcengineering/platform/issues/7001)) · Another attempt to migrate empty document fields ([#7004](https://github.com/hcengineering/platform/issues/7004)) 
* ⚙️ MISCELLANEOUS TASKS: · Release notes · Posthog config to disable unneeded stuff ([#6986](https://github.com/hcengineering/platform/issues/6986)) 
* QFIX: · Extend patch version values range in PG ([#7005](https://github.com/hcengineering/platform/issues/7005)) 
* UBERF-8504: · Fix DocSyncInfo in transactions ([#6998](https://github.com/hcengineering/platform/issues/6998)) 
* UBERF-8508: · Get rid of Mongo in storage adapter ([#6989](https://github.com/hcengineering/platform/issues/6989)) 
* UBERF-8517: · Fix github external sync ([#6999](https://github.com/hcengineering/platform/issues/6999)) 
* UBERF-8518: · Optimize client model ([#7000](https://github.com/hcengineering/platform/issues/7000)) 
* UBERF-8512: · Fix acc memory leak ([#7002](https://github.com/hcengineering/platform/issues/7002)) 

## [0.6.333] - 2024-10-20

* 🚀 FEATURES: · Ws upgrade logging ([#6967](https://github.com/hcengineering/platform/issues/6967)) · Datalake worker initial version ([#6952](https://github.com/hcengineering/platform/issues/6952)) 
* 🐛 BUG FIXES: · Reverse scroll bar scrolling with bar pull ([#6968](https://github.com/hcengineering/platform/issues/6968)) · Use ordered list start attribute ([#6974](https://github.com/hcengineering/platform/issues/6974)) 
* UBERF-8427: · Fix desktop oauth flow ([#6975](https://github.com/hcengineering/platform/issues/6975)) 
* UBERF-8500: · Improve OIDC init logging ([#6981](https://github.com/hcengineering/platform/issues/6981)) 
* UBERF-8510: · Fix OOM in backup service ([#6973](https://github.com/hcengineering/platform/issues/6973)) 
* UBERF-8516: · Stable mentions popup ([#6993](https://github.com/hcengineering/platform/issues/6993)) 
* QFIX: · Pass file uuid to uppy metadata ([#6985](https://github.com/hcengineering/platform/issues/6985)) 
* UBERF-8509: · Fix docx to html conversion ([#6970](https://github.com/hcengineering/platform/issues/6970)) 
* UBERF-8511: · Configurable account db ns ([#6978](https://github.com/hcengineering/platform/issues/6978)) 

## [0.6.331] - 2024-10-16

* UBERF-8499: · Optimize indexer operation ([#6959](https://github.com/hcengineering/platform/issues/6959)) 

## [0.6.330] - 2024-10-16

* 🚀 FEATURES: · Tabs updates ([#6956](https://github.com/hcengineering/platform/issues/6956)) 
* 🐛 BUG FIXES: · Revert document content field rename ([#6955](https://github.com/hcengineering/platform/issues/6955)) · Merge issue · Calendar and gmail services ([#6918](https://github.com/hcengineering/platform/issues/6918)) · Under maintenance warning message ([#6930](https://github.com/hcengineering/platform/issues/6930)) · Use const slack link ([#6935](https://github.com/hcengineering/platform/issues/6935)) · Chat navigator font size ([#6947](https://github.com/hcengineering/platform/issues/6947)) 
* UBERF-8455: · Fix admin users ([#6909](https://github.com/hcengineering/platform/issues/6909)) 
* UBERF-8461: · Fix migration do not clean backup info ([#6913](https://github.com/hcengineering/platform/issues/6913)) 
* UBERF-8469: · Fix exit from github service ([#6921](https://github.com/hcengineering/platform/issues/6921)) 
* QFIX: · Disable applicant preview ([#6962](https://github.com/hcengineering/platform/issues/6962)) 

## [0.6.329] - 2024-10-16

* 🚀 FEATURES: · Move tool speed ([#6949](https://github.com/hcengineering/platform/issues/6949)) · Tabs updates ([#6956](https://github.com/hcengineering/platform/issues/6956)) 
* 🐛 BUG FIXES: · Calendar and gmail services ([#6918](https://github.com/hcengineering/platform/issues/6918)) · Under maintenance warning message ([#6930](https://github.com/hcengineering/platform/issues/6930)) · Use const slack link ([#6935](https://github.com/hcengineering/platform/issues/6935)) · Recreate elastic ([#6945](https://github.com/hcengineering/platform/issues/6945)) · Move tool ([#6948](https://github.com/hcengineering/platform/issues/6948)) · Chat navigator font size ([#6947](https://github.com/hcengineering/platform/issues/6947)) 
* UBERF-8429: · Allow to disable sign-ups ([#6934](https://github.com/hcengineering/platform/issues/6934)) 
* UBERF-8469: · Fix exit from github service ([#6921](https://github.com/hcengineering/platform/issues/6921)) 
* UBERF-8499: · Use our generateId for ydocs ([#6958](https://github.com/hcengineering/platform/issues/6958)) · Optimize indexer operation ([#6959](https://github.com/hcengineering/platform/issues/6959)) 
* UBERF-8480: · Configurable liveness condition for upgrade ([#6943](https://github.com/hcengineering/platform/issues/6943)) 
* UBERF-8481: · Upgrade desktop upgrade UX ([#6957](https://github.com/hcengineering/platform/issues/6957)) 
* UBERF-8485: · Fix sounds ([#6944](https://github.com/hcengineering/platform/issues/6944)) 

## [0.6.328] - 2024-10-14

* UBERF-8461: · Fix migration do not clean backup info ([#6913](https://github.com/hcengineering/platform/issues/6913)) 

## [0.6.327] - 2024-10-14

* 🐛 BUG FIXES: · Translate for ru.json ([#6907](https://github.com/hcengineering/platform/issues/6907)) · Merge issue 

## [0.6.326] - 2024-10-13

* 🐛 BUG FIXES: · Bunch of GitHub integration issues faced by Vlang ([#6839](https://github.com/hcengineering/platform/issues/6839)) · Love records ([#6889](https://github.com/hcengineering/platform/issues/6889)) · Tabs nav ([#6898](https://github.com/hcengineering/platform/issues/6898)) 
* UBERF-7911: · Branding worker ([#6858](https://github.com/hcengineering/platform/issues/6858)) 
* UBERF-8426: · Controlled account db migration ([#6885](https://github.com/hcengineering/platform/issues/6885)) 
* UBERF-8445: · More smart admin mode ([#6897](https://github.com/hcengineering/platform/issues/6897)) 
* UBERF-8455: · Fix admin users ([#6909](https://github.com/hcengineering/platform/issues/6909)) 

## [0.6.325] - 2024-10-12

* 🐛 BUG FIXES: · Tabs nav ([#6898](https://github.com/hcengineering/platform/issues/6898)) 
* UBERF-8445: · More smart admin mode ([#6897](https://github.com/hcengineering/platform/issues/6897)) 

## [0.6.324] - 2024-10-12

* 🐛 BUG FIXES: · Love records ([#6889](https://github.com/hcengineering/platform/issues/6889)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog 

## [0.6.323] - 2024-10-11

* 🚀 FEATURES: · Tabs pinning ([#6874](https://github.com/hcengineering/platform/issues/6874)) 

## [0.6.322] - 2024-10-10

* 🐛 BUG FIXES: · Move tool v2 ([#6852](https://github.com/hcengineering/platform/issues/6852)) · Pinned tabs and create tab ([#6864](https://github.com/hcengineering/platform/issues/6864)) · Code block formatting in one line ([#6866](https://github.com/hcengineering/platform/issues/6866)) · For remove from non default stores ([#6861](https://github.com/hcengineering/platform/issues/6861)) 

## [0.6.320] - 2024-10-09

* 🚀 FEATURES: · Jemalloc2 for our pods ([#6823](https://github.com/hcengineering/platform/issues/6823)) 
* 🐛 BUG FIXES: · Hr ([#6842](https://github.com/hcengineering/platform/issues/6842)) · Unreadable channels and duplicated inbox cards ([#6838](https://github.com/hcengineering/platform/issues/6838)) · Video autoclose ([#6843](https://github.com/hcengineering/platform/issues/6843)) 
* UBERF-8376: · Move indexer from server-core ([#6829](https://github.com/hcengineering/platform/issues/6829)) 
* UBERF-8379: · Fix workspace creation and missing plugin configuration ([#6832](https://github.com/hcengineering/platform/issues/6832)) 

## [0.6.319] - 2024-10-07

* 🐛 BUG FIXES: · Extra characters in UI ([#6826](https://github.com/hcengineering/platform/issues/6826)) · Disable auto code highlight ([#6824](https://github.com/hcengineering/platform/issues/6824)) · Move tool ([#6825](https://github.com/hcengineering/platform/issues/6825)) 
* UBERF-7863: · Fix duplicate review comment ([#6827](https://github.com/hcengineering/platform/issues/6827)) 

## [0.6.318] - 2024-10-07

* 🐛 BUG FIXES: · Uitests ([#6804](https://github.com/hcengineering/platform/issues/6804)) · Documents ([#6816](https://github.com/hcengineering/platform/issues/6816)) · Documents search ([#6818](https://github.com/hcengineering/platform/issues/6818)) 
* ⚙️ MISCELLANEOUS TASKS: · Last tab instead of create new ([#6817](https://github.com/hcengineering/platform/issues/6817)) 
* UBERF-8353: · Reduce number of asyncs ([#6806](https://github.com/hcengineering/platform/issues/6806)) 
* UBERF-8368: · Fix review/reviewthread sync ([#6821](https://github.com/hcengineering/platform/issues/6821)) 
* UBERF-8301: · Improve desktop app update UX ([#6808](https://github.com/hcengineering/platform/issues/6808)) 
* UBERF-8357: · Remove node fetch from account and services ([#6812](https://github.com/hcengineering/platform/issues/6812)) 

## [0.6.317] - 2024-10-03

* 🐛 BUG FIXES: · Tabs on desktop and during workspace switch ([#6795](https://github.com/hcengineering/platform/issues/6795)) · More robust locators ([#6796](https://github.com/hcengineering/platform/issues/6796)) · More fixed locators in tests ([#6799](https://github.com/hcengineering/platform/issues/6799)) 
* ⚙️ MISCELLANEOUS TASKS: · Only from tests · Only from tests 
* QFIX: · Empty where clause ([#6793](https://github.com/hcengineering/platform/issues/6793)) · Final account migration adjustments ([#6801](https://github.com/hcengineering/platform/issues/6801)) 
* UBERF-8328: · Fail CI on docker push failure ([#6794](https://github.com/hcengineering/platform/issues/6794)) 
* UBERF-8339: · Fix workspace selector sorting ([#6792](https://github.com/hcengineering/platform/issues/6792)) 
* FIIX: · Disable failing planner test ([#6802](https://github.com/hcengineering/platform/issues/6802)) 

## [0.6.316] - 2024-10-03

* 🚀 FEATURES: · Add workbench tabs ([#6788](https://github.com/hcengineering/platform/issues/6788)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version 
* QFIX: · Account migration ([#6787](https://github.com/hcengineering/platform/issues/6787)) 
* UBERF-8333: · Retry WS handshake ([#6786](https://github.com/hcengineering/platform/issues/6786)) 

## [0.6.315] - 2024-10-02

* 🚀 FEATURES: · Add chat and inbox fixes ([#6779](https://github.com/hcengineering/platform/issues/6779)) 
* 🐛 BUG FIXES: · Published packages and bump script ([#6778](https://github.com/hcengineering/platform/issues/6778)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version to 315 
* UBERF-8324: · Fix null in external sync and todos ([#6777](https://github.com/hcengineering/platform/issues/6777)) 
* UBERF-8330: · Smarter Mongo indices init for account ([#6783](https://github.com/hcengineering/platform/issues/6783)) 
* EZQMS-1213: · Gets rid of tosorted ([#6775](https://github.com/hcengineering/platform/issues/6775)) 

## [0.6.314] - 2024-10-01

* 🐛 BUG FIXES: · Pinned channels double selection ([#6758](https://github.com/hcengineering/platform/issues/6758)) · More tooltips ([#6767](https://github.com/hcengineering/platform/issues/6767)) · Missing actions in directs header ([#6771](https://github.com/hcengineering/platform/issues/6771)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version 
* UBERF-8169: · Account on postgres ([#6745](https://github.com/hcengineering/platform/issues/6745)) · Move account DB tool ([#6772](https://github.com/hcengineering/platform/issues/6772)) 
* UBERF-8310: · Optimize backup service ([#6763](https://github.com/hcengineering/platform/issues/6763)) 
* UBERF-8313: · Fix select workspace sorting ([#6766](https://github.com/hcengineering/platform/issues/6766)) 
* UBERF-8304: · Retry fetch when updating ws info ([#6757](https://github.com/hcengineering/platform/issues/6757)) 

## [0.6.313] - 2024-09-27

* ⚙️ MISCELLANEOUS TASKS: · Model version to check upgrade 
* UBERF-8302: · Fix lastVisit ([#6755](https://github.com/hcengineering/platform/issues/6755)) 

## [0.6.312] - 2024-09-27

* 🐛 BUG FIXES: · Sql lookup ([#6744](https://github.com/hcengineering/platform/issues/6744)) · Tg parsing error for inline actions ([#6747](https://github.com/hcengineering/platform/issues/6747)) · For blobs backup ([#6751](https://github.com/hcengineering/platform/issues/6751)) · Sidebar borders ([#6752](https://github.com/hcengineering/platform/issues/6752)) 
* ⚙️ MISCELLANEOUS TASKS: · Version 
* UBERF-8285: · Fix backup service lastVisit check ([#6738](https://github.com/hcengineering/platform/issues/6738)) 
* UBERF-8288: · Fix archiving a channel ([#6750](https://github.com/hcengineering/platform/issues/6750)) 
* UBERF-8294: · Do not upgrade stale workspaces ([#6748](https://github.com/hcengineering/platform/issues/6748)) 

## [0.6.311] - 2024-09-26

* 🐛 BUG FIXES: · Fallback to name avatar in case of img error ([#6729](https://github.com/hcengineering/platform/issues/6729)) 
* UBERF-8277: · Fix blobs backup ([#6730](https://github.com/hcengineering/platform/issues/6730)) 
* UBERF-8280: · Ping properly from server ([#6733](https://github.com/hcengineering/platform/issues/6733)) 
* UBERF-8282: · Fix ws deps ([#6735](https://github.com/hcengineering/platform/issues/6735)) 

## [0.6.310] - 2024-09-25

* 🐛 BUG FIXES: · Auth for notion import. Fix readme ([#6720](https://github.com/hcengineering/platform/issues/6720)) · Model version 
* UBERF-8261: · Fix backup service ([#6725](https://github.com/hcengineering/platform/issues/6725)) 

## [0.6.309] - 2024-09-25

* 🚀 FEATURES: · Show lost files tool ([#6721](https://github.com/hcengineering/platform/issues/6721)) · Restore lost markup tool ([#6724](https://github.com/hcengineering/platform/issues/6724)) 

## [0.6.308] - 2024-09-25

* 🚀 FEATURES: · Add notifications middleware to do not send updates for all users ([#6714](https://github.com/hcengineering/platform/issues/6714)) 
* 🐛 BUG FIXES: · Attachment actions icon and image size ([#6710](https://github.com/hcengineering/platform/issues/6710)) · Inbox rerender on delete ([#6709](https://github.com/hcengineering/platform/issues/6709)) 
* ⚙️ MISCELLANEOUS TASKS: · Migration version 
* UBERF-8259: · Do not store system model into DB ([#6716](https://github.com/hcengineering/platform/issues/6716)) 

## [0.6.307] - 2024-09-24

* 🐛 BUG FIXES: · Rush fast-format ([#6702](https://github.com/hcengineering/platform/issues/6702)) 
* PLANNER: · Fixed DateEditor layout ([#6696](https://github.com/hcengineering/platform/issues/6696)) 
* UBERF-8251: · Fix github re-authenticate ([#6704](https://github.com/hcengineering/platform/issues/6704)) 

## [0.6.306] - 2024-09-24

* 🐛 BUG FIXES: · Thread blink in inbox ([#6686](https://github.com/hcengineering/platform/issues/6686)) · Clear todo description ([#6697](https://github.com/hcengineering/platform/issues/6697)) · Adjust image size in message attachments ([#6698](https://github.com/hcengineering/platform/issues/6698)) · Report invalid content errors to analytics ([#6699](https://github.com/hcengineering/platform/issues/6699)) · Remove workspace id from indexeddb document name ([#6700](https://github.com/hcengineering/platform/issues/6700)) · Ignore disabled workspaces in sync-files tool ([#6701](https://github.com/hcengineering/platform/issues/6701)) 
* 🧪 TESTING: · Drive. basic tests ([#6655](https://github.com/hcengineering/platform/issues/6655)) 

## [0.6.305] - 2024-09-23

* 🚀 FEATURES: · Add employee action to start conversation ([#6687](https://github.com/hcengineering/platform/issues/6687)) 
* 🐛 BUG FIXES: · Better handling png image size for scale < 2 ([#6688](https://github.com/hcengineering/platform/issues/6688)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version 
* UBERF-8226: · Fix backup service OOM ([#6683](https://github.com/hcengineering/platform/issues/6683)) 
* UBERF-8210: · Allow only one upgrade ([#6684](https://github.com/hcengineering/platform/issues/6684)) 

## [0.6.304] - 2024-09-23

* 🚀 FEATURES: · Add chat fixes ([#6682](https://github.com/hcengineering/platform/issues/6682)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version 
* UBERF-8224: · Fix undefined rejection exception ([#6677](https://github.com/hcengineering/platform/issues/6677)) 

## [0.6.303] - 2024-09-23

* UBERF-8185: · Fix duplicate hierarchy clases ([#6660](https://github.com/hcengineering/platform/issues/6660)) 

## [0.6.302] - 2024-09-20

* ⚙️ MISCELLANEOUS TASKS: · Model version 
* PLANNER: · Updated ToDos layout ([#6651](https://github.com/hcengineering/platform/issues/6651)) 
* EQZMS-1175: · Improve copy UX when clipboard is not available ([#6657](https://github.com/hcengineering/platform/issues/6657)) 
* UBERF-8195: · Support openid auth ([#6654](https://github.com/hcengineering/platform/issues/6654)) 

## [0.6.301] - 2024-09-20

* 🚀 FEATURES: · Add translate message action ([#6609](https://github.com/hcengineering/platform/issues/6609)) · Add config for baseUrl ([#6645](https://github.com/hcengineering/platform/issues/6645)) 
* 🐛 BUG FIXES: · Duplicated issues contexts ([#6641](https://github.com/hcengineering/platform/issues/6641)) · Office join ([#6650](https://github.com/hcengineering/platform/issues/6650)) 
* ⚙️ MISCELLANEOUS TASKS: · Bold.ru mentions ([#6649](https://github.com/hcengineering/platform/issues/6649)) · Model version 
* PLANNER: · Fixed sticking to events when resizing ([#6648](https://github.com/hcengineering/platform/issues/6648)) 
* UBERF-8163: · Split ws into server + desktop backup support ([#6630](https://github.com/hcengineering/platform/issues/6630)) 

## [0.6.300] - 2024-09-19

* 🐛 BUG FIXES: · Video widget ([#6624](https://github.com/hcengineering/platform/issues/6624)) 
* UBERF-6593: · Add document content tests ([#6594](https://github.com/hcengineering/platform/issues/6594)) 

## [0.6.299] - 2024-09-18

* 🚀 FEATURES: · Improve links behavior in the editor ([#6612](https://github.com/hcengineering/platform/issues/6612)) 
* 🐛 BUG FIXES: · Add codeblock commands to highlighted extension ([#6613](https://github.com/hcengineering/platform/issues/6613)) · Message styles ([#6623](https://github.com/hcengineering/platform/issues/6623)) 
* ⚙️ MISCELLANEOUS TASKS: · Update tiptap to v2.6.6 ([#6596](https://github.com/hcengineering/platform/issues/6596)) 
* UBEFR-8162: · Fix default language ([#6621](https://github.com/hcengineering/platform/issues/6621)) 

## [0.6.298] - 2024-09-18

* 🚀 FEATURES: · Add widgets sidebar ([#6578](https://github.com/hcengineering/platform/issues/6578)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version to v0.6.298 
* UBERF-8139: · Check server version when connecting from client ([#6608](https://github.com/hcengineering/platform/issues/6608)) 
* UBERF-8150: · Update to fresh mongo ([#6603](https://github.com/hcengineering/platform/issues/6603)) 

## [0.6.297] - 2024-09-17

* 🚀 FEATURES: · Cockroach migrator ([#6590](https://github.com/hcengineering/platform/issues/6590)) 
* 🐛 BUG FIXES: · DbAdapterManager to handle domain names ([#6605](https://github.com/hcengineering/platform/issues/6605)) 
* UBERF-8149: · Reset workspace attempts counter tool ([#6604](https://github.com/hcengineering/platform/issues/6604)) 

## [0.6.296] - 2024-09-17

* 🐛 BUG FIXES: · Get rid of NOTIFY_INBOX_ONLY env variable ([#6592](https://github.com/hcengineering/platform/issues/6592)) 
* UBERF-8122: · Fix backup service 

## [0.6.295] - 2024-09-16

* 🚀 FEATURES: · Add test for downloading PDF ([#6541](https://github.com/hcengineering/platform/issues/6541)) 
* 🐛 BUG FIXES: · Proper order of versions in upgrade string ([#6567](https://github.com/hcengineering/platform/issues/6567)) · Check for deleted objects ([#6581](https://github.com/hcengineering/platform/issues/6581)) · Double tx apply with needResult true ([#6585](https://github.com/hcengineering/platform/issues/6585)) 
* ⚙️ MISCELLANEOUS TASKS: · UWS ([#6575](https://github.com/hcengineering/platform/issues/6575)) 
* UBERF-8098: · Basic client metrics in UI ([#6556](https://github.com/hcengineering/platform/issues/6556)) 
* UBERF-8120: · Fix high CPU usage in github service ([#6573](https://github.com/hcengineering/platform/issues/6573)) 
* UBERF-8122: · Fix backup service ([#6577](https://github.com/hcengineering/platform/issues/6577)) 

## [0.6.294] - 2024-09-13

* 🚀 FEATURES: · Hls video support ([#6542](https://github.com/hcengineering/platform/issues/6542)) · Calendar ([#6562](https://github.com/hcengineering/platform/issues/6562)) 
* 🐛 BUG FIXES: · Account email update ([#6551](https://github.com/hcengineering/platform/issues/6551)) · Codeblock various fixes ([#6550](https://github.com/hcengineering/platform/issues/6550)) · Tooltip arrow ([#6450](https://github.com/hcengineering/platform/issues/6450)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version 
* UBERF-8053: · Github fixes ([#6554](https://github.com/hcengineering/platform/issues/6554)) 
* UBERF-8100: · Fix backup ([#6558](https://github.com/hcengineering/platform/issues/6558)) 
* UBERF-8102: · Remove client timeout on broadcast ([#6560](https://github.com/hcengineering/platform/issues/6560)) 
* UBERF-8095: · Fix server version ([#6553](https://github.com/hcengineering/platform/issues/6553)) 

## [0.6.293] - 2024-09-12

* 🚀 FEATURES: · Add Req 10 test ([#6458](https://github.com/hcengineering/platform/issues/6458)) 
* 🐛 BUG FIXES: · Channels hide and return autohide ([#6529](https://github.com/hcengineering/platform/issues/6529)) 
* ⚙️ MISCELLANEOUS TASKS: · QMS docker-compose.yaml so it can view and download PDF files ([#6507](https://github.com/hcengineering/platform/issues/6507)) · Model version 
* UBERF-8071: · Fix workspace service parallel param ([#6540](https://github.com/hcengineering/platform/issues/6540)) 
* UBERF-8083: · Optimize account by email search ([#6538](https://github.com/hcengineering/platform/issues/6538)) 
* EZQMS-1193: · Fix issues with drafting a controlled doc version from effective ([#6535](https://github.com/hcengineering/platform/issues/6535)) 

## [0.6.292] - 2024-09-11

* ⚙️ MISCELLANEOUS TASKS: · Duplicated directs ([#6516](https://github.com/hcengineering/platform/issues/6516)) · Model version 
* UBERF-7989: · Do not close thread on close popup with ecs ([#6519](https://github.com/hcengineering/platform/issues/6519)) 
* UBERF-8058: · Fix to allow create customers ([#6514](https://github.com/hcengineering/platform/issues/6514)) 
* UBERF-8069: · Rework loadModel to make it faster ([#6523](https://github.com/hcengineering/platform/issues/6523)) 
* UBERF-8068: · Rework space type delete UX ([#6525](https://github.com/hcengineering/platform/issues/6525)) 

## [0.6.291] - 2024-09-10

* UBERF-8060: · Fix user statuses and workspace selection ([#6512](https://github.com/hcengineering/platform/issues/6512)) 

## [0.6.289] - 2024-09-10

* 🚀 FEATURES: · Manual staging builds · Add move/copy flag to file moving tool ([#6459](https://github.com/hcengineering/platform/issues/6459)) · To send message from tg bot to channels ([#6472](https://github.com/hcengineering/platform/issues/6472)) · Codeblock syntax highlight ([#6505](https://github.com/hcengineering/platform/issues/6505)) · Add more github analytics ([#6506](https://github.com/hcengineering/platform/issues/6506)) 
* 🐛 BUG FIXES: · Improve codeblock wrapping ([#6440](https://github.com/hcengineering/platform/issues/6440)) · Upgrade failed ([#6432](https://github.com/hcengineering/platform/issues/6432)) · Model version to be same as in main · Build and push docker containers for s-prefixed tags ([#6442](https://github.com/hcengineering/platform/issues/6442)) · Copy template content when creating controlled document ([#6441](https://github.com/hcengineering/platform/issues/6441)) · Use workspace id in collaborator ([#6447](https://github.com/hcengineering/platform/issues/6447)) · URI encode datalake blob id and more workspace fixes ([#6449](https://github.com/hcengineering/platform/issues/6449)) · Adding person to department action ([#6455](https://github.com/hcengineering/platform/issues/6455)) · Host.docker.internal on linux ([#6443](https://github.com/hcengineering/platform/issues/6443)) ([#6451](https://github.com/hcengineering/platform/issues/6451)) · Pass actionPopup to action props ([#6467](https://github.com/hcengineering/platform/issues/6467)) · Retry requests to collaborator in case of failure ([#6468](https://github.com/hcengineering/platform/issues/6468)) · Document channel disappear after message write ([#6477](https://github.com/hcengineering/platform/issues/6477)) · Chat actions labels ([#6474](https://github.com/hcengineering/platform/issues/6474)) · Get rid of removeAllObjects by prefix ([#6479](https://github.com/hcengineering/platform/issues/6479)) · Remove prefixes from listStream method parameters ([#6480](https://github.com/hcengineering/platform/issues/6480)) · Implement better todos parsing ([#6497](https://github.com/hcengineering/platform/issues/6497)) · Extra notify marker in chat ([#6500](https://github.com/hcengineering/platform/issues/6500)) · Better nested todos parsing ([#6499](https://github.com/hcengineering/platform/issues/6499)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version · Changelog 
* UBERF-7684: · Workspace service ([#6460](https://github.com/hcengineering/platform/issues/6460)) 
* UBERF-7915: · Support tg bot attachments ([#6471](https://github.com/hcengineering/platform/issues/6471)) 
* UBERF-7922: · Split Server Storage to middlewares ([#6464](https://github.com/hcengineering/platform/issues/6464)) 
* UBERF-7985: · Fix private targets ([#6439](https://github.com/hcengineering/platform/issues/6439)) 
* UBERF-8005: · Add tests to tracker projects, fix failed tests ([#6454](https://github.com/hcengineering/platform/issues/6454)) 
* UBERF-8017: · Support updating workspace name and deleting workspace ([#6476](https://github.com/hcengineering/platform/issues/6476)) 
* UBERF-8044: · Staging model version ([#6492](https://github.com/hcengineering/platform/issues/6492)) 
* UBERF-8047: · Add tests to channels and chats ([#6496](https://github.com/hcengineering/platform/issues/6496)) 
* UBERF-8052: · Allow easy profiling of transactor ([#6502](https://github.com/hcengineering/platform/issues/6502)) 
* UBERF-8053: · Disable re-check for milestones · Disable re-check for milestones 
* EZQMS-1149: · Allow archiving effective doc ([#6489](https://github.com/hcengineering/platform/issues/6489)) 
* EZQMS-1171: · Drop h4-h6 during import of controlled doc ([#6487](https://github.com/hcengineering/platform/issues/6487)) 
* EZQMS-1185: · Fix delete document availability ([#6485](https://github.com/hcengineering/platform/issues/6485)) 
* QFIX: · Add fire and rocket smiley ([#6438](https://github.com/hcengineering/platform/issues/6438)) 
* UBERF-7684: · Add workspace pod to docker build ([#6465](https://github.com/hcengineering/platform/issues/6465)) 

## [0.6.288] - 2024-09-03

* 🚀 FEATURES: · Add move/copy flag to file moving tool ([#6459](https://github.com/hcengineering/platform/issues/6459)) 
* 🐛 BUG FIXES: · Adding person to department action ([#6455](https://github.com/hcengineering/platform/issues/6455)) · Pass actionPopup to action props ([#6467](https://github.com/hcengineering/platform/issues/6467)) · Document channel disappear after message write ([#6477](https://github.com/hcengineering/platform/issues/6477)) · Get rid of removeAllObjects by prefix ([#6479](https://github.com/hcengineering/platform/issues/6479)) 

## [0.6.287] - 2024-08-28

* 🚀 FEATURES: · Add openai chat ([#6411](https://github.com/hcengineering/platform/issues/6411)) · Add chat ui fixes ([#6419](https://github.com/hcengineering/platform/issues/6419)) · Add retry for docker push ([#6427](https://github.com/hcengineering/platform/issues/6427)) 
* 🐛 BUG FIXES: · Office popup join button ([#6421](https://github.com/hcengineering/platform/issues/6421)) · Activity for sharing tg messages ([#6420](https://github.com/hcengineering/platform/issues/6420)) · Office select device ([#6422](https://github.com/hcengineering/platform/issues/6422)) · Email notification ([#6425](https://github.com/hcengineering/platform/issues/6425)) · Wrong position of social media icon ([#6426](https://github.com/hcengineering/platform/issues/6426)) · Space security ([#6428](https://github.com/hcengineering/platform/issues/6428)) · Missing mention notification for chat messages ([#6429](https://github.com/hcengineering/platform/issues/6429)) · Bot popup closing ([#6430](https://github.com/hcengineering/platform/issues/6430)) 
* ⚙️ MISCELLANEOUS TASKS: · Apply for create workspace ([#6416](https://github.com/hcengineering/platform/issues/6416)) · Model version · Changelog · Docker staging push · Version 

## [0.6.286] - 2024-08-28

* 🐛 BUG FIXES: · Wrap lines in codeblock ([#6406](https://github.com/hcengineering/platform/issues/6406)) · Markdown migration tool ([#6407](https://github.com/hcengineering/platform/issues/6407)) · Workspace create ([#6413](https://github.com/hcengineering/platform/issues/6413)) 
* UBERF-7959: · Fix async issues ([#6409](https://github.com/hcengineering/platform/issues/6409)) 

## [0.6.285a] - 2024-08-27

* 🐛 BUG FIXES: · Ignore ydoc migration errors ([#6402](https://github.com/hcengineering/platform/issues/6402)) 
* ⚙️ MISCELLANEOUS TASKS: · Readme ([#6401](https://github.com/hcengineering/platform/issues/6401)) 

## [0.6.285] - 2024-08-27

* 🚀 FEATURES: · Markup migration tool ([#6398](https://github.com/hcengineering/platform/issues/6398)) 
* 🐛 BUG FIXES: · A bulk of sentry errors ([#6399](https://github.com/hcengineering/platform/issues/6399)) · Migrate collaborative markup in activity ([#6400](https://github.com/hcengineering/platform/issues/6400)) 
* ⚙️ MISCELLANEOUS TASKS: · Readme / disable CI build for main commits · Version 
* UBERF-7944: · Support for not_planed close for issues ([#6396](https://github.com/hcengineering/platform/issues/6396)) 
* UBERF-7946: · Remove bulk in mongo adapter ([#6395](https://github.com/hcengineering/platform/issues/6395)) 

## [0.6.284a] - 2024-08-26

* 🐛 BUG FIXES: · Changelog · Parallel blob processing in tools an migration ([#6391](https://github.com/hcengineering/platform/issues/6391)) 
* UBERF-7924: · Fix workspace variable in logs + reuse installation account ([#6376](https://github.com/hcengineering/platform/issues/6376)) 

## [0.6.284] - 2024-08-23

* 🚀 FEATURES: · Add who is typing ([#6373](https://github.com/hcengineering/platform/issues/6373)) · Support worksapce ([#6360](https://github.com/hcengineering/platform/issues/6360)) 
* 🐛 BUG FIXES: · Do not resolve srcset for urls ([#6367](https://github.com/hcengineering/platform/issues/6367)) · Add limit and retries to move files tool ([#6368](https://github.com/hcengineering/platform/issues/6368)) 
* ⚙️ MISCELLANEOUS TASKS: · Exist openai plugin ([#6377](https://github.com/hcengineering/platform/issues/6377)) · Model version 
* UBERF-7927: · Get rid of product id ([#6375](https://github.com/hcengineering/platform/issues/6375)) 

## [0.6.283] - 2024-08-21

* ⚙️ MISCELLANEOUS TASKS: · Duplicated contexts ([#6366](https://github.com/hcengineering/platform/issues/6366)) · Model version 
* EZQMS-1166: · Revamp doc library sections model ([#6358](https://github.com/hcengineering/platform/issues/6358)) 

## [0.6.282] - 2024-08-21

* 🐛 BUG FIXES: · Extra tg notifications ([#6362](https://github.com/hcengineering/platform/issues/6362)) · Provider selection in aggregator ([#6365](https://github.com/hcengineering/platform/issues/6365)) 

## [0.6.281a] - 2024-08-21

* 🐛 BUG FIXES: · Do not resolve storage provider in getUrl ([#6361](https://github.com/hcengineering/platform/issues/6361)) 
* ⚙️ MISCELLANEOUS TASKS: · Readme.md · Changelog · Changelog with proper refs 

## [0.6.281] - 2024-08-20

* 🚀 FEATURES: · Add logs on notify request ([#6295](https://github.com/hcengineering/platform/issues/6295)) 
* 🐛 BUG FIXES: · Does not send email confirmation when signup with otp ([#6292](https://github.com/hcengineering/platform/issues/6292)) · Wrong spaces ([#6296](https://github.com/hcengineering/platform/issues/6296)) · Build print and sign services for arm64 ([#6321](https://github.com/hcengineering/platform/issues/6321)) · Telegram bot ([#6323](https://github.com/hcengineering/platform/issues/6323)) · Email notifications ([#6328](https://github.com/hcengineering/platform/issues/6328)) · Ne search ([#6330](https://github.com/hcengineering/platform/issues/6330)) · Notifications on pr create ([#6332](https://github.com/hcengineering/platform/issues/6332)) · Analytics collector and ai-bot services ([#6331](https://github.com/hcengineering/platform/issues/6331)) · FulltextUrl in account ([#6349](https://github.com/hcengineering/platform/issues/6349)) · FullTextUrl ([#6355](https://github.com/hcengineering/platform/issues/6355)) · Docker build order ([#6354](https://github.com/hcengineering/platform/issues/6354)) · Clone model requests on server if possible ([#6353](https://github.com/hcengineering/platform/issues/6353)) 
* ⚙️ MISCELLANEOUS TASKS: · Model version to 0.6.281 
* QFIX: · Change default filter for my docs in controlled documents ([#6290](https://github.com/hcengineering/platform/issues/6290)) · Fix duplicates in inbox from multiple accounts ([#6306](https://github.com/hcengineering/platform/issues/6306)) 
* UBERF-7690: · Local mongo setup configuration ([#6335](https://github.com/hcengineering/platform/issues/6335)) · Performance fixes ([#6336](https://github.com/hcengineering/platform/issues/6336)) · Use query joiner for server/trigger requests ([#6339](https://github.com/hcengineering/platform/issues/6339)) · Skip space security for >=85% of spaces and do on result check ([#6338](https://github.com/hcengineering/platform/issues/6338)) · Operation log support + fixes ([#6337](https://github.com/hcengineering/platform/issues/6337)) · Trigger improvements ([#6340](https://github.com/hcengineering/platform/issues/6340)) 
* UBERF-7790: · Fix connection timeout issue ([#6301](https://github.com/hcengineering/platform/issues/6301)) 
* UBERF-7836: · Fix github integeration ([#6313](https://github.com/hcengineering/platform/issues/6313)) 
* UBERF-7854: · Fix live query $lookup update ([#6304](https://github.com/hcengineering/platform/issues/6304)) 
* UBERF-7865: · Fix wrong access to not created collection ([#6315](https://github.com/hcengineering/platform/issues/6315)) · Final fix ([#6316](https://github.com/hcengineering/platform/issues/6316)) 
* [PART-1]: · New analytics events ([#6319](https://github.com/hcengineering/platform/issues/6319)) 
* UBERF-7856: · Fix desktop publishing CI ([#6308](https://github.com/hcengineering/platform/issues/6308)) 

## [0.6.280a] - 2024-08-12

* 🐛 BUG FIXES: · Changelog 
* UBERF-7865: · Final fix ([#6316](https://github.com/hcengineering/platform/issues/6316)) 

## [0.6.280] - 2024-08-11

* UBERF-7836: · Fix github integeration ([#6313](https://github.com/hcengineering/platform/issues/6313)) 
* UBERF-7865: · Fix wrong access to not created collection ([#6315](https://github.com/hcengineering/platform/issues/6315)) 
* UBERF-7856: · Fix desktop publishing CI ([#6308](https://github.com/hcengineering/platform/issues/6308)) 

## [0.6.279] - 2024-08-09

* QFIX: · Fix duplicates in inbox from multiple accounts ([#6306](https://github.com/hcengineering/platform/issues/6306)) 
* UBERF-7790: · Fix connection timeout issue ([#6301](https://github.com/hcengineering/platform/issues/6301)) 
* UBERF-7854: · Fix live query $lookup update ([#6304](https://github.com/hcengineering/platform/issues/6304)) 

## [0.6.278] - 2024-08-09

* ⚙️ MISCELLANEOUS TASKS: · Model version 

## [0.6.277] - 2024-08-08

* 🚀 FEATURES: · Add telegram bot fixes ([#6281](https://github.com/hcengineering/platform/issues/6281)) 
* 🐛 BUG FIXES: · ServerStorage ([#6283](https://github.com/hcengineering/platform/issues/6283)) 
* UBERF-7604: · Telegram notifications service ([#6182](https://github.com/hcengineering/platform/issues/6182)) 
* EZQMS-1029: · Fix permissions check for creating project doc from context menu ([#6282](https://github.com/hcengineering/platform/issues/6282)) 
* EZQMS-1160: · Fix slice type ([#6280](https://github.com/hcengineering/platform/issues/6280)) 

## [0.6.276] - 2024-08-07

* 🚀 FEATURES: · Add test for req-7 ([#6233](https://github.com/hcengineering/platform/issues/6233)) 
* 🐛 BUG FIXES: · Rekoni service build ([#6255](https://github.com/hcengineering/platform/issues/6255)) · Indexer use of $ne ([#6264](https://github.com/hcengineering/platform/issues/6264)) · Docke target to include ai-bot · Love connection ([#6275](https://github.com/hcengineering/platform/issues/6275)) 
* ⚙️ MISCELLANEOUS TASKS: · Version to v0.6.276 
* UBERF-7604: · Preparation for telegram notifications ([#6123](https://github.com/hcengineering/platform/issues/6123)) 
* UBERF-7717: · Reduce finds on members changed ([#6219](https://github.com/hcengineering/platform/issues/6219)) 
* UBERF-7753: · Change auth approach for providers ([#6234](https://github.com/hcengineering/platform/issues/6234)) 
* UBERF-7817: · Fix tag element query ([#6267](https://github.com/hcengineering/platform/issues/6267)) 
* UBERF-7765: · Retry config load desktop ([#6272](https://github.com/hcengineering/platform/issues/6272)) · Only retry network errors when loading config for desktop app ([#6274](https://github.com/hcengineering/platform/issues/6274)) 

## [0.6.275] - 2024-08-05

* 🐛 BUG FIXES: · Doc index state indexes ([#6254](https://github.com/hcengineering/platform/issues/6254)) 

## [0.6.274] - 2024-08-05

* 🐛 BUG FIXES: · Properly update uppy state ([#6252](https://github.com/hcengineering/platform/issues/6252)) · Remove provider from preview config ([#6253](https://github.com/hcengineering/platform/issues/6253)) 
* ⚙️ MISCELLANEOUS TASKS: · Slow trigger ([#6240](https://github.com/hcengineering/platform/issues/6240)) 
* UBERF-7794: · Restore related issues control ([#6244](https://github.com/hcengineering/platform/issues/6244)) 
* UBERF-7796: · Rework index creation logic ([#6246](https://github.com/hcengineering/platform/issues/6246)) 
* UBERF-7800: · Space improvements ([#6250](https://github.com/hcengineering/platform/issues/6250)) 
* UBERF-7764: · Improve space permissions query ([#6236](https://github.com/hcengineering/platform/issues/6236)) 

## [0.6.273] - 2024-08-02

* 🚀 FEATURES: · Add file moving tool ([#6223](https://github.com/hcengineering/platform/issues/6223)) 

## [0.6.272] - 2024-08-02

* ⚙️ MISCELLANEOUS TASKS: · Model version to v0.6.272 · Model check for now 

## [0.6.271] - 2024-08-02

* 🚀 FEATURES: · Add privacy policy link to Help & Support side panel ([#6221](https://github.com/hcengineering/platform/issues/6221)) 
* 🐛 BUG FIXES: · I18n ([#6222](https://github.com/hcengineering/platform/issues/6222)) · Workspace initializer ([#6232](https://github.com/hcengineering/platform/issues/6232)) · Load of applications in tables/lists/kanban ([#6231](https://github.com/hcengineering/platform/issues/6231)) 
* ⚙️ MISCELLANEOUS TASKS: · Dev version ([#6228](https://github.com/hcengineering/platform/issues/6228)) 
* UBERF-7776: · Get rid of blobs in UI ([#6226](https://github.com/hcengineering/platform/issues/6226)) 

## [0.6.271rc3] - 2024-08-01

* 🐛 BUG FIXES: · Wrong merge 

## [0.6.271rc2] - 2024-08-01

* ⚙️ MISCELLANEOUS TASKS: · Model version and fix check script ([#6218](https://github.com/hcengineering/platform/issues/6218)) 

## [0.6.271rc1] - 2024-08-01

* 🚀 FEATURES: · Add login and signup by code ([#6097](https://github.com/hcengineering/platform/issues/6097)) 
* 🐛 BUG FIXES: · Guest links ([#6172](https://github.com/hcengineering/platform/issues/6172)) · Maintenance period warning ([#6179](https://github.com/hcengineering/platform/issues/6179)) · Message text alignment ([#6178](https://github.com/hcengineering/platform/issues/6178)) · For cases when fileType is null which causes infinite loading bug ([#6174](https://github.com/hcengineering/platform/issues/6174)) · Services connectivity ([#6193](https://github.com/hcengineering/platform/issues/6193)) · Otp code paste in mobile browsers ([#6197](https://github.com/hcengineering/platform/issues/6197)) · Love join ([#6209](https://github.com/hcengineering/platform/issues/6209)) · Model find space security ([#6210](https://github.com/hcengineering/platform/issues/6210)) · Drive UX fixes ([#6213](https://github.com/hcengineering/platform/issues/6213)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra log ([#6190](https://github.com/hcengineering/platform/issues/6190)) · Cross-platform docker build ([#6198](https://github.com/hcengineering/platform/issues/6198)) · Update hocuspocus version ([#6207](https://github.com/hcengineering/platform/issues/6207)) 
* EZQMS-1145: · Fixes doc import tool ([#6204](https://github.com/hcengineering/platform/issues/6204)) 
* UBERF-7016: · Hide channels without any activity long time ([#6176](https://github.com/hcengineering/platform/issues/6176)) 
* UBERF-7721: · Fixed event display ([#6175](https://github.com/hcengineering/platform/issues/6175)) 
* UBERF-7734: · Fix total with find with limit === 1 ([#6187](https://github.com/hcengineering/platform/issues/6187)) 
* UBERF-7743: · Make check-clean non blocking ([#6195](https://github.com/hcengineering/platform/issues/6195)) 
* UBERF-7749: · Use MONGO_OPTIONS properly ([#6200](https://github.com/hcengineering/platform/issues/6200)) 
* UBERF-7755: · Fix image toolbar visibility ([#6208](https://github.com/hcengineering/platform/issues/6208)) 

## [0.6.270] - 2024-07-30

* 🚀 FEATURES: · Add login and signup by code ([#6097](https://github.com/hcengineering/platform/issues/6097)) 
* 🐛 BUG FIXES: · Guest links ([#6172](https://github.com/hcengineering/platform/issues/6172)) · Maintenance period warning ([#6179](https://github.com/hcengineering/platform/issues/6179)) · Message text alignment ([#6178](https://github.com/hcengineering/platform/issues/6178)) · For cases when fileType is null which causes infinite loading bug ([#6174](https://github.com/hcengineering/platform/issues/6174)) 
* UBERF-7016: · Hide channels without any activity long time ([#6176](https://github.com/hcengineering/platform/issues/6176)) 
* UBERF-7721: · Fixed event display ([#6175](https://github.com/hcengineering/platform/issues/6175)) 
* UBERF-7734: · Fix total with find with limit === 1 ([#6187](https://github.com/hcengineering/platform/issues/6187)) 

## [0.6.269] - 2024-07-30

* 🚀 FEATURES: · Add login and signup by code ([#6097](https://github.com/hcengineering/platform/issues/6097)) 
* 🐛 BUG FIXES: · Add github to server pipeline ([#6170](https://github.com/hcengineering/platform/issues/6170)) · Maintenance period warning · Guest links ([#6172](https://github.com/hcengineering/platform/issues/6172)) · Guest links ([#6172](https://github.com/hcengineering/platform/issues/6172)) · Maintenance period warning ([#6179](https://github.com/hcengineering/platform/issues/6179)) · Message text alignment ([#6178](https://github.com/hcengineering/platform/issues/6178)) 
* UBERF-7016: · Hide channels without any activity long time ([#6176](https://github.com/hcengineering/platform/issues/6176)) 
* UBERF-7721: · Fixed event display ([#6175](https://github.com/hcengineering/platform/issues/6175)) · Fixed event display ([#6175](https://github.com/hcengineering/platform/issues/6175)) 

## [0.6.268] - 2024-07-29

* 🐛 BUG FIXES: · Desktop build · Get model hint ([#6163](https://github.com/hcengineering/platform/issues/6163)) · Desktop build 
* UBERF-7698: · Fix backup · Fix backup ([#6168](https://github.com/hcengineering/platform/issues/6168)) 
* UBERF-7705: · Maitenance warning for every transactor ([#6169](https://github.com/hcengineering/platform/issues/6169)) 

## [0.6.267] - 2024-07-29

* 🚀 FEATURES: · Add develop to build targets · Add develop to build targets · Add DB compact tool ([#6125](https://github.com/hcengineering/platform/issues/6125)) · Add develop to build targets · Add DB compact tool ([#6125](https://github.com/hcengineering/platform/issues/6125)) 
* 🐛 BUG FIXES: · Show statuses of not joined projects in all issues and filter ([#6128](https://github.com/hcengineering/platform/issues/6128)) · Thread messages pin ([#6129](https://github.com/hcengineering/platform/issues/6129)) · Multiple adding user to replied persons ([#6130](https://github.com/hcengineering/platform/issues/6130)) · Leave room ([#6150](https://github.com/hcengineering/platform/issues/6150)) · Capitalization in en lang strings, fix label for adding an issue to a Milestone ([#6142](https://github.com/hcengineering/platform/issues/6142)) · Leave room ([#6150](https://github.com/hcengineering/platform/issues/6150)) 
* ⚙️ MISCELLANEOUS TASKS: · Websocket compression by default · Websocket compression by default 
* EZQMS-1069: · Fix request model ([#6131](https://github.com/hcengineering/platform/issues/6131)) · Fix request model ([#6131](https://github.com/hcengineering/platform/issues/6131)) 
* UBERF-7543: · Add low level groupBy api and improve security space lookup ([#6126](https://github.com/hcengineering/platform/issues/6126)) · Add low level groupBy api and improve security space lookup ([#6126](https://github.com/hcengineering/platform/issues/6126)) 
* UBERF-7579: · Text editor actions ([#6103](https://github.com/hcengineering/platform/issues/6103)) 
* UBERF-7665: · Fix OOM on partial data ([#6134](https://github.com/hcengineering/platform/issues/6134)) · Fix OOM in sharp ([#6138](https://github.com/hcengineering/platform/issues/6138)) · Fix OOM in sharp ([#6138](https://github.com/hcengineering/platform/issues/6138)) 
* UBERF-7675: · Remove heading text action from compact editors ([#6143](https://github.com/hcengineering/platform/issues/6143)) · Remove heading text action from compact editors ([#6143](https://github.com/hcengineering/platform/issues/6143)) 
* UBERF-7682: · Fix mongo cursor on backup ([#6145](https://github.com/hcengineering/platform/issues/6145)) · Fix mongo cursor on backup ([#6145](https://github.com/hcengineering/platform/issues/6145)) 
* UBERF-7692: · Move FindAll slow print into mongo adapter ([#6152](https://github.com/hcengineering/platform/issues/6152)) · Move FindAll slow print into mongo adapter ([#6152](https://github.com/hcengineering/platform/issues/6152)) 

## [0.6.266] - 2024-07-24

* 🚀 FEATURES: · Qms guests ([#6099](https://github.com/hcengineering/platform/issues/6099)) · Add QMS Tests ([#6087](https://github.com/hcengineering/platform/issues/6087)) 
* 🐛 BUG FIXES: · Init script ([#6105](https://github.com/hcengineering/platform/issues/6105)) · Infinity fetch workspace ([#6106](https://github.com/hcengineering/platform/issues/6106)) · Ws init ([#6109](https://github.com/hcengineering/platform/issues/6109)) · Minor office bugs ([#6116](https://github.com/hcengineering/platform/issues/6116)) · For the list ([#6096](https://github.com/hcengineering/platform/issues/6096)) · Mongo indexes ([#6122](https://github.com/hcengineering/platform/issues/6122)) 
* EZQMS-1109: · Add signature details for reviews/approvals ([#6111](https://github.com/hcengineering/platform/issues/6111)) 
* EZQMS-1140: · Controlled doc content display improvements ([#6110](https://github.com/hcengineering/platform/issues/6110)) 
* QFIX: · Qms signature dialog login info in tests ([#6100](https://github.com/hcengineering/platform/issues/6100)) 
* UBERF-7603: · Fix connect with timeout ([#6101](https://github.com/hcengineering/platform/issues/6101)) 
* UBERF-7638: · Add scroll to latest message button ([#6119](https://github.com/hcengineering/platform/issues/6119)) 
* EZQMS-1004: · Fix typo ([#6114](https://github.com/hcengineering/platform/issues/6114)) 
* EZQMS-1121: · Fix deleted doc states ([#6112](https://github.com/hcengineering/platform/issues/6112)) 

## [0.6.265] - 2024-07-19

* 🚀 FEATURES: · Keep-alive for front service ([#6078](https://github.com/hcengineering/platform/issues/6078)) · Init script ([#6089](https://github.com/hcengineering/platform/issues/6089)) · Add plugin loader for account ([#6092](https://github.com/hcengineering/platform/issues/6092)) · Add DO_CLEAN into preapre.sh ([#6098](https://github.com/hcengineering/platform/issues/6098)) 
* 🐛 BUG FIXES: · Hide wiki history sidebar tab ([#6064](https://github.com/hcengineering/platform/issues/6064)) · For duplicate undefined in list ([#6068](https://github.com/hcengineering/platform/issues/6068)) · Props for panel ([#6081](https://github.com/hcengineering/platform/issues/6081)) 
* UBERF-7595: · Do not use /api/v1/version on connect ([#6075](https://github.com/hcengineering/platform/issues/6075)) 
* UBERF-7597: · Get rid of formats in preview.ts ([#6077](https://github.com/hcengineering/platform/issues/6077)) 
* UBERF-7600: · Reduce number of $in operators and fix account service is… ([#6080](https://github.com/hcengineering/platform/issues/6080)) 
* UBERF-7603: · Support multiple transactors ([#6086](https://github.com/hcengineering/platform/issues/6086)) 
* UBERF-7620: · Send broadcast on delay with combine ([#6094](https://github.com/hcengineering/platform/issues/6094)) 

## [0.6.264] - 2024-07-12

* 🐛 BUG FIXES: · Office statuses ([#6053](https://github.com/hcengineering/platform/issues/6053)) · Edit attribute actions ([#6054](https://github.com/hcengineering/platform/issues/6054)) · DateTime attribute editor ([#6055](https://github.com/hcengineering/platform/issues/6055)) 
* UBERF-7495: · Global editor kit extensions ([#6057](https://github.com/hcengineering/platform/issues/6057)) 
* UBERF-7513: · Improve notifications model to allow external notifications channels ([#6037](https://github.com/hcengineering/platform/issues/6037)) 
* UBERF-7519: · Rework backup service ([#6050](https://github.com/hcengineering/platform/issues/6050)) 
* UBERF-7583: · Fix workspace upgrade ([#6062](https://github.com/hcengineering/platform/issues/6062)) 

## [0.6.263] - 2024-07-10

* 🚀 FEATURES: · Add pushPublicKey to front ([#6043](https://github.com/hcengineering/platform/issues/6043)) 
* 🐛 BUG FIXES: · For ArrOf ([#6038](https://github.com/hcengineering/platform/issues/6038)) · Double apply ([#6045](https://github.com/hcengineering/platform/issues/6045)) 
* UBERF-7543: · Fix memory usage ([#6044](https://github.com/hcengineering/platform/issues/6044)) 

## [0.6.262] - 2024-07-10

* 🚀 FEATURES: · Add small chat ui fixes ([#6028](https://github.com/hcengineering/platform/issues/6028)) 
* 🐛 BUG FIXES: · Track applied transactions in session op context ([#6029](https://github.com/hcengineering/platform/issues/6029)) · UpdateAllRefs to support attached docs and mixins ([#6033](https://github.com/hcengineering/platform/issues/6033)) 

## [0.6.261] - 2024-07-09

* 🚀 FEATURES: · Add blank view for empty channels ([#6006](https://github.com/hcengineering/platform/issues/6006)) 
* 🐛 BUG FIXES: · Attachments input ([#6002](https://github.com/hcengineering/platform/issues/6002)) · Message rerender on new message create ([#6025](https://github.com/hcengineering/platform/issues/6025)) · Handle readonly in number presenter ([#6026](https://github.com/hcengineering/platform/issues/6026)) 
* UBERF-7510: · Add logging and catch errors on cleanup ([#6003](https://github.com/hcengineering/platform/issues/6003)) 
* UBERF-7520: · Use Bulk for index query updates ([#6012](https://github.com/hcengineering/platform/issues/6012)) 
* UBERF-7532: · Bulk operations for triggers ([#6023](https://github.com/hcengineering/platform/issues/6023)) 

## [0.6.260] - 2024-07-04

* 🚀 FEATURES: · Add spinner and disable editbox in todo until save is finished ([#5960](https://github.com/hcengineering/platform/issues/5960)) · Chat message create performance ([#5981](https://github.com/hcengineering/platform/issues/5981)) · Add logs for not translated push notifications ([#5986](https://github.com/hcengineering/platform/issues/5986)) 
* 🐛 BUG FIXES: · Planner to top ([#5962](https://github.com/hcengineering/platform/issues/5962)) · Overwriting space in elastic doc ([#5959](https://github.com/hcengineering/platform/issues/5959)) 
* ⚙️ MISCELLANEOUS TASKS: · Default failed tests limit ([#5955](https://github.com/hcengineering/platform/issues/5955)) · Wrong unused code ([#5996](https://github.com/hcengineering/platform/issues/5996)) 
* QFIX: · Revert missing pipeline configuration ([#5987](https://github.com/hcengineering/platform/issues/5987)) 
* QFIX: · Use http for local and test brandings ([#5980](https://github.com/hcengineering/platform/issues/5980)) 
* UBERF-7465: · Move pipeline into separate plugin ([#5978](https://github.com/hcengineering/platform/issues/5978)) 
* UBERF-7474: · Some logging and reduce calls for query refresh ([#5973](https://github.com/hcengineering/platform/issues/5973)) 
* UBERF-7489: · Fix various performance issues ([#5983](https://github.com/hcengineering/platform/issues/5983)) · Some more chat optimizations ([#5999](https://github.com/hcengineering/platform/issues/5999)) 
* UBERF-7501: · Copy few blobs in parallel ([#5995](https://github.com/hcengineering/platform/issues/5995)) 
* EZQMS-1057: · Fix images in branded workspaces ([#5979](https://github.com/hcengineering/platform/issues/5979)) 
* UBERF-7434: · Show dowload progress ([#5944](https://github.com/hcengineering/platform/issues/5944)) 

## [0.6.259] - 2024-06-28

* 🐛 BUG FIXES: · Class not found error in blob middleware ([#5939](https://github.com/hcengineering/platform/issues/5939)) 
* ⚙️ MISCELLANEOUS TASKS: · Aggregation by account for notifications ([#5943](https://github.com/hcengineering/platform/issues/5943)) 
* UBERF-7428: · Fix memory issues ([#5940](https://github.com/hcengineering/platform/issues/5940)) 
* UBERF-7389: · Instant transactions ([#5941](https://github.com/hcengineering/platform/issues/5941)) 

## [0.6.258] - 2024-06-27

* 🚀 FEATURES: · Add shortcut to create todo in documents ([#5827](https://github.com/hcengineering/platform/issues/5827)) 
* 🐛 BUG FIXES: · Minor issues ([#5919](https://github.com/hcengineering/platform/issues/5919)) · Add missing server-drive-resources ([#5934](https://github.com/hcengineering/platform/issues/5934)) 
* UBERF-7411: · Allow to backup blobs with wrong size ([#5926](https://github.com/hcengineering/platform/issues/5926)) 
* UBERF-7419: · Fix various sentry errors ([#5931](https://github.com/hcengineering/platform/issues/5931)) 
* UBERF-7422: · Fix blob/stora ([#5933](https://github.com/hcengineering/platform/issues/5933)) 
* UBERF-7425: · Fix some CF caching issues ([#5936](https://github.com/hcengineering/platform/issues/5936)) 

## [0.6.257] - 2024-06-25

* 🐛 BUG FIXES: · 'Love service endpoint not found' error ([#5875](https://github.com/hcengineering/platform/issues/5875)) · OAuth ([#5885](https://github.com/hcengineering/platform/issues/5885)) · Pull request location resolver ([#5898](https://github.com/hcengineering/platform/issues/5898)) · Chat loading problems ([#5899](https://github.com/hcengineering/platform/issues/5899)) · Document labels ([#5904](https://github.com/hcengineering/platform/issues/5904)) · *(ui)* Allow input month with keystrokes ([#5785](https://github.com/hcengineering/platform/issues/5785)) · English wording in account page ([#5907](https://github.com/hcengineering/platform/issues/5907)) 
* ⚙️ MISCELLANEOUS TASKS: · Accounts with same employee in settings ([#5876](https://github.com/hcengineering/platform/issues/5876)) 
* UBERF-5564: · Rework groupping and support PersonAccount  ([#5525](https://github.com/hcengineering/platform/issues/5525)) 
* UBERF-7165: · Storage + Backup improvements ([#5913](https://github.com/hcengineering/platform/issues/5913)) 
* UBERF-7330: · Improve text editor UX ([#5909](https://github.com/hcengineering/platform/issues/5909)) 
* UBERF-7362: · Do not cache branding served from front ([#5889](https://github.com/hcengineering/platform/issues/5889)) 
* EZQMS-1028: · Fix actions in tree element ([#5887](https://github.com/hcengineering/platform/issues/5887)) 
* UBERF-7350: · Add more oauth logs ([#5879](https://github.com/hcengineering/platform/issues/5879)) 

## [0.6.256] - 2024-06-20

* 🚀 FEATURES: · Add Support for Chinese Language ([#5859](https://github.com/hcengineering/platform/issues/5859)) · Add tests for filter change in inbox ([#5851](https://github.com/hcengineering/platform/issues/5851)) · Add French Language ([#5870](https://github.com/hcengineering/platform/issues/5870)) 
* 🐛 BUG FIXES: · Incorrect project select ([#5865](https://github.com/hcengineering/platform/issues/5865)) · Extra logging in documents content migration ([#5868](https://github.com/hcengineering/platform/issues/5868)) · Chat forward pagination ([#5869](https://github.com/hcengineering/platform/issues/5869)) · Calendar yearly events duplicates ([#5874](https://github.com/hcengineering/platform/issues/5874)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#5855](https://github.com/hcengineering/platform/issues/5855)) 
* EZQMS-951: · Server branding ([#5858](https://github.com/hcengineering/platform/issues/5858)) 
* UBERF-7327: · Chinese language selector ([#5862](https://github.com/hcengineering/platform/issues/5862)) 
* UBERF-7342: · Add french lang selector ([#5873](https://github.com/hcengineering/platform/issues/5873)) 

## [0.6.255] - 2024-06-18

* 🚀 FEATURES: · Add attachments block for companies and comment input for it's members ([#5843](https://github.com/hcengineering/platform/issues/5843)) 
* 🐛 BUG FIXES: · Workslots calendar ([#5838](https://github.com/hcengineering/platform/issues/5838)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#5832](https://github.com/hcengineering/platform/issues/5832)) 
* UBERF-7126: · Content type based storage configuration ([#5781](https://github.com/hcengineering/platform/issues/5781)) 
* UBERF-7239: · Support short/custom links in inbox/chat/planner ([#5815](https://github.com/hcengineering/platform/issues/5815)) 
* UBERF-7286: · Backup retry ([#5830](https://github.com/hcengineering/platform/issues/5830)) 
* UBERF-7297: · Allow to backup-restore from v0.6.239 ([#5837](https://github.com/hcengineering/platform/issues/5837)) · One more fix to backup-restore ([#5841](https://github.com/hcengineering/platform/issues/5841)) 
* UBERF-7308: · Upgrade model improvements ([#5847](https://github.com/hcengineering/platform/issues/5847)) 
* UBERF-7312: · Memory improvements ([#5849](https://github.com/hcengineering/platform/issues/5849)) 
* EZQMS-1004: · Fix questions wording ([#5820](https://github.com/hcengineering/platform/issues/5820)) 
* EZQMS-1023: · Remove old migrations from qms ([#5823](https://github.com/hcengineering/platform/issues/5823)) 
* EZQMS-966: · Notifications fixes ([#5819](https://github.com/hcengineering/platform/issues/5819)) 

## [0.6.254] - 2024-06-14

* UBERF-7266: · Fix workspace rate limit ([#5812](https://github.com/hcengineering/platform/issues/5812)) 

## [0.6.253] - 2024-06-13

* 🚀 FEATURES: · Add tests for inbox ([#5780](https://github.com/hcengineering/platform/issues/5780)) 
* 🐛 BUG FIXES: · Preview config defaults ([#5804](https://github.com/hcengineering/platform/issues/5804)) 
* UBERF-7247: · Fix queryFind for mixins on server ([#5803](https://github.com/hcengineering/platform/issues/5803)) 
* EZQMS-972: · Fix custom space types for documents and products ([#5801](https://github.com/hcengineering/platform/issues/5801)) 
* EZQMS-974: · Fix space type selector in document and product spaces ([#5802](https://github.com/hcengineering/platform/issues/5802)) 

## [0.6.252] - 2024-06-12

* 🚀 FEATURES: · Add accessDenied error ([#5788](https://github.com/hcengineering/platform/issues/5788)) · Select text from code block ([#5792](https://github.com/hcengineering/platform/issues/5792)) 
* 🐛 BUG FIXES: · Office mic selection ([#5779](https://github.com/hcengineering/platform/issues/5779)) · Scroll to new messages ([#5782](https://github.com/hcengineering/platform/issues/5782)) · Office bugs ([#5784](https://github.com/hcengineering/platform/issues/5784)) 
* EZQMS-1008: · Disable archived product editing ([#5794](https://github.com/hcengineering/platform/issues/5794)) 
* EZQMS-976: · Exclude other types mixins ([#5795](https://github.com/hcengineering/platform/issues/5795)) 
* EZQMS-981: · Adjust doc library wording ([#5791](https://github.com/hcengineering/platform/issues/5791)) 
* UBERF-7206: · Adjustments and resources to support desktop screenshare ([#5790](https://github.com/hcengineering/platform/issues/5790)) 

## [0.6.251] - 2024-06-11

* 🐛 BUG FIXES: · Cropped actions popup ([#5767](https://github.com/hcengineering/platform/issues/5767)) · Disable guest link action for selection ([#5776](https://github.com/hcengineering/platform/issues/5776)) 
* ⚙️ MISCELLANEOUS TASKS: · Update preview.ts ([#5765](https://github.com/hcengineering/platform/issues/5765)) · Owner-pages.ts ([#5768](https://github.com/hcengineering/platform/issues/5768)) 
* UBERF-7197: · Fix high cpu load ([#5761](https://github.com/hcengineering/platform/issues/5761)) 

## [0.6.250] - 2024-06-07

* 🚀 FEATURES: · Office click handler ([#5751](https://github.com/hcengineering/platform/issues/5751)) · Add OperationContext to be accessible by triggers ([#5753](https://github.com/hcengineering/platform/issues/5753)) 
* 🐛 BUG FIXES: · Room connection after refresh ([#5734](https://github.com/hcengineering/platform/issues/5734)) · Create workspace ([#5740](https://github.com/hcengineering/platform/issues/5740)) · Concurrency workspace creation ([#5742](https://github.com/hcengineering/platform/issues/5742)) · Gravatar srcset ([#5744](https://github.com/hcengineering/platform/issues/5744)) · Incorrect attribute for transactions ([#5746](https://github.com/hcengineering/platform/issues/5746)) · Images size ([#5750](https://github.com/hcengineering/platform/issues/5750)) 
* UBERF-7077: · Fixed Separator ([#5743](https://github.com/hcengineering/platform/issues/5743)) 
* UBERF-7181: · Fix GH PR statuses ([#5749](https://github.com/hcengineering/platform/issues/5749)) 

## [0.6.249] - 2024-06-05

* 🐛 BUG FIXES: · Github oauth ([#5729](https://github.com/hcengineering/platform/issues/5729)) 
* ⚙️ MISCELLANEOUS TASKS: · Package versions ([#5728](https://github.com/hcengineering/platform/issues/5728)) 
* UBERF-7090: · Add QMS common components ([#5711](https://github.com/hcengineering/platform/issues/5711)) · Add QMS plugins ([#5716](https://github.com/hcengineering/platform/issues/5716)) · Add Office plugins ([#5725](https://github.com/hcengineering/platform/issues/5725)) 
* UBERF-7126: · Fix blob previews ([#5723](https://github.com/hcengineering/platform/issues/5723)) · Support rich editor blob resolve ([#5727](https://github.com/hcengineering/platform/issues/5727)) 
* EZQMS-910: · Fix workspace roles editing ([#5726](https://github.com/hcengineering/platform/issues/5726)) 

## [0.6.248] - 2024-05-31

* 🐛 BUG FIXES: · Avatar kind ([#5705](https://github.com/hcengineering/platform/issues/5705)) 
* ⚙️ MISCELLANEOUS TASKS: · Test ([#5701](https://github.com/hcengineering/platform/issues/5701)) 
* UBERF-7114: · Fix workspace from clone ([#5703](https://github.com/hcengineering/platform/issues/5703)) 
* UBERF-7118: · Fix upgrade/refresh on reconnect ([#5704](https://github.com/hcengineering/platform/issues/5704)) 

## [0.6.247] - 2024-05-30

* 🚀 FEATURES: · Add chat tests ([#5625](https://github.com/hcengineering/platform/issues/5625)) 
* 🐛 BUG FIXES: · Paste of files ([#5655](https://github.com/hcengineering/platform/issues/5655)) · Get attributes diff ([#5658](https://github.com/hcengineering/platform/issues/5658)) · Use concatLink for transactor URL ([#5659](https://github.com/hcengineering/platform/issues/5659)) · ToDoItemNodeView ([#5678](https://github.com/hcengineering/platform/issues/5678)) · Missing direct for companion ([#5686](https://github.com/hcengineering/platform/issues/5686)) · Event calendar selector ([#5689](https://github.com/hcengineering/platform/issues/5689)) · Migrate content for documents only ([#5699](https://github.com/hcengineering/platform/issues/5699)) 
* ⚙️ MISCELLANEOUS TASKS: · Tests by removing try catch block ([#5671](https://github.com/hcengineering/platform/issues/5671)) 
* QFIX: · Remove hardcoded platform url ([#5692](https://github.com/hcengineering/platform/issues/5692)) 
* UBERF-6984: · Host-based branding ([#5657](https://github.com/hcengineering/platform/issues/5657)) 
* UBERF-7011: · Switch to Ref<Blob> ([#5661](https://github.com/hcengineering/platform/issues/5661)) 
* UBERF-7062: · Fix backup memory usage and support missing blobs ([#5665](https://github.com/hcengineering/platform/issues/5665)) 
* UBERF-7067: · Make chat group labels translations reactive ([#5688](https://github.com/hcengineering/platform/issues/5688)) 
* UBERF-7105: · Use status colour when projectState is undefined ([#5697](https://github.com/hcengineering/platform/issues/5697)) 
* UBERF-6639: · Fix create issue default status ([#5685](https://github.com/hcengineering/platform/issues/5685)) 
* UBERF-7084: · Fix add new status to task type ([#5684](https://github.com/hcengineering/platform/issues/5684)) 
* UBERF-7090: · Request enhancements ([#5695](https://github.com/hcengineering/platform/issues/5695)) 

## [0.6.246] - 2024-05-23

* 🐛 BUG FIXES: · Proper drive space header button logic ([#5642](https://github.com/hcengineering/platform/issues/5642)) · Download drive files via temporary link ([#5644](https://github.com/hcengineering/platform/issues/5644)) · Message box props ([#5649](https://github.com/hcengineering/platform/issues/5649)) 
* UBERF-7018: · Fix vacancies ([#5647](https://github.com/hcengineering/platform/issues/5647)) 

## [0.6.245] - 2024-05-22

* 🚀 FEATURES: · Add API Workflow and chat tests ([#5594](https://github.com/hcengineering/platform/issues/5594)) · Add CreateGuest functionality to AddParticipant component ([#5606](https://github.com/hcengineering/platform/issues/5606)) · Add members to space type for easy management members, and add autojo… ([#5612](https://github.com/hcengineering/platform/issues/5612)) · Add small inbox fixes ([#5621](https://github.com/hcengineering/platform/issues/5621)) · Add join overlay for public channels ([#5630](https://github.com/hcengineering/platform/issues/5630)) · Add chat UI fixes ([#5632](https://github.com/hcengineering/platform/issues/5632)) 
* 🐛 BUG FIXES: · Hr departments ([#5589](https://github.com/hcengineering/platform/issues/5589)) · Messages and reactions spaces ([#5590](https://github.com/hcengineering/platform/issues/5590)) · Header of mention push ([#5591](https://github.com/hcengineering/platform/issues/5591)) · Guest settings ([#5597](https://github.com/hcengineering/platform/issues/5597)) · Spotlight security leak ([#5601](https://github.com/hcengineering/platform/issues/5601)) · Grammar error and change text for setting priorities to match in Todos and Issues ([#5600](https://github.com/hcengineering/platform/issues/5600)) · Team planning event duplicates ([#5605](https://github.com/hcengineering/platform/issues/5605)) · Document link in email notifications ([#5627](https://github.com/hcengineering/platform/issues/5627)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra strings ([#5603](https://github.com/hcengineering/platform/issues/5603)) · Push when added as collaborator ([#5610](https://github.com/hcengineering/platform/issues/5610)) 
* UBERF-6365: · Blob mongo storage initial support ([#5474](https://github.com/hcengineering/platform/issues/5474)) 
* UBERF-6638: · Fix colours for statuses ([#5620](https://github.com/hcengineering/platform/issues/5620)) 
* UBERF-6854: · S3 provider ([#5611](https://github.com/hcengineering/platform/issues/5611)) 
* UBERF-6893: · Move index build into workspace usage. ([#5586](https://github.com/hcengineering/platform/issues/5586)) 
* UBERF-6949: · Fix kanban options ([#5593](https://github.com/hcengineering/platform/issues/5593)) 

## [0.6.243] - 2024-05-13

* 🚀 FEATURES: · Add gmail privacy ([#5568](https://github.com/hcengineering/platform/issues/5568)) · Add user to public document space on mention ([#5587](https://github.com/hcengineering/platform/issues/5587)) · Directs sort order ([#5588](https://github.com/hcengineering/platform/issues/5588)) 
* 🐛 BUG FIXES: · Server statistics ([#5575](https://github.com/hcengineering/platform/issues/5575)) · Multiple channel read while data is updating ([#5576](https://github.com/hcengineering/platform/issues/5576)) · Hide actions for archived teamspaces ([#5580](https://github.com/hcengineering/platform/issues/5580)) · Team planning event disappear ([#5581](https://github.com/hcengineering/platform/issues/5581)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra user status ([#5578](https://github.com/hcengineering/platform/issues/5578)) 
* UBERF-6829: · Group messages of the same type and user ([#5569](https://github.com/hcengineering/platform/issues/5569)) 
* EZQMS-876: · Adjust role assignment editor ([#5583](https://github.com/hcengineering/platform/issues/5583)) 
* EZQMS-883: · Allow email notifications for requests ([#5582](https://github.com/hcengineering/platform/issues/5582)) 
* EZQMS-896: · Fix owners assignment for default spaces ([#5585](https://github.com/hcengineering/platform/issues/5585)) 

## [0.6.242] - 2024-05-10

* 🚀 FEATURES: · Add livness check for login and workspace ([#5532](https://github.com/hcengineering/platform/issues/5532)) · Add more arms emoji ([#5562](https://github.com/hcengineering/platform/issues/5562)) · Add export for uberflow liveness tests ([#5561](https://github.com/hcengineering/platform/issues/5561)) · Add global user status ([#5526](https://github.com/hcengineering/platform/issues/5526)) · ActionIcon has keys for tooltip 
* 🐛 BUG FIXES: · Add missing productId to getAccountInfo ([#5540](https://github.com/hcengineering/platform/issues/5540)) · Email notifictions on chat message ([#5544](https://github.com/hcengineering/platform/issues/5544)) · Typos on Google Calendar and Gmail integration cards ([#5547](https://github.com/hcengineering/platform/issues/5547)) · Extra inbox notifications ([#5550](https://github.com/hcengineering/platform/issues/5550)) · Mention notifications on edit ([#5549](https://github.com/hcengineering/platform/issues/5549)) · Select workspace when open workspace in new tab ([#5545](https://github.com/hcengineering/platform/issues/5545)) · Space security ([#5557](https://github.com/hcengineering/platform/issues/5557)) · Spaces popup ([#5559](https://github.com/hcengineering/platform/issues/5559)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra query params and apply ([#5546](https://github.com/hcengineering/platform/issues/5546)) · Outdated migration ([#5551](https://github.com/hcengineering/platform/issues/5551)) 
* UBERF-6870: · Speedup server broadcast of derived transactions ([#5553](https://github.com/hcengineering/platform/issues/5553)) 
* UBERF-6888: · Async triggers ([#5565](https://github.com/hcengineering/platform/issues/5565)) 

## [0.6.241] - 2024-05-08

* 🚀 FEATURES: · Users to create direct with themselves ([#5534](https://github.com/hcengineering/platform/issues/5534)) 
* 🐛 BUG FIXES: · Locator for flaky test ([#5524](https://github.com/hcengineering/platform/issues/5524)) · Add missing string ([#5535](https://github.com/hcengineering/platform/issues/5535)) 
* UBERF-6802: · Improve create chat message performance ([#5530](https://github.com/hcengineering/platform/issues/5530)) 
* UBERF-6807: · Fix empty objects channels in chat ([#5533](https://github.com/hcengineering/platform/issues/5533)) 

## [0.6.240] - 2024-05-06

* 🚀 FEATURES: · Add json markup tool ([#5511](https://github.com/hcengineering/platform/issues/5511)) · Add group analytics to track workspace activity; replace setTag() call with setWorkspace() when adding workspace tag to person properties ([#5519](https://github.com/hcengineering/platform/issues/5519)) 
* 🐛 BUG FIXES: · Move to well known parent when no parent selected ([#5516](https://github.com/hcengineering/platform/issues/5516)) 
* EZQMS-729: · Restrict spaces operations ([#5500](https://github.com/hcengineering/platform/issues/5500)) 
* QFIX: · Connection should restore boolean query fields ([#5508](https://github.com/hcengineering/platform/issues/5508)) 
* UBERF-6576: · Move default space/project/task types into static model ([#5423](https://github.com/hcengineering/platform/issues/5423)) 
* UBERF-6778: · Add Support to uWebSocket.js library ([#5503](https://github.com/hcengineering/platform/issues/5503)) 
* EZQMS-730: · Better check for roles when changing members ([#5527](https://github.com/hcengineering/platform/issues/5527)) 
* EZQMS-798: · Fix role name update ([#5514](https://github.com/hcengineering/platform/issues/5514)) 
* EZQMS-834: · Fix roles ids and names ([#5520](https://github.com/hcengineering/platform/issues/5520)) 

## [0.6.239] - 2024-05-03

* 🐛 BUG FIXES: · Show max width button in documents ([#5476](https://github.com/hcengineering/platform/issues/5476)) · Text migration ([#5485](https://github.com/hcengineering/platform/issues/5485)) 
* EZQMS-762: · Improve printing layout ([#5486](https://github.com/hcengineering/platform/issues/5486)) 
* QFIX: · Elastic adapter index not found exception ([#5482](https://github.com/hcengineering/platform/issues/5482)) 
* UBERF-6756: · Tracker performance fixes ([#5488](https://github.com/hcengineering/platform/issues/5488)) 
* EZQMS-762: · Extract base content from toc popup ([#5489](https://github.com/hcengineering/platform/issues/5489)) 

## [0.6.238] - 2024-04-26

* 🚀 FEATURES: · Add measure for chat message create ([#5441](https://github.com/hcengineering/platform/issues/5441)) · Add huly docs ([#5471](https://github.com/hcengineering/platform/issues/5471)) 
* 🐛 BUG FIXES: · Configure all tool · Multiple mention notifications on edit doc ([#5460](https://github.com/hcengineering/platform/issues/5460)) · Recruit link resolver ([#5464](https://github.com/hcengineering/platform/issues/5464)) · Remove notifications on unsubscribe ([#5466](https://github.com/hcengineering/platform/issues/5466)) · Copy link ([#5467](https://github.com/hcengineering/platform/issues/5467)) · Display headers that duplicate content ([#5468](https://github.com/hcengineering/platform/issues/5468)) · Replace missing employee ([#5475](https://github.com/hcengineering/platform/issues/5475)) 
* ⚙️ MISCELLANEOUS TASKS: · Update-svelte-check and rush ([#5446](https://github.com/hcengineering/platform/issues/5446)) 
* UBERF-6676: · Chat local state ([#5461](https://github.com/hcengineering/platform/issues/5461)) 
* UBERF-6677: · Add user online/offline status ([#5438](https://github.com/hcengineering/platform/issues/5438)) 
* UBERF-6712: · Rework connection logic ([#5455](https://github.com/hcengineering/platform/issues/5455)) 
* UBERF-6726: · Fix clone for huge files ([#5470](https://github.com/hcengineering/platform/issues/5470)) 
* UBERF-6708: · Composite elastic doc key ([#5457](https://github.com/hcengineering/platform/issues/5457)) 

## [0.6.237] - 2024-04-23

* 🚀 FEATURES: · Add chat fixes ([#5437](https://github.com/hcengineering/platform/issues/5437)) 
* 🐛 BUG FIXES: · Todo creating on assignee change ([#5435](https://github.com/hcengineering/platform/issues/5435)) · Double encode ([#5436](https://github.com/hcengineering/platform/issues/5436)) · Config ([#5439](https://github.com/hcengineering/platform/issues/5439)) 
* EZQMS-748: · Hide left menu by default, ensure placement, improve show/hide logic ([#5429](https://github.com/hcengineering/platform/issues/5429)) 

## [0.6.236] - 2024-04-23

* 🚀 FEATURES: · Add dock ([#5416](https://github.com/hcengineering/platform/issues/5416)) 
* 🐛 BUG FIXES: · Incorecct message rendering in inbox ([#5421](https://github.com/hcengineering/platform/issues/5421)) · Double notifications contexts ([#5422](https://github.com/hcengineering/platform/issues/5422)) 
* UBERF-6653: · Fix minor issue and add force-close ([#5418](https://github.com/hcengineering/platform/issues/5418)) 

## [0.6.235a] - 2024-04-20

* UBERF-6636: · Fix todos auto expand if collapsed ([#5406](https://github.com/hcengineering/platform/issues/5406)) 
* UBERF-6643: · Fix few connection related exceptions ([#5412](https://github.com/hcengineering/platform/issues/5412)) · A bit more logging ([#5413](https://github.com/hcengineering/platform/issues/5413)) 

## [0.6.235] - 2024-04-19

* 🚀 FEATURES: · Push notifications ([#5397](https://github.com/hcengineering/platform/issues/5397)) 
* 🐛 BUG FIXES: · And refactor tests ([#5395](https://github.com/hcengineering/platform/issues/5395)) · Progress and Toggle components ([#5401](https://github.com/hcengineering/platform/issues/5401)) 
* UBERF-6626: · More detailed info about maintenance ([#5400](https://github.com/hcengineering/platform/issues/5400)) 
* UBERF-6633: · Fix model enabled tracking ([#5404](https://github.com/hcengineering/platform/issues/5404)) 

## [0.6.234] - 2024-04-18

* 🚀 FEATURES: · Notifications ([#5378](https://github.com/hcengineering/platform/issues/5378)) · Add some chat/activity fixes ([#5387](https://github.com/hcengineering/platform/issues/5387)) 
* 🐛 BUG FIXES: · Inbox preview ([#5389](https://github.com/hcengineering/platform/issues/5389)) · Unintendent collaborative content changes  ([#5388](https://github.com/hcengineering/platform/issues/5388)) · Service worker scope in BrowserNotificatator ([#5391](https://github.com/hcengineering/platform/issues/5391)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra logging in migrations ([#5380](https://github.com/hcengineering/platform/issues/5380)) · UI of error state in form ([#5232](https://github.com/hcengineering/platform/issues/5232)) 
* UBERF-5527: · Add context menu for activity and inbox ([#5373](https://github.com/hcengineering/platform/issues/5373)) 
* UBERF-6205: · Add real archive for notifications ([#5385](https://github.com/hcengineering/platform/issues/5385)) 
* UBERF-6490: · Rework backup tool ([#5386](https://github.com/hcengineering/platform/issues/5386)) 
* UBERF-6598: · Perform upgrade all workspaces to new versions ([#5392](https://github.com/hcengineering/platform/issues/5392)) 

## [0.6.233] - 2024-04-16

* QFIX: · Always recreate space types ([#5371](https://github.com/hcengineering/platform/issues/5371)) 
* UBERF-6464: · Update activity mentions display ([#5339](https://github.com/hcengineering/platform/issues/5339)) 
* UBERF-6577: · Fix invite link with null mask ([#5372](https://github.com/hcengineering/platform/issues/5372)) 

## [0.6.232] - 2024-04-16

* 🚀 FEATURES: · Mention test ([#5358](https://github.com/hcengineering/platform/issues/5358)) · Add navigate method to Analytics provider ([#5367](https://github.com/hcengineering/platform/issues/5367)) 
* 🐛 BUG FIXES: · Login form issue when using password auto-fill ([#5047](https://github.com/hcengineering/platform/issues/5047)) · Workspace creation issues ([#5362](https://github.com/hcengineering/platform/issues/5362)) 
* UBERF-5686: · Fix copy link ([#5368](https://github.com/hcengineering/platform/issues/5368)) 
* UBERF-5964: · Insert items menu in editor ([#5341](https://github.com/hcengineering/platform/issues/5341)) 
* UBERF-6330: · Fix race conditions in UI ([#5184](https://github.com/hcengineering/platform/issues/5184)) 
* UBERF-6557: · Clean old domains during clone of workspace to new place ([#5361](https://github.com/hcengineering/platform/issues/5361)) 
* EZQMS-724: · Make roles related code more robust ([#5363](https://github.com/hcengineering/platform/issues/5363)) 
* UBERF-6537: · Fix teamspace creation ([#5354](https://github.com/hcengineering/platform/issues/5354)) 

## [0.6.231] - 2024-04-13

* 🚀 FEATURES: · Add Google API Services User Data Policy link ([#5326](https://github.com/hcengineering/platform/issues/5326)) 
* 🐛 BUG FIXES: · Activity actions icons ([#5343](https://github.com/hcengineering/platform/issues/5343)) · For null lastName during signup with google ([#5328](https://github.com/hcengineering/platform/issues/5328)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#5307](https://github.com/hcengineering/platform/issues/5307)) 
* EZQMS-689: · Slightly improved typings for notification presenters ([#5312](https://github.com/hcengineering/platform/issues/5312)) 
* UBERF-6469: · Fix slow index creation ([#5324](https://github.com/hcengineering/platform/issues/5324)) 
* UBERF-6478: · Make icons more clear ([#5320](https://github.com/hcengineering/platform/issues/5320)) 
* UBERF-6508: · Add user to doc collaborators on mention ([#5340](https://github.com/hcengineering/platform/issues/5340)) 
* UBERF-6509: · Fix reading mention notifications ([#5323](https://github.com/hcengineering/platform/issues/5323)) 
* UBERF-6523: · Allow to use zstd ([#5333](https://github.com/hcengineering/platform/issues/5333)) 
* UBERF-6540: · Fix isIndexable and clean wrong indexed documents ([#5347](https://github.com/hcengineering/platform/issues/5347)) 

## [0.6.230] - 2024-04-10

* ⚙️ MISCELLANEOUS TASKS: · Navigation buttons ([#5288](https://github.com/hcengineering/platform/issues/5288)) 
* SILENT: · False for notifications ([#5284](https://github.com/hcengineering/platform/issues/5284)) 
* UBERF-6469: · Rework workspace creation to more informative ([#5291](https://github.com/hcengineering/platform/issues/5291)) 

## [0.6.229] - 2024-04-10

* 🚀 FEATURES: · Add issue template ([#5206](https://github.com/hcengineering/platform/issues/5206)) · *(help)* Added find bug button for easy navigation ([#5214](https://github.com/hcengineering/platform/issues/5214)) · Child classes in navigator model ([#5275](https://github.com/hcengineering/platform/issues/5275)) 
* 🐛 BUG FIXES: · Tab navigation order in issue creation popup ([#5148](https://github.com/hcengineering/platform/issues/5148)) · Progress component ([#5276](https://github.com/hcengineering/platform/issues/5276)) 
* ⚙️ MISCELLANEOUS TASKS: · Peaceiris/actions-gh-pages from 3 to 4 ([#5248](https://github.com/hcengineering/platform/issues/5248)) 
* QFIX: · Center media, improve matching ([#5267](https://github.com/hcengineering/platform/issues/5267)) 
* UBERF-6353: · Extensible preview ([#5264](https://github.com/hcengineering/platform/issues/5264)) 

## [0.6.228a] - 2024-04-09

* UBERF-6426: · Fix stuck backup ([#5258](https://github.com/hcengineering/platform/issues/5258)) 
* UBERF-6433: · Fix workspace creation from demo workspaces ([#5255](https://github.com/hcengineering/platform/issues/5255)) 

## [0.6.228] - 2024-04-08

* TSK-1682: · Introduced reusable `SectionEmpty` for numerous existing and upcoming cases ([#5220](https://github.com/hcengineering/platform/issues/5220)) 
* UBERF-6313: · Improve backup/restore ([#5241](https://github.com/hcengineering/platform/issues/5241)) 

## [0.6.227] - 2024-04-08

* 🚀 FEATURES: · Add DOCKER_EXTRA env to docker_build.sh ([#5204](https://github.com/hcengineering/platform/issues/5204)) 
* 🐛 BUG FIXES: · Overflow in Inbox ([#5193](https://github.com/hcengineering/platform/issues/5193)) · Tiny css errors ([#5186](https://github.com/hcengineering/platform/issues/5186)) 
* EZQMS-663: · Add permissions util ([#5189](https://github.com/hcengineering/platform/issues/5189)) 
* QFIX: · Restore ats task types tool ([#5185](https://github.com/hcengineering/platform/issues/5185)) 
* TSK-1682: · Slightly reorganized recruit files for future changes ([#5196](https://github.com/hcengineering/platform/issues/5196)) 
* UBERF-6374: · Improve server logging and improve startup performance ([#5210](https://github.com/hcengineering/platform/issues/5210)) 
* UBERF-6393: · Work on elastic fast backup/restore ([#5235](https://github.com/hcengineering/platform/issues/5235)) 

## [0.6.226] - 2024-04-04

* 🐛 BUG FIXES: · Todo creating ([#5175](https://github.com/hcengineering/platform/issues/5175)) 
* ⚙️ MISCELLANEOUS TASKS: · Pre-requisites README.md ([#5170](https://github.com/hcengineering/platform/issues/5170)) 
* UBERF-6313: · Improve upgrade of workspace ([#5178](https://github.com/hcengineering/platform/issues/5178)) 
* UBERF-6314: · Provide space if all of the items have same space ([#5171](https://github.com/hcengineering/platform/issues/5171)) 
* UBERF-6318: · Fix server drop connection on connect ([#5174](https://github.com/hcengineering/platform/issues/5174)) 

## [0.6.225] - 2024-04-03

* UBERF-6296: · Fix elastic queries ([#5155](https://github.com/hcengineering/platform/issues/5155)) 
* UBERF-6300: · Not cache for index.html's ([#5159](https://github.com/hcengineering/platform/issues/5159)) 
* UBERF-6310: · Fix context passing ([#5167](https://github.com/hcengineering/platform/issues/5167)) 
* UBERF-6255: · Minor guest and pdf viewer adjustments ([#5164](https://github.com/hcengineering/platform/issues/5164)) 

## [0.6.224] - 2024-04-02

* 🐛 BUG FIXES: · Wrong minio config parameter ([#5151](https://github.com/hcengineering/platform/issues/5151)) 

## [0.6.223] - 2024-04-02

* UBERF-6161: · Storage configuration ([#5109](https://github.com/hcengineering/platform/issues/5109)) 
* UBERF-6263: · Fix mongo client unexpected close ([#5129](https://github.com/hcengineering/platform/issues/5129)) 
* UBERF-6265: · Fix account creation from account service ([#5132](https://github.com/hcengineering/platform/issues/5132)) 
* UBERF-6267: · Fix few platform troubles ([#5142](https://github.com/hcengineering/platform/issues/5142)) 

## [0.6.222] - 2024-04-01

* 🚀 FEATURES: · Preview media attachments ([#5102](https://github.com/hcengineering/platform/issues/5102)) 
* 🐛 BUG FIXES: · LQ results when refresh connect ([#5101](https://github.com/hcengineering/platform/issues/5101)) 
* UBERF-6226: · Updated LOVE layout, VideoPopup. ([#5100](https://github.com/hcengineering/platform/issues/5100)) 
* UBERF-6242: · More proper manage mongo connections ([#5118](https://github.com/hcengineering/platform/issues/5118)) 

## [0.6.221] - 2024-03-29

* QFIX: · Consistent space/project/task type mixi ids ([#5089](https://github.com/hcengineering/platform/issues/5089)) 
* EZQMS-663: · Add more info to permissions store, fix tree element actions ([#5090](https://github.com/hcengineering/platform/issues/5090)) 
* UBERF-6224: · Restore missing task types ([#5094](https://github.com/hcengineering/platform/issues/5094)) 

## [0.6.220] - 2024-03-28

* 🐛 BUG FIXES: · Popups ([#5086](https://github.com/hcengineering/platform/issues/5086)) 
* QFIX: · Invert delete object permission ([#5085](https://github.com/hcengineering/platform/issues/5085)) 

## [0.6.219] - 2024-03-28

* EZQMS-612: · Quick fix to let `TypedSpace` instances have non-configured roles (`undefined`) ([#5083](https://github.com/hcengineering/platform/issues/5083)) 
* EZQMS-665: · Minor inbox styles fix ([#5065](https://github.com/hcengineering/platform/issues/5065)) 
* UBERF-6001: · Roles management ([#4994](https://github.com/hcengineering/platform/issues/4994)) 
* UBERF-6202: · Use only one mongo pull per configuration ([#5073](https://github.com/hcengineering/platform/issues/5073)) 
* UBERF-6209: · Add reactivity ([#5078](https://github.com/hcengineering/platform/issues/5078)) 

## [0.6.218] - 2024-03-27

* 🚀 FEATURES: · *(test)* Updated Due date filter test ([#5057](https://github.com/hcengineering/platform/issues/5057)) · Popups ([#5068](https://github.com/hcengineering/platform/issues/5068)) 
* 🐛 BUG FIXES: · Email notifications, fix collaborators aligment ([#5062](https://github.com/hcengineering/platform/issues/5062)) 
* UBERF-6094: · Preparing bot ([#5061](https://github.com/hcengineering/platform/issues/5061)) 
* UBERF-6180: · Fix account issues ([#5063](https://github.com/hcengineering/platform/issues/5063)) 
* UBERF-6194: · CLI for rename account ([#5067](https://github.com/hcengineering/platform/issues/5067)) 

## [0.6.217] - 2024-03-25

* 🐛 BUG FIXES: · Notifications order ([#5053](https://github.com/hcengineering/platform/issues/5053)) · Back comment editing, remove unused props ([#5056](https://github.com/hcengineering/platform/issues/5056)) 

## [0.6.216] - 2024-03-25

* 🚀 FEATURES: · *(planner)* Drag-n-drop ([#5031](https://github.com/hcengineering/platform/issues/5031)) · *(planner)* Save accordion state ([#5042](https://github.com/hcengineering/platform/issues/5042)) · *(planner)* Remove large view mode ([#5043](https://github.com/hcengineering/platform/issues/5043)) 
* 🐛 BUG FIXES: · `Panel` glitches on opening ([#5033](https://github.com/hcengineering/platform/issues/5033)) 
* QFIX: · Few check from sentry and disable due date test ([#5050](https://github.com/hcengineering/platform/issues/5050)) 
* UBERF-6124: · Rework inbox view ([#5046](https://github.com/hcengineering/platform/issues/5046)) 
* UBERF-6126: · Storage adapter ([#5035](https://github.com/hcengineering/platform/issues/5035)) 
* UBERF-6150: · Improve backup logic ([#5041](https://github.com/hcengineering/platform/issues/5041)) 

## [0.6.215] - 2024-03-21

* EZQMS-602: · Moved `Rank` type to core (utilities stay in its own package) ([#5019](https://github.com/hcengineering/platform/issues/5019)) 
* UBERF-6121: · Fix front service caching ([#5029](https://github.com/hcengineering/platform/issues/5029)) 

## [0.6.214] - 2024-03-19

* 🚀 FEATURES: · *(planner)* Add action for toggle button ([#4986](https://github.com/hcengineering/platform/issues/4986)) · *(test)* Working on the migration planner tests ([#5002](https://github.com/hcengineering/platform/issues/5002)) · *(planner)* Some ui improvements ([#4992](https://github.com/hcengineering/platform/issues/4992)) · *(planner)* New layout for attached todos ([#4995](https://github.com/hcengineering/platform/issues/4995)) · *(planner)* New slots, fixes and improvements ([#4961](https://github.com/hcengineering/platform/issues/4961)) · To mobile ([#5015](https://github.com/hcengineering/platform/issues/5015)) 
* 🐛 BUG FIXES: · Mention email notifictions ([#5005](https://github.com/hcengineering/platform/issues/5005)) · Doc aside in chat ([#5006](https://github.com/hcengineering/platform/issues/5006)) · Double comments header in issue preview ([#5007](https://github.com/hcengineering/platform/issues/5007)) · Create funnel ([#5014](https://github.com/hcengineering/platform/issues/5014)) 
* ⚙️ MISCELLANEOUS TASKS: · Related issues from viewlets and update some tests ([#5008](https://github.com/hcengineering/platform/issues/5008)) 
* EZQMS-642: · Extended `navigate()` signature to support History replacement ([#4979](https://github.com/hcengineering/platform/issues/4979)) 
* UBERF-6053: · Do not crash on isDerived ([#4998](https://github.com/hcengineering/platform/issues/4998)) 
* UBERF-6058: · Fix cache control for front service ([#5000](https://github.com/hcengineering/platform/issues/5000)) 
* UBERF-6066: · Fix component manager state ([#5009](https://github.com/hcengineering/platform/issues/5009)) 

## [0.6.213] - 2024-03-15

* 🐛 BUG FIXES: · Default project icon ([#4984](https://github.com/hcengineering/platform/issues/4984)) 
* UBERF-6042: · Fix front service ([#4991](https://github.com/hcengineering/platform/issues/4991)) 

## [0.6.212] - 2024-03-15

* 🚀 FEATURES: · TagsPopup ([#4879](https://github.com/hcengineering/platform/issues/4879)) · *(test)* Updated Document public link revoke test ([#4955](https://github.com/hcengineering/platform/issues/4955)) 
* 🐛 BUG FIXES: · Missed invite icon ([#4962](https://github.com/hcengineering/platform/issues/4962)) · Telegram/gmail notifications ([#4976](https://github.com/hcengineering/platform/issues/4976)) · Time migrations ([#4975](https://github.com/hcengineering/platform/issues/4975)) 
* ⚙️ MISCELLANEOUS TASKS: · To svelte 4.2.12 and some template fixes ([#4982](https://github.com/hcengineering/platform/issues/4982)) 
* UBERF-5933: · Add 404 handling in case of resource direct requests ([#4983](https://github.com/hcengineering/platform/issues/4983)) 
* UBERF-5986: · Upgrade fixes ([#4957](https://github.com/hcengineering/platform/issues/4957)) 
* UBERF-6000: · Fix statuses filtering and icons ([#4966](https://github.com/hcengineering/platform/issues/4966)) 
* UBERF-6014: · Fix $faset usage ([#4971](https://github.com/hcengineering/platform/issues/4971)) 

## [0.6.211] - 2024-03-13

* UBERF-5982: · Fix tracker select all action ([#4950](https://github.com/hcengineering/platform/issues/4950)) 

## [0.6.210a] - 2024-03-13

* 🐛 BUG FIXES: · *(planner)* Frozen slots when switching between todos ([#4944](https://github.com/hcengineering/platform/issues/4944)) 
* TESTS-221: · Feat(tests): done Document public link revoke test ([#4940](https://github.com/hcengineering/platform/issues/4940)) 

## [0.6.210] - 2024-03-13

* 🚀 FEATURES: · Add apply-templates check ([#4907](https://github.com/hcengineering/platform/issues/4907)) · Add the ability to archive all activity fom chat ([#4922](https://github.com/hcengineering/platform/issues/4922)) · *(planner)* New priority layout, update item layout ([#4896](https://github.com/hcengineering/platform/issues/4896)) · *(test)* Updated Due Date test ([#4925](https://github.com/hcengineering/platform/issues/4925)) · Add planning to build ([#4936](https://github.com/hcengineering/platform/issues/4936)) 
* 🐛 BUG FIXES: · Chat opening after workspace change ([#4919](https://github.com/hcengineering/platform/issues/4919)) · Show temporary channel name ([#4920](https://github.com/hcengineering/platform/issues/4920)) · Create workspace without token ([#4932](https://github.com/hcengineering/platform/issues/4932)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#4934](https://github.com/hcengineering/platform/issues/4934)) · README.md ([#4935](https://github.com/hcengineering/platform/issues/4935)) · Chat navigator ([#4941](https://github.com/hcengineering/platform/issues/4941)) 
* EZQMS-459: · Hoisted `showNotify` calculation to `ActivityNotificationPresenter` ([#4937](https://github.com/hcengineering/platform/issues/4937)) 
* EZQMS-649: · Moved some common utilities from Uberflow to Platform ([#4927](https://github.com/hcengineering/platform/issues/4927)) 
* TESTS-102: · Feat(tests): done Label filter test ([#4885](https://github.com/hcengineering/platform/issues/4885)) 
* TESTS-216: · Feat(tests): done Public link generate test ([#4915](https://github.com/hcengineering/platform/issues/4915)) 
* TESTS-217: · Feat(test): done Public link Revoke test ([#4926](https://github.com/hcengineering/platform/issues/4926)) 
* TESTS-236: · Feat(tests): done Create workspace with LastToken in the localStorage test ([#4939](https://github.com/hcengineering/platform/issues/4939)) 
* TESTS-94: · Feat(tests): done Due date filter test  ([#4891](https://github.com/hcengineering/platform/issues/4891)) 
* UBERF-5825: · Fix github issues ([#4924](https://github.com/hcengineering/platform/issues/4924)) 
* UBERF-5932: · Fix account upgrade ([#4912](https://github.com/hcengineering/platform/issues/4912)) 

## [0.6.209] - 2024-03-08

* 🚀 FEATURES: · Add archive all button in inbox ([#4870](https://github.com/hcengineering/platform/issues/4870)) · *(planner)* Improve and reuse `Chip` ([#4854](https://github.com/hcengineering/platform/issues/4854)) · Add confirmation modal for archive all and add read all option ([#4880](https://github.com/hcengineering/platform/issues/4880)) 
* 🐛 BUG FIXES: · *(todo)* Checkbox focus and spinner ([#4890](https://github.com/hcengineering/platform/issues/4890)) · *(todo)* Broken context actions ([#4889](https://github.com/hcengineering/platform/issues/4889)) · Navigation to inbox from cmd-k modal ([#4900](https://github.com/hcengineering/platform/issues/4900)) · Notifications remove on doc remove ([#4901](https://github.com/hcengineering/platform/issues/4901)) · Docker build ([#4906](https://github.com/hcengineering/platform/issues/4906)) 
* ⚙️ MISCELLANEOUS TASKS: · Video preload in inbox left panel ([#4902](https://github.com/hcengineering/platform/issues/4902)) 
* EZQMS-377: · Add file attachments extension to text editor ([#4284](https://github.com/hcengineering/platform/issues/4284)) 
* EZQMS-562: · Introduced reusable `NotificationToast` component ([#4873](https://github.com/hcengineering/platform/issues/4873)) 
* EZQMS-602: · Moved Rank to its own package ([#4845](https://github.com/hcengineering/platform/issues/4845)) 
* TESTS-100: · Feat(tests): done Milestone filter test  ([#4872](https://github.com/hcengineering/platform/issues/4872)) 
* TESTS-101: · Feat(tests): done Modified by filter test  ([#4871](https://github.com/hcengineering/platform/issues/4871)) 
* TESTS-103: · Feat(tests): done Title filter test ([#4863](https://github.com/hcengineering/platform/issues/4863)) 
* UBERF-5811: · Rework backlinks ([#4887](https://github.com/hcengineering/platform/issues/4887)) 
* UBERF-5827: · Add collaborative description for companies ([#4851](https://github.com/hcengineering/platform/issues/4851)) 
* UBERF-5886: · Fix todo reorder on click ([#4904](https://github.com/hcengineering/platform/issues/4904)) 

## [0.6.208] - 2024-03-04

* 🚀 FEATURES: · New todo checkbox ([#4841](https://github.com/hcengineering/platform/issues/4841)) · *(tests)* TESTS-93 updated Created date filter test ([#4862](https://github.com/hcengineering/platform/issues/4862)) · *(tests)* Updated Created date filter test ([#4868](https://github.com/hcengineering/platform/issues/4868)) 
* 🐛 BUG FIXES: · Create event popup improvements ([#4850](https://github.com/hcengineering/platform/issues/4850)) · Providers new tab ([#4855](https://github.com/hcengineering/platform/issues/4855)) · Login infinity requests ([#4865](https://github.com/hcengineering/platform/issues/4865)) 
* TESTS-212: · Feat(tests): done Add comment by popup test ([#4817](https://github.com/hcengineering/platform/issues/4817)) 
* UBERF-5870: · Fix cache control and some minor enhancements ([#4869](https://github.com/hcengineering/platform/issues/4869)) 

## [0.6.207] - 2024-03-01

* ⚙️ MISCELLANEOUS TASKS: · Social login for mobile ([#4852](https://github.com/hcengineering/platform/issues/4852)) · Workbench for mobile ([#4853](https://github.com/hcengineering/platform/issues/4853)) 
* UBERF-5812: · Fix allow to delete based on all my accounts ([#4823](https://github.com/hcengineering/platform/issues/4823)) 

## [0.6.206] - 2024-03-01

* 🚀 FEATURES: · *(tests)* Added documents tests ([#4843](https://github.com/hcengineering/platform/issues/4843)) 
* 🐛 BUG FIXES: · Guests links ([#4839](https://github.com/hcengineering/platform/issues/4839)) · Oauth session ([#4840](https://github.com/hcengineering/platform/issues/4840)) 
* UBERF-5712: · Fix jumping when scroll in bottom and add auto scroll to new content ([#4830](https://github.com/hcengineering/platform/issues/4830)) 

## [0.6.205] - 2024-02-29

* 🚀 FEATURES: · And fix pt and es languages ([#4792](https://github.com/hcengineering/platform/issues/4792)) · *(tests)* Added execute deploy in any status ([#4767](https://github.com/hcengineering/platform/issues/4767)) 
* 🐛 BUG FIXES: · Validate build ([#4780](https://github.com/hcengineering/platform/issues/4780)) · Settins roles check ([#4789](https://github.com/hcengineering/platform/issues/4789)) · Timezone with _ display ([#4793](https://github.com/hcengineering/platform/issues/4793)) · Roles ([#4806](https://github.com/hcengineering/platform/issues/4806)) · Double date ([#4825](https://github.com/hcengineering/platform/issues/4825)) 
* ⚙️ MISCELLANEOUS TASKS: · Ses from docker-compose ([#4798](https://github.com/hcengineering/platform/issues/4798)) 
* TESTS-196: · Feat(test): done Remove relation be editing issue details test  ([#4755](https://github.com/hcengineering/platform/issues/4755)) 
* UBER-1239: · Fix missing notifications for mentions from doc ([#4820](https://github.com/hcengineering/platform/issues/4820)) 
* UBERF-5394: · Create component for new search input ([#4777](https://github.com/hcengineering/platform/issues/4777)) 
* UBERF-5604: · Avoid extra calls on read notifications ([#4781](https://github.com/hcengineering/platform/issues/4781)) 
* UBERF-5621: · Add full date tooltip ([#4783](https://github.com/hcengineering/platform/issues/4783)) 
* UBERF-5626: · Set autofocus end on message edit ([#4784](https://github.com/hcengineering/platform/issues/4784)) 
* UBERF-5630: · Fix inactive employee status in activity ([#4782](https://github.com/hcengineering/platform/issues/4782)) 
* UBERF-5650: · Do not send mention notification if user already notified ([#4821](https://github.com/hcengineering/platform/issues/4821)) 
* UBERF-5675: · Fix activity and notifications for colelction update ([#4819](https://github.com/hcengineering/platform/issues/4819)) 
* UBERF-5718: · Allow to find one from existing queries ([#4776](https://github.com/hcengineering/platform/issues/4776)) 
* UBERF-5733: · Remove invalid lookup update ([#4779](https://github.com/hcengineering/platform/issues/4779)) 
* UBERF-5734: · Fix guest mode display of server generated links ([#4790](https://github.com/hcengineering/platform/issues/4790)) 
* UBERF-5744: · Fix exception on server ([#4787](https://github.com/hcengineering/platform/issues/4787)) 
* UBERF-5795: · Improve logging capabilities ([#4813](https://github.com/hcengineering/platform/issues/4813)) 

## [0.6.204] - 2024-02-26

* ⚙️ MISCELLANEOUS TASKS: · Readme ([#4772](https://github.com/hcengineering/platform/issues/4772)) 
* TESTS-193: · TESTS-194: feat(tests): working on the tests  ([#4739](https://github.com/hcengineering/platform/issues/4739)) 

## [0.6.203] - 2024-02-25

* UBERF-5511: · Fix query and include ibm plex mono ([#4764](https://github.com/hcengineering/platform/issues/4764)) 

## [0.6.202] - 2024-02-23

* 🚀 FEATURES: · *(tests)* TESTS-47 done Mark as blocked by test ([#4737](https://github.com/hcengineering/platform/issues/4737)) 
* 🐛 BUG FIXES: · Blinks on thread open, messages reading ([#4743](https://github.com/hcengineering/platform/issues/4743)) · Filtering in task status selector ([#4741](https://github.com/hcengineering/platform/issues/4741)) · Select workspace logout ([#4760](https://github.com/hcengineering/platform/issues/4760)) 
* UBER-958: · Fix query updates ([#4742](https://github.com/hcengineering/platform/issues/4742)) 
* UBERF-5594: · Render mentions before object is loaded ([#4738](https://github.com/hcengineering/platform/issues/4738)) 
* UBERF-5595: · Hide link preview for chat ([#4752](https://github.com/hcengineering/platform/issues/4752)) · Set up attachments sizes ([#4746](https://github.com/hcengineering/platform/issues/4746)) 
* UBERF-5628: · Fix unexpected Reference object in Activity on mentions in description ([#4753](https://github.com/hcengineering/platform/issues/4753)) 
* UBERF-5673: · Esbuild transpile ([#4748](https://github.com/hcengineering/platform/issues/4748)) 
* UBERF-5694: · Attempt to fix build cache ([#4757](https://github.com/hcengineering/platform/issues/4757)) 

## [0.6.201] - 2024-02-20

* 🐛 BUG FIXES: · Parent issue identifier ([#4722](https://github.com/hcengineering/platform/issues/4722)) 
* TESTS-182: · Feat(tests): done Create sub-issue from template test  ([#4711](https://github.com/hcengineering/platform/issues/4711)) 
* UBER-1227: · Fix members duplicates ([#4721](https://github.com/hcengineering/platform/issues/4721)) 

## [0.6.200] - 2024-02-19

* TESTS-192: · Feat(tests): done Add comment with image attachment test ([#4687](https://github.com/hcengineering/platform/issues/4687)) 
* UBER-708: · Github related fixes ([#4704](https://github.com/hcengineering/platform/issues/4704)) 
* UBERF-5472: · Add pagination for channels/direct ([#4706](https://github.com/hcengineering/platform/issues/4706)) 
* UBERF-5586: · Improve loading of reactions and saved messages ([#4694](https://github.com/hcengineering/platform/issues/4694)) 

## [0.6.198] - 2024-02-16

* 🚀 FEATURES: · *(tests)* Updated reports and prepare server step ([#4659](https://github.com/hcengineering/platform/issues/4659)) · Analytics ([#4682](https://github.com/hcengineering/platform/issues/4682)) · Add strings for classes ([#4683](https://github.com/hcengineering/platform/issues/4683)) 
* 🐛 BUG FIXES: · Account model sorting key ([#4663](https://github.com/hcengineering/platform/issues/4663)) · Create project type ([#4685](https://github.com/hcengineering/platform/issues/4685)) 
* ⚙️ MISCELLANEOUS TASKS: · Moment-timezone ([#4656](https://github.com/hcengineering/platform/issues/4656)) 
* UBERF-5548: · Use esbuild with webpack ([#4657](https://github.com/hcengineering/platform/issues/4657)) 
* UBERF-5570: · Fix avatars ([#4679](https://github.com/hcengineering/platform/issues/4679)) 
* UBERF-5575: · Fix workspace join ([#4684](https://github.com/hcengineering/platform/issues/4684)) 
* UBERF-5551: · Configurable click propagation from edit box ([#4674](https://github.com/hcengineering/platform/issues/4674)) 

## [0.6.197] - 2024-02-15

* UBERF-5526: · Fix scroll to new messages ([#4651](https://github.com/hcengineering/platform/issues/4651)) 
* UBERF-5532: · Fix recruit comments typo ([#4648](https://github.com/hcengineering/platform/issues/4648)) 
* UBERF-5538: · Fix server queryFind with mixins ([#4653](https://github.com/hcengineering/platform/issues/4653)) 

## [0.6.196] - 2024-02-14

* 🚀 FEATURES: · Chat loading ([#4627](https://github.com/hcengineering/platform/issues/4627)) 
* 🐛 BUG FIXES: · Chat scrolling to new messages ([#4615](https://github.com/hcengineering/platform/issues/4615)) ([#4633](https://github.com/hcengineering/platform/issues/4633)) 
* EZQMS-563: · Moved `ActionWithAvailability` helper type and functions from `questions` to `view` ([#4611](https://github.com/hcengineering/platform/issues/4611)) 
* UBERF-4319: · Fix performance issues ([#4631](https://github.com/hcengineering/platform/issues/4631)) 
* UBERF-5467: · Remove hidden notifications and use Lazy on inbox  ([#4632](https://github.com/hcengineering/platform/issues/4632)) 
* UBERF-5476: · Fix archive in inbox ([#4618](https://github.com/hcengineering/platform/issues/4618)) 
* UBERF-5485: · Fix versions in bundled resources ([#4625](https://github.com/hcengineering/platform/issues/4625)) 
* UBERF-5495: · Load all messages for inbox with one query ([#4628](https://github.com/hcengineering/platform/issues/4628)) 

## [0.6.195] - 2024-02-13

* 🚀 FEATURES: · Add dropdown with creating project button for "New issue" button in tracker ([#4612](https://github.com/hcengineering/platform/issues/4612)) 
* 🐛 BUG FIXES: · Name for rush command ([#4607](https://github.com/hcengineering/platform/issues/4607)) · Creating suubissues from template ([#4610](https://github.com/hcengineering/platform/issues/4610)) 
* ⚙️ MISCELLANEOUS TASKS: · BaseProjectType ([#4597](https://github.com/hcengineering/platform/issues/4597)) 
* TESTS-167: · Feat(tests): done Check that the issue backlink test ([#4596](https://github.com/hcengineering/platform/issues/4596)) 
* TESTS-179: · Feat(tests): done Check the changed description activity test  ([#4598](https://github.com/hcengineering/platform/issues/4598)) 
* UBEF-4319: · Few more performance fixes ([#4613](https://github.com/hcengineering/platform/issues/4613)) 
* UBERF-4319: · Fix create issue performance ([#4608](https://github.com/hcengineering/platform/issues/4608)) 
* UBERF-5323: · Fix new messages marker ([#4614](https://github.com/hcengineering/platform/issues/4614)) 
* UBERF-5324: · Allow cmd-k for editable content ([#4601](https://github.com/hcengineering/platform/issues/4601)) 
* UBERF-5438: · Fix edit issue attributes keys ([#4602](https://github.com/hcengineering/platform/issues/4602)) 

## [0.6.194] - 2024-02-09

* 🚀 FEATURES: · *(tests)* TESTS-166 done Check Contact activity backlink test ([#4585](https://github.com/hcengineering/platform/issues/4585)) 
* 🐛 BUG FIXES: · Edit statuses link ([#4593](https://github.com/hcengineering/platform/issues/4593)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md typo ([#4589](https://github.com/hcengineering/platform/issues/4589)) 
* UBERF-5408: · Fix inline images in comments ([#4591](https://github.com/hcengineering/platform/issues/4591)) 
* UBERF-5418: · Fix status editing ([#4590](https://github.com/hcengineering/platform/issues/4590)) 

## [0.6.193] - 2024-02-08

* 🚀 FEATURES: · *(test)* Updated Move to project test ([#4582](https://github.com/hcengineering/platform/issues/4582)) 
* TESTS-164: · Feat(tests): done mentioned in the issue test ([#4575](https://github.com/hcengineering/platform/issues/4575)) 
* UBERF-4867: · Fix issues mentions display ([#4580](https://github.com/hcengineering/platform/issues/4580)) 
* UBERF-5325: · Disable send message during attachment upload ([#4583](https://github.com/hcengineering/platform/issues/4583)) 
* UBERF-5326: · Fix extra scroll and higlight when thread opened ([#4579](https://github.com/hcengineering/platform/issues/4579)) 
* UBERF-5382: · Allow to disable component edit for some cases ([#4574](https://github.com/hcengineering/platform/issues/4574)) 
* UBERF-5393: · Fix backlink for thread ([#4578](https://github.com/hcengineering/platform/issues/4578)) 

## [0.6.192] - 2024-02-07

* 🚀 FEATURES: · *(tests)* Updated Create duplicate issues test ([#4542](https://github.com/hcengineering/platform/issues/4542)) · *(tests)* Updated close issue selector ([#4551](https://github.com/hcengineering/platform/issues/4551)) · *(tests)* TESTS-171 done Check validation steps test ([#4558](https://github.com/hcengineering/platform/issues/4558)) 
* 🐛 BUG FIXES: · Tags view action button layout ([#4514](https://github.com/hcengineering/platform/issues/4514)) 
* ⚙️ MISCELLANEOUS TASKS: · SelectWorkspace.svelte: Removed height for the workspaces list in order to fix scrolling ([#4539](https://github.com/hcengineering/platform/issues/4539)) · Readme.md: Simply removing the extra letter in the word ([#4540](https://github.com/hcengineering/platform/issues/4540)) · Node version to v20 ([#4532](https://github.com/hcengineering/platform/issues/4532)) · Actions/setup-node from 3 to 4 ([#4557](https://github.com/hcengineering/platform/issues/4557)) 
* EZQMS-531: · Prop to disable Save As and Save buttons in `FilterBar` ([#4560](https://github.com/hcengineering/platform/issues/4560)) 
* TESTS-169: · Feat(tests): done Create a workspace with a custom name test ([#4541](https://github.com/hcengineering/platform/issues/4541)) 
* UBERF-4319: · Trigger Server queries ([#4550](https://github.com/hcengineering/platform/issues/4550)) 
* UBERF-5289: · Fix getting parent doc for some cases for indexing ([#4549](https://github.com/hcengineering/platform/issues/4549)) 
* UBERF-5315: · Update chat  ([#4572](https://github.com/hcengineering/platform/issues/4572)) 
* UBERF-5321: · Fix workspace CLI upgrade ([#4534](https://github.com/hcengineering/platform/issues/4534)) 
* UBERF-5348: · Fix new status creation ([#4567](https://github.com/hcengineering/platform/issues/4567)) 
* UBERF-5350: · Fix workspace name create issue ([#4555](https://github.com/hcengineering/platform/issues/4555)) 
* UBERF-5364: · Fix targeted broadcast on server ([#4565](https://github.com/hcengineering/platform/issues/4565)) 

## [0.6.191] - 2024-02-05

* 🐛 BUG FIXES: · Broken checkbox behavior ([#4509](https://github.com/hcengineering/platform/issues/4509)) · Template popup ([#4522](https://github.com/hcengineering/platform/issues/4522)) · Popup glitches caused by long calculations ([#4511](https://github.com/hcengineering/platform/issues/4511)) · Automation ([#4531](https://github.com/hcengineering/platform/issues/4531)) 
* UBERF-5017: · Show correct collaborators diff and dont send notification for collaborators changer ([#4529](https://github.com/hcengineering/platform/issues/4529)) 
* UBERF-5304: · Fix init workspace ([#4524](https://github.com/hcengineering/platform/issues/4524)) 

## [0.6.190] - 2024-02-03

* UBERF-5280: · Fix backup service ([#4506](https://github.com/hcengineering/platform/issues/4506)) 

## [0.6.188] - 2024-02-02

* 🚀 FEATURES: · *(tests)* Updated filter between tests ([#4488](https://github.com/hcengineering/platform/issues/4488)) 
* 🐛 BUG FIXES: · Hover with border inside doc activity ([#4500](https://github.com/hcengineering/platform/issues/4500)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#4475](https://github.com/hcengineering/platform/issues/4475)) · README.md ([#4495](https://github.com/hcengineering/platform/issues/4495)) · README.md ([#4496](https://github.com/hcengineering/platform/issues/4496)) · README.md ([#4497](https://github.com/hcengineering/platform/issues/4497)) 
* EZQMS-467: · Fixed group for `Open in new tab` action ([#4481](https://github.com/hcengineering/platform/issues/4481)) 
* UBER-1160: · Open vacancy panel when it’s opened from applicant ([#4473](https://github.com/hcengineering/platform/issues/4473)) 
* UBER-944: · Action for opening in new tab ([#4447](https://github.com/hcengineering/platform/issues/4447)) 
* UBERF-4319: · Performance changes ([#4474](https://github.com/hcengineering/platform/issues/4474)) · Improve performance ([#4501](https://github.com/hcengineering/platform/issues/4501)) 
* UBERF-4983: · Update chat ui ([#4483](https://github.com/hcengineering/platform/issues/4483)) 
* UBERF-5020: · Fix reply to thread ([#4502](https://github.com/hcengineering/platform/issues/4502)) 
* UBERF-5140: · Any workspace names ([#4489](https://github.com/hcengineering/platform/issues/4489)) 
* UBERF-5232: · Fix wrong activity message title ([#4498](https://github.com/hcengineering/platform/issues/4498)) 
* UBERF-5243: · Add default size, make icons size consistent ([#4494](https://github.com/hcengineering/platform/issues/4494)) 
* UBERF-5265: · Fix workspace creation ([#4499](https://github.com/hcengineering/platform/issues/4499)) 
* UBERF-5275: · Fix collaborator editing ([#4505](https://github.com/hcengineering/platform/issues/4505)) 

## [0.6.187] - 2024-01-30

* 🚀 FEATURES: · Integration disabled message ([#4461](https://github.com/hcengineering/platform/issues/4461)) 
* 🐛 BUG FIXES: · Plus button in reactions and fix common notification overflow ([#4467](https://github.com/hcengineering/platform/issues/4467)) · Activity messages generation and display ([#4469](https://github.com/hcengineering/platform/issues/4469)) · Workbench.mergeLoc when opening the same project ([#4468](https://github.com/hcengineering/platform/issues/4468)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra logs ([#4456](https://github.com/hcengineering/platform/issues/4456)) 
* TESTS-159: · Feat(tests): done Create issue with several attachment tests ([#4464](https://github.com/hcengineering/platform/issues/4464)) 
* UBER-1005: · Array<Ref<T>> support as custom attribute ([#4471](https://github.com/hcengineering/platform/issues/4471)) 
* UBER-1198: · Upgrade to mongo 7 ([#4472](https://github.com/hcengineering/platform/issues/4472)) 
* UBERF-4631: · Fix issue when link preview in activity displayed as #undefined ([#4435](https://github.com/hcengineering/platform/issues/4435)) 
* EZQMS-537: · Make thread header hidable ([#4458](https://github.com/hcengineering/platform/issues/4458)) 

## [0.6.186] - 2024-01-25

* 🚀 FEATURES: · *(tests)* Updated duplicate issues test  ([#4450](https://github.com/hcengineering/platform/issues/4450)) 
* 🐛 BUG FIXES: · Activity link hover underline color ([#4444](https://github.com/hcengineering/platform/issues/4444)) · Baclink presenter in activity ([#4452](https://github.com/hcengineering/platform/issues/4452)) · Ungrouping in inbox ([#4448](https://github.com/hcengineering/platform/issues/4448)) 
* EZQMS-461: · Add generics for `ModeSelector` and `SpecialView` ([#4437](https://github.com/hcengineering/platform/issues/4437)) · Better typings for `ModeSelector` ([#4451](https://github.com/hcengineering/platform/issues/4451)) 
* UBERF-4970: · Fix component update ([#4455](https://github.com/hcengineering/platform/issues/4455)) 
* UBERF-5083: · Fix project delete ([#4446](https://github.com/hcengineering/platform/issues/4446)) 

## [0.6.185] - 2024-01-25

* 🚀 FEATURES: · Kanban view ([#4441](https://github.com/hcengineering/platform/issues/4441)) 
* 🐛 BUG FIXES: · Double hover ([#4431](https://github.com/hcengineering/platform/issues/4431)) · Workbench for admin ([#4432](https://github.com/hcengineering/platform/issues/4432)) · Hidden notifications ([#4436](https://github.com/hcengineering/platform/issues/4436)) 
* EZQMS-538: · Allow command contributions to dev tool ([#4440](https://github.com/hcengineering/platform/issues/4440)) 

## [0.6.184] - 2024-01-24

* 🚀 FEATURES: · Chunter app ([#4426](https://github.com/hcengineering/platform/issues/4426)) · *(tests)* Skipped Set parent issue test ([#4427](https://github.com/hcengineering/platform/issues/4427)) 
* 🐛 BUG FIXES: · Get account ([#4425](https://github.com/hcengineering/platform/issues/4425)) 
* ⚙️ MISCELLANEOUS TASKS: · Favicons ([#4422](https://github.com/hcengineering/platform/issues/4422)) 
* EZQMS-527: · Introduced `ActionButton` component ([#4412](https://github.com/hcengineering/platform/issues/4412)) · Consistent defaults for `ActionButton` ([#4421](https://github.com/hcengineering/platform/issues/4421)) 

## [0.6.183] - 2024-01-23

* 🐛 BUG FIXES: · Model version approach ([#4413](https://github.com/hcengineering/platform/issues/4413)) 
* ⚙️ MISCELLANEOUS TASKS: · Hover with border in inbox ([#4417](https://github.com/hcengineering/platform/issues/4417)) 
* UBERF-5018: · Search improvements/Indexing fix ([#4403](https://github.com/hcengineering/platform/issues/4403)) 
* UBERF-5024: · Add reactions control to inbox ([#4414](https://github.com/hcengineering/platform/issues/4414)) 
* UBERF-5042: · Fix exception in list view ([#4419](https://github.com/hcengineering/platform/issues/4419)) 

## [0.6.182] - 2024-01-22

* 🐛 BUG FIXES: · Collaborator content API ([#4397](https://github.com/hcengineering/platform/issues/4397)) 
* EZQMS-527: · Expose `EmployeeArrayEditor` from `contact-resources` ([#4411](https://github.com/hcengineering/platform/issues/4411)) 
* UBERF-5012: · Remove extra key (avoid reloading after notifications deleting) ([#4399](https://github.com/hcengineering/platform/issues/4399)) · Use flat message view if doc has only one notification ([#4410](https://github.com/hcengineering/platform/issues/4410)) 
* UBERF-5023: · Make flat view default ([#4409](https://github.com/hcengineering/platform/issues/4409)) 

## [0.6.181a] - 2024-01-20

* 🚀 FEATURES: · *(test)* Updated flaky tests ([#4393](https://github.com/hcengineering/platform/issues/4393)) 
* 🐛 BUG FIXES: · Remove unused deps ([#4394](https://github.com/hcengineering/platform/issues/4394)) 

## [0.6.181] - 2024-01-19

* 🚀 FEATURES: · Add keyboard support for inbox and simplify code ([#4380](https://github.com/hcengineering/platform/issues/4380)) 
* 🐛 BUG FIXES: · Duplicates of inbox notifications and notify contexts ([#4383](https://github.com/hcengineering/platform/issues/4383)) 
* EZQMS-457: · Added optional ModeSelector to SpecialView ([#4381](https://github.com/hcengineering/platform/issues/4381)) 
* EZQMS-529: · Added support for primary/positive/negative kinds for CheckBox and RadioButton ([#4384](https://github.com/hcengineering/platform/issues/4384)) · Added support for `grow` and new `align` display options in `Table` ([#4389](https://github.com/hcengineering/platform/issues/4389)) 
* UBERF-5000: · Handle derived tx for security context update ([#4391](https://github.com/hcengineering/platform/issues/4391)) 

## [0.6.180] - 2024-01-18

* 🐛 BUG FIXES: · Return ActivityMessageHeader, since it is used by github ([#4377](https://github.com/hcengineering/platform/issues/4377)) 
* ⚙️ MISCELLANEOUS TASKS: · Actions/cache from 3 to 4 ([#4372](https://github.com/hcengineering/platform/issues/4372)) 
* UBERF-4361: · Update inbox ui ([#4376](https://github.com/hcengineering/platform/issues/4376)) 

## [0.6.179] - 2024-01-17

* 🚀 FEATURES: · *(tests)* Updated flaky tests ([#4367](https://github.com/hcengineering/platform/issues/4367)) 
* EZQMS-470: · Add server side tiptap extension for node uuid ([#4358](https://github.com/hcengineering/platform/issues/4358)) 
* UBER-1188: · Fix exception during login/logout ([#4364](https://github.com/hcengineering/platform/issues/4364)) 
* UBERF-4957: · Fix status colors ([#4369](https://github.com/hcengineering/platform/issues/4369)) 

## [0.6.178] - 2024-01-16

* 🚀 FEATURES: · *(tests)* Update Merge contacts test ([#4339](https://github.com/hcengineering/platform/issues/4339)) 
* 🐛 BUG FIXES: · *(tests)* Disabled failed tests ([#4331](https://github.com/hcengineering/platform/issues/4331)) · Change activity onhover ([#4336](https://github.com/hcengineering/platform/issues/4336)) · Inbox migration and common notification component ([#4348](https://github.com/hcengineering/platform/issues/4348)) · Indexes, use DocIndexState for fields shown in search ([#4341](https://github.com/hcengineering/platform/issues/4341)) · Edit Vacancy test ([#4346](https://github.com/hcengineering/platform/issues/4346)) 
* UBER-1187: · AnyType field support ([#4343](https://github.com/hcengineering/platform/issues/4343)) 
* UBERF-4360: · Rewrite chat  ([#4265](https://github.com/hcengineering/platform/issues/4265)) 
* UBERF-4868: · Disable draft saving for comment editing ([#4332](https://github.com/hcengineering/platform/issues/4332)) 
* UBERF-4928: · Indexing fixes ([#4357](https://github.com/hcengineering/platform/issues/4357)) 

## [0.6.177] - 2024-01-08

* 🐛 BUG FIXES: · Incorrect space for taskType ([#4322](https://github.com/hcengineering/platform/issues/4322)) 
* UBER-1185: · Fix TT migration issues ([#4320](https://github.com/hcengineering/platform/issues/4320)) 
* UBERF-4870: · Fixed attribute creation ([#4325](https://github.com/hcengineering/platform/issues/4325)) 

## [0.6.175] - 2024-01-05

* 🚀 FEATURES: · *(tests)* Updated tests ([#4296](https://github.com/hcengineering/platform/issues/4296)) 

## [0.6.174a] - 2023-12-29

* UBERF-4799: · Fix migration tasktype doubling ([#4289](https://github.com/hcengineering/platform/issues/4289)) 

## [0.6.174] - 2023-12-29

* 🐛 BUG FIXES: · Description diff in activity ([#4283](https://github.com/hcengineering/platform/issues/4283)) 

## [0.6.173] - 2023-12-28

* 🚀 FEATURES: · *(tests)* TESTS-15 done Create a new Company test ([#4242](https://github.com/hcengineering/platform/issues/4242)) · *(tests)* Updated flaky tests ([#4244](https://github.com/hcengineering/platform/issues/4244)) · *(tests)* TESTS-21 done Match to vacancy test ([#4268](https://github.com/hcengineering/platform/issues/4268)) 
* 🐛 BUG FIXES: · Overdue filter ([#4262](https://github.com/hcengineering/platform/issues/4262)) · Default value in TaskKindSelector ([#4276](https://github.com/hcengineering/platform/issues/4276)) 
* ⚙️ MISCELLANEOUS TASKS: · Settings layout ([#4277](https://github.com/hcengineering/platform/issues/4277)) 
* EZQMS-430: · Update change document owner popup ([#4278](https://github.com/hcengineering/platform/issues/4278)) 
* TESTS-16: · Feat(tests): done Edit a Company test ([#4243](https://github.com/hcengineering/platform/issues/4243)) 
* TESTS-17: · Feat(tests): done Delete a Company test ([#4252](https://github.com/hcengineering/platform/issues/4252)) 
* TESTS-20: · Feat(tests): done Archive a Vacancy test  ([#4254](https://github.com/hcengineering/platform/issues/4254)) 
* TESTS-23: · Feat(tests): done Export vacancies tests ([#4253](https://github.com/hcengineering/platform/issues/4253)) 
* TESTS-51: · Feat(tests): done Delete a component test ([#4234](https://github.com/hcengineering/platform/issues/4234)) 
* TSK-1668: · Side changes from Surveys ([#4271](https://github.com/hcengineering/platform/issues/4271)) 
* UBER-1178: · Rework indexing fields ([#4261](https://github.com/hcengineering/platform/issues/4261)) 
* UBERF-4716: · Activity info message ([#4241](https://github.com/hcengineering/platform/issues/4241)) 
* UBERF-4729: · Fix front service ([#4260](https://github.com/hcengineering/platform/issues/4260)) 
* UBERF-4738: · Fix attachments preview ([#4259](https://github.com/hcengineering/platform/issues/4259)) 
* EZQMS-449: · Wrap initial collaborator content loading with try-catch ([#4256](https://github.com/hcengineering/platform/issues/4256)) 
* EZQMS-452: · Fix issue presenter ([#4263](https://github.com/hcengineering/platform/issues/4263)) 

## [0.6.172] - 2023-12-21

* 🚀 FEATURES: · *(tests)* TESTS-48 done Create duplicate issues test ([#4225](https://github.com/hcengineering/platform/issues/4225)) · *(tests)* TESTS-40 done Delete an issue test ([#4233](https://github.com/hcengineering/platform/issues/4233)) 
* 🐛 BUG FIXES: · Double icons in issue status changed activity messages ([#4228](https://github.com/hcengineering/platform/issues/4228)) · Same tags adding uberf 4427 ([#4235](https://github.com/hcengineering/platform/issues/4235)) · Description diff and collections presenters ([#4240](https://github.com/hcengineering/platform/issues/4240)) 
* TESTS-50: · Feat(tests): done Edit a component test ([#4232](https://github.com/hcengineering/platform/issues/4232)) 
* UBERF-4692: · Remove activity messages on doc remove ([#4227](https://github.com/hcengineering/platform/issues/4227)) 
* UBERF-4707: · Fix activity messages updating ([#4238](https://github.com/hcengineering/platform/issues/4238)) 
* QFIX: · Update DropdownLabels for showing dropdown icon ([#4230](https://github.com/hcengineering/platform/issues/4230)) 

## [0.6.171] - 2023-12-20

* 🚀 FEATURES: · *(tests)* TESTS-54 done Edit a Milestone test ([#4175](https://github.com/hcengineering/platform/issues/4175)) · *(tests)* TESTS-55 done Delete a Milestone test ([#4184](https://github.com/hcengineering/platform/issues/4184)) · *(tests)* Updated tests ([#4185](https://github.com/hcengineering/platform/issues/4185)) · *(tests)* Updated sanity-ws dump and tests ([#4202](https://github.com/hcengineering/platform/issues/4202)) · *(tests)* TESTS-45 done Move to project test ([#4203](https://github.com/hcengineering/platform/issues/4203)) · *(tests)* Updated tests ([#4209](https://github.com/hcengineering/platform/issues/4209)) · *(tests)* Updated Edit a sub-issue test  ([#4210](https://github.com/hcengineering/platform/issues/4210)) · *(tests)* Updated move to project tests  ([#4214](https://github.com/hcengineering/platform/issues/4214)) · *(tests)* TESTS-81 done Comment stored test ([#4216](https://github.com/hcengineering/platform/issues/4216)) · *(tests)* Updated flaky tests ([#4218](https://github.com/hcengineering/platform/issues/4218)) · *(tests)* TESTS-106 ([#4217](https://github.com/hcengineering/platform/issues/4217)) · *(tests)* TESTS-41 done Delete a sub-issue test ([#4223](https://github.com/hcengineering/platform/issues/4223)) · *(tests)* Updated tests ([#4224](https://github.com/hcengineering/platform/issues/4224)) 
* 🐛 BUG FIXES: · Bw tool ([#4167](https://github.com/hcengineering/platform/issues/4167)) · Sharp version ([#4168](https://github.com/hcengineering/platform/issues/4168)) · Clean ([#4206](https://github.com/hcengineering/platform/issues/4206)) 
* EZQMS-440: · Fix quality events ([#4183](https://github.com/hcengineering/platform/issues/4183)) 
* TESTS-42: · Feat(tests): done Edit Sub-Issue test ([#4191](https://github.com/hcengineering/platform/issues/4191)) 
* TESTS-44: · Feat(tests): the Set parent issue test ([#4158](https://github.com/hcengineering/platform/issues/4158)) 
* TESTS-46: · Feat(tests): done New related issue test ([#4192](https://github.com/hcengineering/platform/issues/4192)) 
* TESTS-59: · Feat(tests): done Create an Issue from template test  ([#4212](https://github.com/hcengineering/platform/issues/4212)) 
* TESTS-98: · Feat(tests): done Created by filter test ([#4161](https://github.com/hcengineering/platform/issues/4161)) 
* TESTS-99: · Feat(tests): done Component filter test  ([#4162](https://github.com/hcengineering/platform/issues/4162)) 
* TSK-1668: · Survey plugin ([#4174](https://github.com/hcengineering/platform/issues/4174)) 
* UBER-1179: · Fix comments saving ([#4205](https://github.com/hcengineering/platform/issues/4205)) 
* UBER-1182: · Fix github task types support ([#4215](https://github.com/hcengineering/platform/issues/4215)) · Fix task type categories ([#4222](https://github.com/hcengineering/platform/issues/4222)) 
* UBERF-4248: · Task type ([#4042](https://github.com/hcengineering/platform/issues/4042)) 
* UBERF-4432: · Better notifications for Chunter ([#4165](https://github.com/hcengineering/platform/issues/4165)) 
* UBERF-4610: · Fix checkbox behaviour ([#4173](https://github.com/hcengineering/platform/issues/4173)) 
* UBERF-4620: · Fix show less triangle ([#4182](https://github.com/hcengineering/platform/issues/4182)) 
* UBERF-4632: · Refactor activity classes structure ([#4190](https://github.com/hcengineering/platform/issues/4190)) 
* UBERF-4649: · Fix query projection/cache issue ([#4200](https://github.com/hcengineering/platform/issues/4200)) 

## [0.6.170] - 2023-12-07

* TESTS-26: · Feat(tests): done Archive Project tests  ([#4157](https://github.com/hcengineering/platform/issues/4157)) 
* TESTS-97: · Feat(tests): done the Priority filter test ([#4156](https://github.com/hcengineering/platform/issues/4156)) 
* UBERF-4451: · Fixed how resolved default location is applied on initial routing ([#4159](https://github.com/hcengineering/platform/issues/4159)) 
* UBERF-4526: · Elastic bulk error on re-indexing ([#4155](https://github.com/hcengineering/platform/issues/4155)) 

## [0.6.169] - 2023-12-06

* 🚀 FEATURES: · *(tests)* Updated sanity-ws dump ([#4149](https://github.com/hcengineering/platform/issues/4149)) · *(tests)* TESTS-95 done Status filter test ([#4150](https://github.com/hcengineering/platform/issues/4150)) 
* TESTS-25: · Feat(tests): done Edit project tests ([#4138](https://github.com/hcengineering/platform/issues/4138)) 
* UBERF-4477: · Fixed positioning of `AddSavedView` popup ([#4148](https://github.com/hcengineering/platform/issues/4148)) 
* UBERF-4560: · Filter out spaces that are archived for kanban ([#4147](https://github.com/hcengineering/platform/issues/4147)) 

## [0.6.168] - 2023-12-05

* UBERF-4555: · Fix elastic backup/restore ([#4144](https://github.com/hcengineering/platform/issues/4144)) 

## [0.6.167a] - 2023-12-05

* 🐛 BUG FIXES: · Date input ([#4141](https://github.com/hcengineering/platform/issues/4141)) 

## [0.6.167] - 2023-12-05

* 🚀 FEATURES: · *(tests)* Updated issues.spec.ts test ([#4136](https://github.com/hcengineering/platform/issues/4136)) 
* TESTS-24: · Feat(tests): done Create project test ([#4126](https://github.com/hcengineering/platform/issues/4126)) 
* UBER-1144: · Fixed estimation time representation used when creating issue and issue template ([#4139](https://github.com/hcengineering/platform/issues/4139)) 
* UBERF-4470: · Make SetLabels action available on a single focused issue ([#4140](https://github.com/hcengineering/platform/issues/4140)) 

## [0.6.166] - 2023-12-04

* 🐛 BUG FIXES: · Formatting warnings in text-editor package ([#4128](https://github.com/hcengineering/platform/issues/4128)) 
* EZQMS-394: · Update diff viewer lint button colors ([#4115](https://github.com/hcengineering/platform/issues/4115)) 
* UBERF-4527: · Extra logging for client ([#4133](https://github.com/hcengineering/platform/issues/4133)) 

## [0.6.165] - 2023-12-02

* 🚀 FEATURES: · *(tests)* TESTS-58 dont test delete template ([#4125](https://github.com/hcengineering/platform/issues/4125)) 
* UBER-1086: · Fixed Elastic scroll contexts overflow issue, added tests for Elastic ([#4124](https://github.com/hcengineering/platform/issues/4124)) 
* UBERF-4514: · Option for order of activity, pinned first in CommentPopup ([#4122](https://github.com/hcengineering/platform/issues/4122)) 

## [0.6.164] - 2023-12-01

* 🚀 FEATURES: · *(tests)* Done TESTS-93 ([#4110](https://github.com/hcengineering/platform/issues/4110)) 
* EZQMS-403: · Displatch value update from EditBox ([#4114](https://github.com/hcengineering/platform/issues/4114)) 
* EZQMS-407: · Add Panel post utils slot ([#4116](https://github.com/hcengineering/platform/issues/4116)) 
* UBER-1083: · Use hours and minutes to present less than a day durations ([#4111](https://github.com/hcengineering/platform/issues/4111)) 
* UBERF-4493: · Mentions. When there is a lot of Applicants it's really difficult to mention employee ([#4119](https://github.com/hcengineering/platform/issues/4119)) 

## [0.6.163] - 2023-11-29

* TESTS: · Feat(tests): updated flaky tests ([#4106](https://github.com/hcengineering/platform/issues/4106)) 
* UBER-1006: · Support Ref for Vacancies ([#4104](https://github.com/hcengineering/platform/issues/4104)) 
* UBERF-4405: · Empty Vacancies' members ([#4105](https://github.com/hcengineering/platform/issues/4105)) 
* UBERF-4478: · Set modifiedOn on server for collections tx ([#4103](https://github.com/hcengineering/platform/issues/4103)) 
* UBERF-4486: · Fix mention and spotlight categories ([#4108](https://github.com/hcengineering/platform/issues/4108)) 

## [0.6.162] - 2023-11-29

* 🚀 FEATURES: · *(tests)* Updated create-vacancy test ([#4091](https://github.com/hcengineering/platform/issues/4091)) 
* 🐛 BUG FIXES: · Bump-package-version is missing ([#4100](https://github.com/hcengineering/platform/issues/4100)) 
* ⚙️ MISCELLANEOUS TASKS: · README.md ([#4096](https://github.com/hcengineering/platform/issues/4096)) 
* EZQMS-398: · Fix StringDiffViewer ([#4089](https://github.com/hcengineering/platform/issues/4089)) 
* TESTS-92: · Feat(tests): done Tracker filters tests - Modified date ([#4094](https://github.com/hcengineering/platform/issues/4094)) 
* UBERF-4238: · Fix calendar utils ([#4092](https://github.com/hcengineering/platform/issues/4092)) 
* UBERF-4428: · Add option to disable indexing for a class ([#4090](https://github.com/hcengineering/platform/issues/4090)) 
* UBERF-4446: · Move search from text editor ([#4093](https://github.com/hcengineering/platform/issues/4093)) 

## [0.6.161] - 2023-11-28

* 🚀 FEATURES: · To backup and skip domain ([#4077](https://github.com/hcengineering/platform/issues/4077)) 
* 🐛 BUG FIXES: · Deps ([#4087](https://github.com/hcengineering/platform/issues/4087)) 
* EZQMS-398: · Update CollaborationDiffViewer ([#4075](https://github.com/hcengineering/platform/issues/4075)) · Add StringDiffViewer ([#4085](https://github.com/hcengineering/platform/issues/4085)) 
* QFIX: · Fix asterisk usage in forms ([#4080](https://github.com/hcengineering/platform/issues/4080)) 
* TESTS-56: · Feat(tests): done Create a Template test ([#4063](https://github.com/hcengineering/platform/issues/4063)) 
* TESTS-57: · Feat(tests): done Edit a Template test ([#4079](https://github.com/hcengineering/platform/issues/4079)) 
* TESTS-88: · Feat(tests): done Add comment from several users test ([#4054](https://github.com/hcengineering/platform/issues/4054)) 
* UBERF-4165: · Add search to actions popup ([#4057](https://github.com/hcengineering/platform/issues/4057)) 
* UBERF-4413: · Kanban with huge data sets ([#4076](https://github.com/hcengineering/platform/issues/4076)) 
* UBERF-4420: · Bump fieldStateId ([#4071](https://github.com/hcengineering/platform/issues/4071)) 

## [0.6.160] - 2023-11-27

* EZQMS-393: · Add CollaboratorEditor prop to hide popups ([#4051](https://github.com/hcengineering/platform/issues/4051)) 
* TESTS-89: · Feat(tests): working on First user change assignee, second user should see assigned issue test  ([#4046](https://github.com/hcengineering/platform/issues/4046)) 

## [0.6.159] - 2023-11-24

* 🐛 BUG FIXES: · Migrations backup/restore ([#4055](https://github.com/hcengineering/platform/issues/4055)) 
* UBER-945: · Pinning for comments ([#4050](https://github.com/hcengineering/platform/issues/4050)) 
* UBERF-4384: · Update space from attributes ([#4049](https://github.com/hcengineering/platform/issues/4049)) 
* UBERF-4388: · Few performance related fixes ([#4053](https://github.com/hcengineering/platform/issues/4053)) 

## [0.6.158] - 2023-11-23

* 🐛 BUG FIXES: · Escape key propagation from `MentionList`/`MentionPopup` ([#4038](https://github.com/hcengineering/platform/issues/4038)) · Sub-issue card header layout issues in Kanban view ([#4039](https://github.com/hcengineering/platform/issues/4039)) 
* ⚙️ MISCELLANEOUS TASKS: · .gitignore, delete tools/apm/apm.js ([#4041](https://github.com/hcengineering/platform/issues/4041)) · Actions/checkout from 2 to 4 ([#4045](https://github.com/hcengineering/platform/issues/4045)) 
* EZQMS-368: · Fix exit text editor node uuid extension node ([#4044](https://github.com/hcengineering/platform/issues/4044)) 
* TESTS-85: · Feat(tests): added issues.spec.ts test ([#4025](https://github.com/hcengineering/platform/issues/4025)) 
* TESTS-87: · Feat(tests): done Issues status can be changed by another users test ([#4036](https://github.com/hcengineering/platform/issues/4036)) 
* UBER-1167: · Revert All/Active/Backlog for issues ([#4047](https://github.com/hcengineering/platform/issues/4047)) 
* UBER-636: · Fix from&to for NewMessage ([#4043](https://github.com/hcengineering/platform/issues/4043)) 
* UBERF-4302: · Added footer to Calendar ([#4033](https://github.com/hcengineering/platform/issues/4033)) 
* UBERF-4325: · Boost titles ([#4023](https://github.com/hcengineering/platform/issues/4023)) 

## [0.6.157] - 2023-11-21

* 🚀 FEATURES: · My issues and fix few UI test instabilities ([#4009](https://github.com/hcengineering/platform/issues/4009)) 
* 🐛 BUG FIXES: · Inbox notification view ([#4013](https://github.com/hcengineering/platform/issues/4013)) · Console tools accessing model ([#4020](https://github.com/hcengineering/platform/issues/4020)) 
* EZQMS-342: · Add text editor configurable active highlighted node  ([#4019](https://github.com/hcengineering/platform/issues/4019)) 
* TESTS-71: · Feat(tests): updated allure parent suite ([#4010](https://github.com/hcengineering/platform/issues/4010)) 
* UBER-1074: · Svelte 4 ([#4014](https://github.com/hcengineering/platform/issues/4014)) 
* UBER-911: · Mentions without second input and tabs ([#3798](https://github.com/hcengineering/platform/issues/3798)) 
* UBERF-4229: · Fix createAttachments runtime error ([#3960](https://github.com/hcengineering/platform/issues/3960)) 
* UBERF-4324: · While indexing is still in progress we see undefined ([#4017](https://github.com/hcengineering/platform/issues/4017)) 
* UBERF-4348: · Mentions. Fix render props types and component props types ([#4022](https://github.com/hcengineering/platform/issues/4022)) 

## [0.6.156] - 2023-11-15

* 🚀 FEATURES: · *(tests)* Updated tracker.loading.spec.ts test ([#3989](https://github.com/hcengineering/platform/issues/3989)) 
* QFIX: · Swapping actions between buttons ([#3990](https://github.com/hcengineering/platform/issues/3990)) 
* UBER-1164: · Clickable panel on the desktop app ([#3988](https://github.com/hcengineering/platform/issues/3988)) 
* UBERF-4216: · Fix query for cases with mixins ([#3981](https://github.com/hcengineering/platform/issues/3981)) 
* UBERF-4287: · Fix Indexer peak memory usage ([#3993](https://github.com/hcengineering/platform/issues/3993)) 
* UBERF-4289: · Allow to configure user agent ([#3995](https://github.com/hcengineering/platform/issues/3995)) 

## [0.6.155a] - 2023-11-14

* 🚀 FEATURES: · *(ci)* Updated Deploy report to Github Pages flow step ([#3984](https://github.com/hcengineering/platform/issues/3984)) 
* UBERF-4267: · Fix mergeQuery, provide a test case for it ([#3985](https://github.com/hcengineering/platform/issues/3985)) 

## [0.6.155] - 2023-11-14

* 🚀 FEATURES: · *(tests)* Added allure report for tests ([#3944](https://github.com/hcengineering/platform/issues/3944)) 
* ⚙️ MISCELLANEOUS TASKS: · Peaceiris/actions-gh-pages from 2 to 3 ([#3982](https://github.com/hcengineering/platform/issues/3982)) 
* UBERF-4161: · Few inbox fixes ([#3976](https://github.com/hcengineering/platform/issues/3976)) 
* UBERF-4205: · Updated Panel header layout, custom aside ([#3974](https://github.com/hcengineering/platform/issues/3974)) 
* UBERF-4263: · Restore Back and Close button, fixed selectedAside ([#3983](https://github.com/hcengineering/platform/issues/3983)) 

## [0.6.154b] - 2023-11-10

* 🐛 BUG FIXES: · Lead all statuses ([#3972](https://github.com/hcengineering/platform/issues/3972)) 

## [0.6.154a] - 2023-11-10

* UBER-942: · Few skill fixes ([#3971](https://github.com/hcengineering/platform/issues/3971)) 

## [0.6.154] - 2023-11-10

* EZQMS-360: · Platform changes for document comments highlight sync ([#3965](https://github.com/hcengineering/platform/issues/3965)) 
* UBERF-4136: · Fix global actions ([#3961](https://github.com/hcengineering/platform/issues/3961)) 
* UBERF-4195: · Fix query after applying viewOptions ([#3942](https://github.com/hcengineering/platform/issues/3942)) 

## [0.6.153] - 2023-11-08

* UBERF-4136: · New issues from command palette ([#3956](https://github.com/hcengineering/platform/issues/3956)) 

## [0.6.152] - 2023-11-07

* 🐛 BUG FIXES: · Backup hashing ([#3939](https://github.com/hcengineering/platform/issues/3939)) · For timezone ([#3952](https://github.com/hcengineering/platform/issues/3952)) 
* ⚙️ MISCELLANEOUS TASKS: · Creating workspace script and README.md ([#3930](https://github.com/hcengineering/platform/issues/3930)) 
* UBER-1127: · Updated status bar layout ([#3940](https://github.com/hcengineering/platform/issues/3940)) 
* UBER-1141: · Fixed Comments popup layout ([#3946](https://github.com/hcengineering/platform/issues/3946)) 
* UBER-1159: · Fixed horizontal scrolling in Scroller ([#3945](https://github.com/hcengineering/platform/issues/3945)) 
* UBER-1161: · Remove async to correctly handle query change ([#3951](https://github.com/hcengineering/platform/issues/3951)) 
* UBER-942: · Rework skill optimization ([#3941](https://github.com/hcengineering/platform/issues/3941)) 

## [0.6.151] - 2023-11-03

* 🐛 BUG FIXES: · Status filter ([#3937](https://github.com/hcengineering/platform/issues/3937)) · List Category requests ([#3938](https://github.com/hcengineering/platform/issues/3938)) 
* EZQMS-350: · Fix reactions in threads ([#3935](https://github.com/hcengineering/platform/issues/3935)) 
* UBER-1143: · Additional skill parsing, increase timeout for filter ([#3933](https://github.com/hcengineering/platform/issues/3933)) 
* UBER-1157: · Some dependant fixes ([#3936](https://github.com/hcengineering/platform/issues/3936)) 

## [0.6.150a] - 2023-11-02

* 🐛 BUG FIXES: · Statuses sort ([#3932](https://github.com/hcengineering/platform/issues/3932)) 

## [0.6.150] - 2023-11-01

* 🚀 FEATURES: · *(tests)* TESTS-39 done edit issue test ([#3918](https://github.com/hcengineering/platform/issues/3918)) 
* QMS: · Fix collaborator editor loading ([#3920](https://github.com/hcengineering/platform/issues/3920)) 
* UBER-1116: · Saving sidebar changes ([#3919](https://github.com/hcengineering/platform/issues/3919)) 
* UBER-1137: · Prevent changes of spaces while kanban drag-and-drop ([#3928](https://github.com/hcengineering/platform/issues/3928)) 
* UBER-1143: · Setting for skill import, redirect to talents from skillsView ([#3925](https://github.com/hcengineering/platform/issues/3925)) 
* UBER-1149: · Events in team planing fixes ([#3922](https://github.com/hcengineering/platform/issues/3922)) 
* UBERF-18: · Add reactions for comments ([#3899](https://github.com/hcengineering/platform/issues/3899)) 
* UBERF-4132: · Fix unexpected delete of documents in query ([#3921](https://github.com/hcengineering/platform/issues/3921)) 
* EZQMS-334: · More configurations for radio button and radio group ([#3917](https://github.com/hcengineering/platform/issues/3917)) 

## [0.6.149] - 2023-10-30

* 🚀 FEATURES: · *(tests)* TESTS-43 added the Create an issue with all params test ([#3905](https://github.com/hcengineering/platform/issues/3905)) 
* 🐛 BUG FIXES: · Migration ([#3904](https://github.com/hcengineering/platform/issues/3904)) · For mixins for grouping by custom attributes ([#3898](https://github.com/hcengineering/platform/issues/3898)) · *(tests)* Updated the today selector for calendar ([#3908](https://github.com/hcengineering/platform/issues/3908)) · *(tests)* Updated the today selector for issues page ([#3911](https://github.com/hcengineering/platform/issues/3911)) 
* ⚙️ MISCELLANEOUS TASKS: · Docker image ([#3907](https://github.com/hcengineering/platform/issues/3907)) 
* EZQMS-327: · Move inline comments to platform popups ([#3909](https://github.com/hcengineering/platform/issues/3909)) 
* EZQMS-333: · Customizable RadioButton label ([#3900](https://github.com/hcengineering/platform/issues/3900)) 
* TESTS-18: · Feat(tests): added edit vacancy test ([#3901](https://github.com/hcengineering/platform/issues/3901)) 
* UBER-1101: · Updated Separator (Float mode), fixed Scroller visibility ([#3902](https://github.com/hcengineering/platform/issues/3902)) 
* UBER-1146: · Fix scrolling in emojis popup ([#3912](https://github.com/hcengineering/platform/issues/3912)) 

## [0.6.148] - 2023-10-26

* 🐛 BUG FIXES: · Open settings ([#3893](https://github.com/hcengineering/platform/issues/3893)) 
* UBER-1027: · Don't update issue space in kanban view ([#3895](https://github.com/hcengineering/platform/issues/3895)) 
* UBER-634: · Focus on SelectPopup ([#3897](https://github.com/hcengineering/platform/issues/3897)) 
* UBER-898: · Assignee rules and general rules fix ([#3894](https://github.com/hcengineering/platform/issues/3894)) 

## [0.6.147] - 2023-10-26

* 🚀 FEATURES: · *(tests)* Added Change & Save all States test ([#3863](https://github.com/hcengineering/platform/issues/3863)) · To cache rush format action ([#3878](https://github.com/hcengineering/platform/issues/3878)) · To cache rush format action ([#3878](https://github.com/hcengineering/platform/issues/3878)) ([#3880](https://github.com/hcengineering/platform/issues/3880)) · *(tests)* TESTS-10 added the Delete the Talent test ([#3883](https://github.com/hcengineering/platform/issues/3883)) 
* 🐛 BUG FIXES: · Formetter script ([#3885](https://github.com/hcengineering/platform/issues/3885)) 
* EZQMS-306: · Add extensions for chunter message version ([#3882](https://github.com/hcengineering/platform/issues/3882)) 
* TESTS-22: · Feat(tests): done test Merge Contacts  ([#3891](https://github.com/hcengineering/platform/issues/3891)) 
* TESTS-9: · Feat(tests): added edit Talent test ([#3871](https://github.com/hcengineering/platform/issues/3871)) 
* UBER-1088: · ListItem fix. ([#3872](https://github.com/hcengineering/platform/issues/3872)) 
* UBER-1097: · Remove second status editor amd fix done state selection in new Applicant popup ([#3869](https://github.com/hcengineering/platform/issues/3869)) 
* UBER-1099,-1100: · Milestone fixes. ([#3873](https://github.com/hcengineering/platform/issues/3873)) 
* UBER-1106,-1108: · Update navigator and button layout ([#3870](https://github.com/hcengineering/platform/issues/3870)) 
* UBER-1128: · Fix to many requests from query ([#3888](https://github.com/hcengineering/platform/issues/3888)) 
* UBER-1129: · Fix list support attached documents properly ([#3889](https://github.com/hcengineering/platform/issues/3889)) 
* UBER-937: · Extensibility changes ([#3874](https://github.com/hcengineering/platform/issues/3874)) 
* UBER-942: · Fix-skills script ([#3876](https://github.com/hcengineering/platform/issues/3876)) 
* EZQMS-331: · Fix disabled button icon style ([#3881](https://github.com/hcengineering/platform/issues/3881)) 

## [0.6.146] - 2023-10-23

* 🚀 FEATURES: · *(tests)* Added delete application test ([#3859](https://github.com/hcengineering/platform/issues/3859)) 
* ⚙️ MISCELLANEOUS TASKS: · Navigator layouts ([#3866](https://github.com/hcengineering/platform/issues/3866)) 

## [0.6.145] - 2023-10-19

* 🚀 FEATURES: · *(tests)* Added page-object model example. Refactor login test to page-object model. Added a new test channel.spec.ts ([#3847](https://github.com/hcengineering/platform/issues/3847)) · *(recruiting)* Working on update recruit tests and adding Edit Application test ([#3851](https://github.com/hcengineering/platform/issues/3851)) 
* EZQMS-278: · Update comments popups ([#3849](https://github.com/hcengineering/platform/issues/3849)) · Adjust view inline comments UI ([#3855](https://github.com/hcengineering/platform/issues/3855)) 
* EZQMS-291: · Fix documents node selections issues ([#3845](https://github.com/hcengineering/platform/issues/3845)) 
* UBER-1085: · Improve upgrade tool ([#3852](https://github.com/hcengineering/platform/issues/3852)) 
* UBER-1091: · Fix attach button ([#3854](https://github.com/hcengineering/platform/issues/3854)) 
* UBER-921: · Improve full text search ([#3848](https://github.com/hcengineering/platform/issues/3848)) 
* UBERF-31: · Fix comment edit ([#3853](https://github.com/hcengineering/platform/issues/3853)) 

## [0.6.144] - 2023-10-16

* TEXTEDITOR: · Refactor attachments ([#3833](https://github.com/hcengineering/platform/issues/3833)) 
* UBER-1052: · Fix remainings ([#3844](https://github.com/hcengineering/platform/issues/3844)) 

## [0.6.143] - 2023-10-13

* ⚙️ MISCELLANEOUS TASKS: · Calendar trigger ([#3838](https://github.com/hcengineering/platform/issues/3838)) 

## [0.6.142] - 2023-10-13

* 🐛 BUG FIXES: · Exports causing uberflow warnings ([#3827](https://github.com/hcengineering/platform/issues/3827)) · Calendar setting ([#3834](https://github.com/hcengineering/platform/issues/3834)) 
* ⚙️ MISCELLANEOUS TASKS: · Old automation ([#3835](https://github.com/hcengineering/platform/issues/3835)) 
* UBER-1039: · Codeblock style fixes. ([#3829](https://github.com/hcengineering/platform/issues/3829)) 
* UBERF-3997: · Fix Tab navigation in text editors ([#3832](https://github.com/hcengineering/platform/issues/3832)) 

## [0.6.141] - 2023-10-11

* 🐛 BUG FIXES: · Migration state ([#3820](https://github.com/hcengineering/platform/issues/3820)) · Disable integration notify ([#3823](https://github.com/hcengineering/platform/issues/3823)) 
* UBER-1038: · Fix flicking during issue creation ([#3826](https://github.com/hcengineering/platform/issues/3826)) 
* UBER-953: · Fix related issues ([#3821](https://github.com/hcengineering/platform/issues/3821)) 

## [0.6.140] - 2023-10-10

* QMS: · Update inline comments extensions ([#3814](https://github.com/hcengineering/platform/issues/3814)) 
* UBER-984: · UI fixes, Panel auto resize ([#3818](https://github.com/hcengineering/platform/issues/3818)) 

## [0.6.139a] - 2023-10-09

* 🐛 BUG FIXES: · Model persistence store ([#3806](https://github.com/hcengineering/platform/issues/3806)) · Bad estimation migration ([#3808](https://github.com/hcengineering/platform/issues/3808)) 
* UBER-955: · Added Separator component ([#3804](https://github.com/hcengineering/platform/issues/3804)) 

## [0.6.138] - 2023-10-06

* 🐛 BUG FIXES: · Child info could be empty ([#3785](https://github.com/hcengineering/platform/issues/3785)) · Removed reccuring instances ([#3786](https://github.com/hcengineering/platform/issues/3786)) · Estimation ([#3787](https://github.com/hcengineering/platform/issues/3787)) 
* ⚡ PERFORMANCE: · Model ([#3795](https://github.com/hcengineering/platform/issues/3795)) 
* ⚙️ MISCELLANEOUS TASKS: · Model storage for now ([#3805](https://github.com/hcengineering/platform/issues/3805)) 
* UBER-987: · Fix emojis in the middle of something (URLs) ([#3790](https://github.com/hcengineering/platform/issues/3790)) 

## [0.6.137] - 2023-10-03

* 🐛 BUG FIXES: · Calendar configurt ([#3779](https://github.com/hcengineering/platform/issues/3779)) 
* EZQMS-279: · Remove .ProseMirror global css ([#3772](https://github.com/hcengineering/platform/issues/3772)) 
* UBER-974: · Fix saved views and mode in filters ([#3780](https://github.com/hcengineering/platform/issues/3780)) 
* UBER-977: · A remaining time ([#3783](https://github.com/hcengineering/platform/issues/3783)) 

## [0.6.136] - 2023-10-02

* 🚀 FEATURES: · Add isEmpty extension to remove on:content event from collaborator editor ([#3774](https://github.com/hcengineering/platform/issues/3774)) 
* UBER-963: · Related issues ([#3773](https://github.com/hcengineering/platform/issues/3773)) 
* UBERF-17: · Missing smiles auto-conversion in rich texts :) ([#3771](https://github.com/hcengineering/platform/issues/3771)) 

## [0.6.135] - 2023-10-01

* EZQMS-266: · Commenting on document ([#3759](https://github.com/hcengineering/platform/issues/3759)) 
* UBER-920: · Fixed drag and drop in Calendar ([#3767](https://github.com/hcengineering/platform/issues/3767)) 
* UBER-939: · Speedup table/kanban ([#3764](https://github.com/hcengineering/platform/issues/3764)) 

## [0.6.134] - 2023-09-29

* 🐛 BUG FIXES: · Recurring rules parse ([#3753](https://github.com/hcengineering/platform/issues/3753)) · Vacancy import ([#3756](https://github.com/hcengineering/platform/issues/3756)) · Attachments in comments popup ([#3758](https://github.com/hcengineering/platform/issues/3758)) · Done state filter ([#3760](https://github.com/hcengineering/platform/issues/3760)) 
* CALENDAR: · Resize and move event ([#3750](https://github.com/hcengineering/platform/issues/3750)) 
* UBER-845: · Add NotificationPresenter to send rich text notifications ([#3729](https://github.com/hcengineering/platform/issues/3729)) 
* UBER-924: · Fix file upload progress ([#3757](https://github.com/hcengineering/platform/issues/3757)) 

## [0.6.133] - 2023-09-27

* UBER-902: · Fix transactions ([#3748](https://github.com/hcengineering/platform/issues/3748)) 
* UBER-914: · Map to mixin after findAll ([#3745](https://github.com/hcengineering/platform/issues/3745)) 
* UBER-916: · Navigation from issue to mentioned issue break description ([#3746](https://github.com/hcengineering/platform/issues/3746)) 
* UBER-923: · Fix milestone category selector ([#3747](https://github.com/hcengineering/platform/issues/3747)) 

## [0.6.132] - 2023-09-26

* 🐛 BUG FIXES: · Ne predicate ([#3737](https://github.com/hcengineering/platform/issues/3737)) · Event description ([#3741](https://github.com/hcengineering/platform/issues/3741)) 
* ⚙️ MISCELLANEOUS TASKS: · Calendar app ([#3736](https://github.com/hcengineering/platform/issues/3736)) 
* QFIX: · Migration ([#3734](https://github.com/hcengineering/platform/issues/3734)) 
* UBER-888: · Fixed dragging of the WorkItem ([#3735](https://github.com/hcengineering/platform/issues/3735)) 

## [0.6.131] - 2023-09-22

* 🐛 BUG FIXES: · Lead creation ([#3726](https://github.com/hcengineering/platform/issues/3726)) · Comments notifications ([#3732](https://github.com/hcengineering/platform/issues/3732)) · Move application ([#3733](https://github.com/hcengineering/platform/issues/3733)) 
* UBER-486: · Updated people avatars. ([#3720](https://github.com/hcengineering/platform/issues/3720)) · Replaced avatar colors ([#3724](https://github.com/hcengineering/platform/issues/3724)) 
* UBER-799: · Allow extensions to tracker for github ([#3727](https://github.com/hcengineering/platform/issues/3727)) 
* UBER-888: · Fixed dragging of the WorkItem ([#3730](https://github.com/hcengineering/platform/issues/3730)) 

## [0.6.130] - 2023-09-20

* 🐛 BUG FIXES: · Notifications ([#3723](https://github.com/hcengineering/platform/issues/3723)) 
* UBER-881: · Fix labels list view numbers ([#3721](https://github.com/hcengineering/platform/issues/3721)) 

## [0.6.129] - 2023-09-20

* 🐛 BUG FIXES: · Statuses order ([#3718](https://github.com/hcengineering/platform/issues/3718)) 
* UBER-885: · Value filter fix ([#3719](https://github.com/hcengineering/platform/issues/3719)) 

## [0.6.128] - 2023-09-19

* UBER-885: · Fix Object filter ([#3716](https://github.com/hcengineering/platform/issues/3716)) 

## [0.6.127] - 2023-09-19

* UBER-882: · Fixed popup ([#3713](https://github.com/hcengineering/platform/issues/3713)) 

## [0.6.126] - 2023-09-18

* 🐛 BUG FIXES: · Color, remove inline attribute ([#3681](https://github.com/hcengineering/platform/issues/3681)) · Ezqms upgrade ([#3667](https://github.com/hcengineering/platform/issues/3667)) · Backlink clicks ([#3697](https://github.com/hcengineering/platform/issues/3697)) · Vs-code launcher ([#3696](https://github.com/hcengineering/platform/issues/3696)) 
* ⚙️ MISCELLANEOUS TASKS: · Docker/login-action from 2 to 3 ([#3685](https://github.com/hcengineering/platform/issues/3685)) 
* UBER-784: · Updated WorkItemPresenter ([#3710](https://github.com/hcengineering/platform/issues/3710)) 
* UBER-796: · Fixed AttachmentActions ([#3709](https://github.com/hcengineering/platform/issues/3709)) 
* UBER-834: · Improve list speed ([#3692](https://github.com/hcengineering/platform/issues/3692)) 
* UBER-839: · Request the category if it's not in lookup ([#3679](https://github.com/hcengineering/platform/issues/3679)) 
* UBER-841: · Allowed to position work item to half hour ([#3707](https://github.com/hcengineering/platform/issues/3707)) 
* UBER-851: · Fix titles in ListView ([#3678](https://github.com/hcengineering/platform/issues/3678)) 
* UBER-852: · Owner should only see a list of spaces ([#3677](https://github.com/hcengineering/platform/issues/3677)) 
* UBER-854: · More proper upgrade notification ([#3694](https://github.com/hcengineering/platform/issues/3694)) 
* UBER-863: · Fix employee filter ([#3682](https://github.com/hcengineering/platform/issues/3682)) 
* UBER-869: · Fixed mentions in Activity. Fixed messages in Inbox. ([#3695](https://github.com/hcengineering/platform/issues/3695)) 
* UBER-871: · Allow to hide/show archived and done in vacancies list ([#3701](https://github.com/hcengineering/platform/issues/3701)) 
* UBER-872: · StyleTextEditor: No update when change text in another text ([#3698](https://github.com/hcengineering/platform/issues/3698)) 
* UBERF-81: · Replacing the label ([#3708](https://github.com/hcengineering/platform/issues/3708)) 

## [0.6.125] - 2023-09-11

* UBER-828: · Fix slow value filter ([#3676](https://github.com/hcengineering/platform/issues/3676)) 

## [0.6.124] - 2023-09-08

* 🐛 BUG FIXES: · Trim cookie string before extracting values ([#3652](https://github.com/hcengineering/platform/issues/3652)) · Statuses ([#3666](https://github.com/hcengineering/platform/issues/3666)) 
* ⚙️ MISCELLANEOUS TASKS: · Actions/checkout from 3 to 4 ([#3657](https://github.com/hcengineering/platform/issues/3657)) · Inline in Inbox. Panel, presenters fixes. ([#3665](https://github.com/hcengineering/platform/issues/3665)) 
* ACTIVITY: · Remove inline from presenters. DoneStatesPopup fix. ([#3664](https://github.com/hcengineering/platform/issues/3664)) 
* UBER-564: · Add sound notification and settings ([#3655](https://github.com/hcengineering/platform/issues/3655)) 
* UBER-674: · The calendar starts from the current time. Calendar fixes. ([#3671](https://github.com/hcengineering/platform/issues/3671)) 
* UBER-795: · Updated layout of pop-ups. There is always a Back in the Panel. ([#3644](https://github.com/hcengineering/platform/issues/3644)) · Replacing the Panel with a Dialog, fix circle button in Kanban. ([#3659](https://github.com/hcengineering/platform/issues/3659)) 
* UBER-807: · Multiple github repositories fixes ([#3646](https://github.com/hcengineering/platform/issues/3646)) · Allow to customize create issue dialog ([#3669](https://github.com/hcengineering/platform/issues/3669)) 
* UBER-832: · Fixed DatePresenter ([#3653](https://github.com/hcengineering/platform/issues/3653)) 
* UBER-838: · Signout button for inactive accounts ([#3662](https://github.com/hcengineering/platform/issues/3662)) 
* UBERF-55: · Change editor toolbar behavior and update icons ([#3645](https://github.com/hcengineering/platform/issues/3645)) 
* UBERF-60: · Update styles and presenters. ([#3651](https://github.com/hcengineering/platform/issues/3651)) · Updated Rich editor and Activity styles. ([#3661](https://github.com/hcengineering/platform/issues/3661)) · Updated inline presenters. ([#3663](https://github.com/hcengineering/platform/issues/3663)) 

## [0.6.123] - 2023-08-30

* UBER-675: · Updated layout of Radio and Circle button ([#3638](https://github.com/hcengineering/platform/issues/3638)) 
* UBER-816: · Fix mentions ([#3641](https://github.com/hcengineering/platform/issues/3641)) 

## [0.6.122] - 2023-08-25

* EZQMS-106: · Add elastic search by refs support ([#3629](https://github.com/hcengineering/platform/issues/3629)) 
* UBER-675: · Updated pop-ups and components layout ([#3631](https://github.com/hcengineering/platform/issues/3631)) 
* UBER-770: · Add custom enum and ref attributes for grouping ([#3622](https://github.com/hcengineering/platform/issues/3622)) 
* UBER-797: · Fix popup menu runtime error ([#3627](https://github.com/hcengineering/platform/issues/3627)) 
* UBER-802: · Support underline formatting ([#3636](https://github.com/hcengineering/platform/issues/3636)) 
* UBER-803: · Fix slow filter ([#3634](https://github.com/hcengineering/platform/issues/3634)) 
* UBER-805: · Remove location from grouping ([#3635](https://github.com/hcengineering/platform/issues/3635)) 

## [0.6.121] - 2023-08-24

* UBER-667: · UI fixes, displaying All day, time editor. ([#3619](https://github.com/hcengineering/platform/issues/3619)) 
* UBER-762: · Fix editor popup menu behavior ([#3617](https://github.com/hcengineering/platform/issues/3617)) 
* UBER-772: · Require having employee mixin to allow Staff mixin ([#3618](https://github.com/hcengineering/platform/issues/3618)) 

## [0.6.120a] - 2023-08-22

* 🐛 BUG FIXES: · Telegram window not opening ([#3615](https://github.com/hcengineering/platform/issues/3615)) 

## [0.6.120] - 2023-08-22

* 🐛 BUG FIXES: · Desktop app history navigation ([#3611](https://github.com/hcengineering/platform/issues/3611)) 
* UBER-773: · Fix List search anv Vacancy view ([#3614](https://github.com/hcengineering/platform/issues/3614)) 

## [0.6.119] - 2023-08-19

* UBER-600: · Fix label, fix colours for boolean presenter ([#3608](https://github.com/hcengineering/platform/issues/3608)) 
* UBER-726: · Ask to update if manual update is required ([#3602](https://github.com/hcengineering/platform/issues/3602)) 
* UBER-749: · Fix no label for unassigned ([#3603](https://github.com/hcengineering/platform/issues/3603)) 
* UBER-771: · Use cookie instead of token for images ([#3607](https://github.com/hcengineering/platform/issues/3607)) 

## [0.6.118] - 2023-08-17

* 🐛 BUG FIXES: · Readonly for data editors ([#3598](https://github.com/hcengineering/platform/issues/3598)) · Recurrence rule parser ([#3597](https://github.com/hcengineering/platform/issues/3597)) 
* ⚙️ MISCELLANEOUS TASKS: · Calendar ([#3589](https://github.com/hcengineering/platform/issues/3589)) 
* TEAM: · Planning UI fixes ([#3599](https://github.com/hcengineering/platform/issues/3599)) 
* UBER-479: · Add List view for Vacancies ([#3595](https://github.com/hcengineering/platform/issues/3595)) 
* UBER-500: · Confusing Show More button in table ([#3590](https://github.com/hcengineering/platform/issues/3590)) 
* UBER-743: · Provide person instead of id as prop ([#3592](https://github.com/hcengineering/platform/issues/3592)) 
* UBER-747: · Fix readonly field ([#3593](https://github.com/hcengineering/platform/issues/3593)) 
* UBER-759: · Prevent mutations of original object ([#3596](https://github.com/hcengineering/platform/issues/3596)) 

## [0.6.117] - 2023-08-14

* 🐛 BUG FIXES: · Listview ([#3586](https://github.com/hcengineering/platform/issues/3586)) 
* ⚙️ MISCELLANEOUS TASKS: · Supercharge/mongodb-github-action from 1.9.0 to 1.10.0 ([#3568](https://github.com/hcengineering/platform/issues/3568)) 
* EZQMS-236: · QE templates >> Have the ability to make a section mandatory ([#3581](https://github.com/hcengineering/platform/issues/3581)) 

## [0.6.116] - 2023-08-10

* 🐛 BUG FIXES: · Migrations ([#3575](https://github.com/hcengineering/platform/issues/3575)) · Typo ([#3563](https://github.com/hcengineering/platform/issues/3563)) 
* ⚙️ MISCELLANEOUS TASKS: · Contact ([#3576](https://github.com/hcengineering/platform/issues/3576)) 
* EZQMS-152: · Some object selector dropdown items are cut ([#3558](https://github.com/hcengineering/platform/issues/3558)) 
* FIX: · Grammatical and stylistic errors ([#3552](https://github.com/hcengineering/platform/issues/3552)) 
* UBER-720: · Rework list view to multiple requests ([#3578](https://github.com/hcengineering/platform/issues/3578)) 
* EZQMS-245: · Allow configurable languages per deployments ([#3579](https://github.com/hcengineering/platform/issues/3579)) 

## [0.6.115] - 2023-08-08

* UBER-653: · Open template folder that is enabled ([#3573](https://github.com/hcengineering/platform/issues/3573)) 
* UBER-710: · Fix preference notifications ([#3574](https://github.com/hcengineering/platform/issues/3574)) 

## [0.6.114] - 2023-08-07

* 🐛 BUG FIXES: · A bunch of typos ([#3556](https://github.com/hcengineering/platform/issues/3556)) 
* UBER-619: · StatusPopup for creating/renaming ([#3536](https://github.com/hcengineering/platform/issues/3536)) 
* UBER-665: · Rename EmployeeAccount->PersonAccount ([#3550](https://github.com/hcengineering/platform/issues/3550)) 

## [0.6.113] - 2023-08-03

* UBER-532: · Copy issue URL works wrong ([#3529](https://github.com/hcengineering/platform/issues/3529)) 
* UBER-628: · Allow reordering when sort is set to manual in the same group ([#3553](https://github.com/hcengineering/platform/issues/3553)) 
* UBER-648: · Convert project identifier to upper case ([#3546](https://github.com/hcengineering/platform/issues/3546)) 
* UBER-677: · Use State for Leads' status (like applicants do) ([#3554](https://github.com/hcengineering/platform/issues/3554)) 

## [0.6.112b] - 2023-08-01

* 🐛 BUG FIXES: · Workspace event ([#3542](https://github.com/hcengineering/platform/issues/3542)) 
* UBER-646: · Clear the class when view is changed to prevent using old one ([#3541](https://github.com/hcengineering/platform/issues/3541)) 
* EZQMS-241: · Account for parent classes configurations in list view ([#3537](https://github.com/hcengineering/platform/issues/3537)) 

## [0.6.112a] - 2023-07-31

* UBER-641: · Fixed DatePopup. ([#3535](https://github.com/hcengineering/platform/issues/3535)) 

## [0.6.112] - 2023-07-29

* 🐛 BUG FIXES: · TAB behaviour for forms: add a condition when to prevent default behaviour ([#3508](https://github.com/hcengineering/platform/issues/3508)) · Typo ([#3512](https://github.com/hcengineering/platform/issues/3512)) · Do not shrink expand/collapse icon in tree ([#3517](https://github.com/hcengineering/platform/issues/3517)) · Workspace creation failback ([#3531](https://github.com/hcengineering/platform/issues/3531)) 
* ⚙️ MISCELLANEOUS TASKS: · Version to 111 ([#3500](https://github.com/hcengineering/platform/issues/3500)) · Unused lock file ([#3520](https://github.com/hcengineering/platform/issues/3520)) 
* ATS-13: · Support multiple docs for copying ([#3526](https://github.com/hcengineering/platform/issues/3526)) · Copy ID action ([#3533](https://github.com/hcengineering/platform/issues/3533)) 
* CALENDAR: · Fixed the display of the past days (events) ([#3527](https://github.com/hcengineering/platform/issues/3527)) 
* QFIX: · Translate ezqms email confirmation letter to english ([#3532](https://github.com/hcengineering/platform/issues/3532)) 
* TSK-1574: · Accurate time reports count ([#3509](https://github.com/hcengineering/platform/issues/3509)) 
* UBER-427: · Disable third-nested filters ([#3502](https://github.com/hcengineering/platform/issues/3502)) 
* UBER-550: · Clean milestone when moving to another project ([#3498](https://github.com/hcengineering/platform/issues/3498)) 
* UBER-558: · Filter out overrides for action popup ([#3499](https://github.com/hcengineering/platform/issues/3499)) 
* UBER-575: · Allow per class list view ([#3524](https://github.com/hcengineering/platform/issues/3524)) 
* UBER-593: · Hyperlink editor ([#3506](https://github.com/hcengineering/platform/issues/3506)) 
* UBER-601: · Fixed accentuation of ObjectPresenter ([#3507](https://github.com/hcengineering/platform/issues/3507)) 
* UBER-609: · Fix inbox notification/view for telegram and gmail messages ([#3518](https://github.com/hcengineering/platform/issues/3518)) 
* UBER-614: · Fix submenu popups on scrolling ([#3530](https://github.com/hcengineering/platform/issues/3530)) 
* UBER-621: · Display field validation rule hint ([#3521](https://github.com/hcengineering/platform/issues/3521)) 
* UBER-642: · Use system theme as the default value for application theme ([#3534](https://github.com/hcengineering/platform/issues/3534)) 

## [0.6.111] - 2023-07-13

* 🐛 BUG FIXES: · Create event time ([#3493](https://github.com/hcengineering/platform/issues/3493)) 
* ATS-9: · Update states once template updates ([#3496](https://github.com/hcengineering/platform/issues/3496)) 
* TSK-336: · Mobile UI adaptation ([#3492](https://github.com/hcengineering/platform/issues/3492)) 
* UBER-524: · Cleaned CSS, UI fixes. ([#3491](https://github.com/hcengineering/platform/issues/3491)) 

## [0.6.110] - 2023-07-08

* 🚀 FEATURES: · Build cache ([#3446](https://github.com/hcengineering/platform/issues/3446)) · Add the ability to restrict adding / removing attachments ([#3479](https://github.com/hcengineering/platform/issues/3479)) 
* 🐛 BUG FIXES: · Build script ([#3451](https://github.com/hcengineering/platform/issues/3451)) · Typo ([#3455](https://github.com/hcengineering/platform/issues/3455)) · Notification selection ([#3469](https://github.com/hcengineering/platform/issues/3469)) · Gmail error ([#3473](https://github.com/hcengineering/platform/issues/3473)) · Multiple channels ([#3474](https://github.com/hcengineering/platform/issues/3474)) · Label ([#3476](https://github.com/hcengineering/platform/issues/3476)) 
* ⚙️ MISCELLANEOUS TASKS: · Version and few cleanups ([#3483](https://github.com/hcengineering/platform/issues/3483)) 
* UBER-142: · Update buttons. Cleaning CSS. ([#3482](https://github.com/hcengineering/platform/issues/3482)) 
* UBER-298: · Add readonly users option to the UserBoxItems component ([#3481](https://github.com/hcengineering/platform/issues/3481)) 
* UBER-413: · Allow extensible navigator model ([#3477](https://github.com/hcengineering/platform/issues/3477)) 
* UBER-428: · Displaying tooltips with a delay ([#3442](https://github.com/hcengineering/platform/issues/3442)) 
* UBER-462: · Prevent creating existing enum value and disable the button in that case ([#3465](https://github.com/hcengineering/platform/issues/3465)) 
* UBER-472: · Don't update when it's not needed ([#3460](https://github.com/hcengineering/platform/issues/3460)) 
* UBER-473: · Show icon for department ([#3472](https://github.com/hcengineering/platform/issues/3472)) 
* UBER-477: · Uberflow dependencies ([#3440](https://github.com/hcengineering/platform/issues/3440)) 
* UBER-498: · Replace component shortcut ([#3441](https://github.com/hcengineering/platform/issues/3441)) 
* UBER-504: · Correct display of optional presenters ([#3452](https://github.com/hcengineering/platform/issues/3452)) · Fix presenters on ListItem. Add DeviceSizes. ([#3463](https://github.com/hcengineering/platform/issues/3463)) 
* UBER-505: · Fix resolve errors in console ([#3449](https://github.com/hcengineering/platform/issues/3449)) 
* UBER-509: · Do not update list of unread right after reading ([#3461](https://github.com/hcengineering/platform/issues/3461)) 
* UBER-513: · Fix desktop app navigation ([#3459](https://github.com/hcengineering/platform/issues/3459)) 
* UBER-520: · Fix images drag & drop ([#3453](https://github.com/hcengineering/platform/issues/3453)) 
* UBER-525: · Fixed popup logic placement for top ([#3448](https://github.com/hcengineering/platform/issues/3448)) 
* UBER-528: · Fix desktop navigation ([#3450](https://github.com/hcengineering/platform/issues/3450)) 
* UBER-536: · Fix test stability ([#3466](https://github.com/hcengineering/platform/issues/3466)) 
* UBER-537: · Review support in inbox ([#3471](https://github.com/hcengineering/platform/issues/3471)) 
* UBER-538: · Update ListView layout. Subissues, related issues. ([#3467](https://github.com/hcengineering/platform/issues/3467)) · Fixed ListView and KanbanView. ([#3475](https://github.com/hcengineering/platform/issues/3475)) 
* UBER-554: · Show messages with error and allow resending ([#3488](https://github.com/hcengineering/platform/issues/3488)) 
* UBER-560: · Filter out current transaction and get mixin ([#3480](https://github.com/hcengineering/platform/issues/3480)) 
* UBER-572: · Fixed overflow for emoji. ([#3485](https://github.com/hcengineering/platform/issues/3485)) 
* UBER-573,-574: · Updated button styles, fixed ListView ([#3484](https://github.com/hcengineering/platform/issues/3484)) 

## [0.6.109] - 2023-06-16

* 🐛 BUG FIXES: · General attributes replacements ([#3438](https://github.com/hcengineering/platform/issues/3438)) 
* UBER-424: · Description not saving fix ([#3434](https://github.com/hcengineering/platform/issues/3434)) 
* UBER-450: · Update MentionList. ([#3431](https://github.com/hcengineering/platform/issues/3431)) 
* UBER-480: · Fix ValueFilter for space-like objects ([#3428](https://github.com/hcengineering/platform/issues/3428)) 
* UBER-482: · Fix 'backspace' in inbox for some objects ([#3437](https://github.com/hcengineering/platform/issues/3437)) 
* UBER-485: · Implement icons. ([#3433](https://github.com/hcengineering/platform/issues/3433)) 
* UBER-488: · Update selected priority on issue switch ([#3436](https://github.com/hcengineering/platform/issues/3436)) 
* UBER-496: · Fix few issues ([#3439](https://github.com/hcengineering/platform/issues/3439)) 

## [0.6.108] - 2023-06-12

* UBER-417: · Replace AddSavedView with select popup, allow renaming ([#3423](https://github.com/hcengineering/platform/issues/3423)) 
* UBER-430: · Remove old migrations ([#3398](https://github.com/hcengineering/platform/issues/3398)) 
* UBER-471: · Fixed maintenance warining. ([#3424](https://github.com/hcengineering/platform/issues/3424)) 
* UBER-476: · Duplicate comment fix ([#3425](https://github.com/hcengineering/platform/issues/3425)) 
* UBER-478: · Fix issue presenter concurrency ([#3426](https://github.com/hcengineering/platform/issues/3426)) 

## [0.6.107] - 2023-06-09

* 🐛 BUG FIXES: · Model array ([#3421](https://github.com/hcengineering/platform/issues/3421)) 
* ⚙️ MISCELLANEOUS TASKS: · Sanity DB restore ([#2836](https://github.com/hcengineering/platform/issues/2836)) 
* UBER-458: · Fix submenu ([#3416](https://github.com/hcengineering/platform/issues/3416)) 
* UBER-459: · Remove whereSelected line in dropdowns. ([#3417](https://github.com/hcengineering/platform/issues/3417)) 
* UBER-460: · Fix admin view ([#3420](https://github.com/hcengineering/platform/issues/3420)) 

## [0.6.106] - 2023-06-08

* 🐛 BUG FIXES: · Clone ([#3397](https://github.com/hcengineering/platform/issues/3397)) · Inbox dot ([#3407](https://github.com/hcengineering/platform/issues/3407)) 
* ⚙️ MISCELLANEOUS TASKS: · Extra statuses ([#3400](https://github.com/hcengineering/platform/issues/3400)) 
* UBER-158: · New popup dialog ([#3409](https://github.com/hcengineering/platform/issues/3409)) 
* UBER-425: · Tooltup/popup fixes ([#3404](https://github.com/hcengineering/platform/issues/3404)) 
* UBER-433: · Allow tabs within bullets. ([#3399](https://github.com/hcengineering/platform/issues/3399)) 
* UBER-438: · Use tracker as default for new users/workspaces ([#3403](https://github.com/hcengineering/platform/issues/3403)) 
* UBER-439: · Fix plurals in russian ([#3412](https://github.com/hcengineering/platform/issues/3412)) 
* UBER-440: · Fix link error message ([#3406](https://github.com/hcengineering/platform/issues/3406)) 
* UBER-441,-443: · Disable fade in Scroller, change color for link and bg for Diff ([#3405](https://github.com/hcengineering/platform/issues/3405)) 
* UBER-442,-452: · Fixed login/signup layout, link, mention and backtick. ([#3408](https://github.com/hcengineering/platform/issues/3408)) 
* UBER-453: · Update favicons. ([#3414](https://github.com/hcengineering/platform/issues/3414)) 

## [0.6.105] - 2023-06-07

* 🐛 BUG FIXES: · Confirmation send message ([#3393](https://github.com/hcengineering/platform/issues/3393)) · Model when clone ws ([#3395](https://github.com/hcengineering/platform/issues/3395)) 
* ⚙️ MISCELLANEOUS TASKS: · Fade in IssuePreview. ([#3394](https://github.com/hcengineering/platform/issues/3394)) 

## [0.6.104] - 2023-06-07

* UBER-421: · Fixed attachment/comment icons ([#3392](https://github.com/hcengineering/platform/issues/3392)) 

## [0.6.103] - 2023-06-07

* 🐛 BUG FIXES: · Attachment image preview ([#3372](https://github.com/hcengineering/platform/issues/3372)) · Members presenter ([#3385](https://github.com/hcengineering/platform/issues/3385)) · Inbox reading ([#3390](https://github.com/hcengineering/platform/issues/3390)) 
* UBER-395: · Allow to drop images into description ([#3382](https://github.com/hcengineering/platform/issues/3382)) 
* UBER-418: · Fix object popup a bit ([#3377](https://github.com/hcengineering/platform/issues/3377)) 

## [0.6.102] - 2023-06-06

* 🚀 FEATURES: · Cyrillic for resolvers ([#3366](https://github.com/hcengineering/platform/issues/3366)) 
* 🐛 BUG FIXES: · Activity filters bugs ([#3341](https://github.com/hcengineering/platform/issues/3341)) · Project identifier uppercase ([#3362](https://github.com/hcengineering/platform/issues/3362)) · Attachments popup ([#3369](https://github.com/hcengineering/platform/issues/3369)) 
* ⚙️ MISCELLANEOUS TASKS: · 'Open' from context menu's ([#3350](https://github.com/hcengineering/platform/issues/3350)) · Attachment image preview ([#3354](https://github.com/hcengineering/platform/issues/3354)) · Create-issue-and-sub-issue ([#3355](https://github.com/hcengineering/platform/issues/3355)) 
* UBER-252: · Mode int URL in MyLeads/MyApplications ([#3347](https://github.com/hcengineering/platform/issues/3347)) 
* UBER-371: · Retina images for login page ([#3351](https://github.com/hcengineering/platform/issues/3351)) 
* UBER-373: · Fix blurry avatars and other images ([#3353](https://github.com/hcengineering/platform/issues/3353)) 
* UBER-377: · Fix login ([#3358](https://github.com/hcengineering/platform/issues/3358)) 
* UBER-380: · Change icon ([#3364](https://github.com/hcengineering/platform/issues/3364)) 
* UBER-383: · Fix null/undefined for URI and numbers ([#3359](https://github.com/hcengineering/platform/issues/3359)) 
* UBER-394: · Update tiptap plugins ([#3368](https://github.com/hcengineering/platform/issues/3368)) 
* UBER-397: · Fix panel activity ([#3370](https://github.com/hcengineering/platform/issues/3370)) 

## [0.6.101] - 2023-06-05

* 🐛 BUG FIXES: · Goto actions ([#3333](https://github.com/hcengineering/platform/issues/3333)) · Actions help intl ([#3339](https://github.com/hcengineering/platform/issues/3339)) · Contact link resolvers ([#3343](https://github.com/hcengineering/platform/issues/3343)) 
* UBER-263: · Use person after creation ([#3304](https://github.com/hcengineering/platform/issues/3304)) 
* UBER-276: · New messages and Has messages option for filter ([#3326](https://github.com/hcengineering/platform/issues/3326)) 
* UBER-318: · Allow to configure default language ([#3342](https://github.com/hcengineering/platform/issues/3342)) 
* UBER-358: · Fix icons ([#3338](https://github.com/hcengineering/platform/issues/3338)) 
* UBER-364: · Adapt updated UI ([#3348](https://github.com/hcengineering/platform/issues/3348)) 
* UBER-369: · Do not show number of comments if 0 ([#3349](https://github.com/hcengineering/platform/issues/3349)) 

## [0.6.100] - 2023-06-02

* 🐛 BUG FIXES: · Confirmation send stuck ([#3307](https://github.com/hcengineering/platform/issues/3307)) · Channels highlight ([#3308](https://github.com/hcengineering/platform/issues/3308)) · Email confirmation ([#3316](https://github.com/hcengineering/platform/issues/3316)) · Inbox people selection ([#3322](https://github.com/hcengineering/platform/issues/3322)) 
* ⚙️ MISCELLANEOUS TASKS: · Reminders button from workspace. ([#3319](https://github.com/hcengineering/platform/issues/3319)) 
* UBER-137: · Fix application search ([#3309](https://github.com/hcengineering/platform/issues/3309)) 
* UBER-170: · Navigation for contacts ([#3323](https://github.com/hcengineering/platform/issues/3323)) 
* UBER-172: · Fill contact template fields if only one selected ([#3299](https://github.com/hcengineering/platform/issues/3299)) 
* UBER-304: · Fixed Navigator ([#3312](https://github.com/hcengineering/platform/issues/3312)) 
* UBER-307,-308,-310,-311,-312: · Fixed activity in Inbox ([#3298](https://github.com/hcengineering/platform/issues/3298)) 
* UBER-327: · Sub issues/Related issues allow to create from category header ([#3317](https://github.com/hcengineering/platform/issues/3317)) 
* UBER-328: · Fixed display in labels. Updated SelectWorkspaceMenu, AccountPopup. ([#3314](https://github.com/hcengineering/platform/issues/3314)) 
* UBER-331: · Fix live query update ([#3305](https://github.com/hcengineering/platform/issues/3305)) 
* UBER-338: · Added AppSwitcher popup. ([#3329](https://github.com/hcengineering/platform/issues/3329)) 
* UBER-345: · Fixed Inbox. ([#3325](https://github.com/hcengineering/platform/issues/3325)) 

## [0.6.99] - 2023-05-30

* 🐛 BUG FIXES: · Mention list hiding behind comment popup ([#3294](https://github.com/hcengineering/platform/issues/3294)) · Create account tool ([#3295](https://github.com/hcengineering/platform/issues/3295)) 
* UBER-199,-217,-232: · Fixed header in ListView, EditMember, ViewOptions ([#3273](https://github.com/hcengineering/platform/issues/3273)) 
* UBER-267: · Fix created selection ([#3269](https://github.com/hcengineering/platform/issues/3269)) 
* UBER-270: · Enable color more wide ([#3279](https://github.com/hcengineering/platform/issues/3279)) 
* UBER-271: · Fix filters ([#3293](https://github.com/hcengineering/platform/issues/3293)) 
* UBER-274,-287,-288,-294: · Fixed tooltip, ActionsPopup, ListHeader, activity. ([#3282](https://github.com/hcengineering/platform/issues/3282)) 
* UBER-278: · Add Yes-No to popup, refactor ([#3289](https://github.com/hcengineering/platform/issues/3289)) 
* UBER-279: · Total qfix ([#3281](https://github.com/hcengineering/platform/issues/3281)) 
* UBER-289: · Prevent empty changes to go into transactions. ([#3277](https://github.com/hcengineering/platform/issues/3277)) 
* UBER-295: · Fix blur'y popups ([#3278](https://github.com/hcengineering/platform/issues/3278)) 
* UBER-296: · Fix create application color selector ([#3280](https://github.com/hcengineering/platform/issues/3280)) 
* UBER-317: · Fix issue ([#3285](https://github.com/hcengineering/platform/issues/3285)) 
* UBER-319: · Fix vacancy editing ([#3290](https://github.com/hcengineering/platform/issues/3290)) 
* UBER-320: · Fix companies filter ([#3292](https://github.com/hcengineering/platform/issues/3292)) 

## [0.6.98a] - 2023-05-28

* 🐛 BUG FIXES: · Integration migration ([#3272](https://github.com/hcengineering/platform/issues/3272)) 
* UBER-268: · List views ([#3270](https://github.com/hcengineering/platform/issues/3270)) 
* UBER-269: · Fix mini toggle ([#3271](https://github.com/hcengineering/platform/issues/3271)) 

## [0.6.98] - 2023-05-27

* 🐛 BUG FIXES: · Telegram notifications ([#3257](https://github.com/hcengineering/platform/issues/3257)) 
* UBER-187: · Inline attachments ([#3264](https://github.com/hcengineering/platform/issues/3264)) 
* UBER-218: · Fix createOn -> createdOn ([#3266](https://github.com/hcengineering/platform/issues/3266)) 
* UBER-238: · Colors should not use alpha channel ([#3255](https://github.com/hcengineering/platform/issues/3255)) 
* UBER-265: · Updated application icons ([#3263](https://github.com/hcengineering/platform/issues/3263)) 
* UBER-266: · Fix mongo exceptions ([#3267](https://github.com/hcengineering/platform/issues/3267)) 
* UBER-267: · Fix Users popup ([#3268](https://github.com/hcengineering/platform/issues/3268)) 
* UBER-53: · My Leads view ([#3259](https://github.com/hcengineering/platform/issues/3259)) 
* UBER-64,-231,-229: · Updated CreateProject and SelectAvatar layouts, fixed bugs ([#3253](https://github.com/hcengineering/platform/issues/3253)) 

## [0.6.97] - 2023-05-24

* 🐛 BUG FIXES: · Requests ([#3232](https://github.com/hcengineering/platform/issues/3232)) · Activity query ([#3234](https://github.com/hcengineering/platform/issues/3234)) 
* TSK-1523: · Fixed IssuePreview ([#3231](https://github.com/hcengineering/platform/issues/3231)) 
* TSK-1525: · Fixed VacancyPresenter ([#3237](https://github.com/hcengineering/platform/issues/3237)) 
* UBER-134: · Back references ([#3233](https://github.com/hcengineering/platform/issues/3233)) 
* UBER-135/TSK-1430: · Allow changing image in PDFViewer through arrow-keys (keyboard) ([#3186](https://github.com/hcengineering/platform/issues/3186)) 
* UBER-148: · My Applications in recruit ([#3235](https://github.com/hcengineering/platform/issues/3235)) 
* UBER-159: · Popup dialog for deleting with message if not enough permissions ([#3224](https://github.com/hcengineering/platform/issues/3224)) 
* UBER-182: · Fix status object filter ([#3250](https://github.com/hcengineering/platform/issues/3250)) 
* UBER-194,-166,-185: · Add application icons, fixed Inbox list and mobile layout ([#3229](https://github.com/hcengineering/platform/issues/3229)) 
* UBER-205: · More info to Kanban card (due date, assignee, Lead number) ([#3251](https://github.com/hcengineering/platform/issues/3251)) 
* UBER-206: · Redefined color palettes ([#3243](https://github.com/hcengineering/platform/issues/3243)) 
* UBER-219: · Updated CreateIssue layout ([#3244](https://github.com/hcengineering/platform/issues/3244)) 
* UBER-47: · Attributes for base class (ex. contacts in lead's customers) ([#3241](https://github.com/hcengineering/platform/issues/3241)) 
* UBER-49: · Custom fields in CreateLead ([#3249](https://github.com/hcengineering/platform/issues/3249)) 
* UBER-50: · Remove funnel browser ([#3236](https://github.com/hcengineering/platform/issues/3236)) 

## [0.6.96] - 2023-05-21

* 🐛 BUG FIXES: · Issue title selection ([#3179](https://github.com/hcengineering/platform/issues/3179)) · Up down navigator ([#3185](https://github.com/hcengineering/platform/issues/3185)) · Out of focus error for the date filter ([#3204](https://github.com/hcengineering/platform/issues/3204)) · Integration notification ([#3213](https://github.com/hcengineering/platform/issues/3213)) 
* TSK-1257: · Split owner name to first and last name fields ([#3156](https://github.com/hcengineering/platform/issues/3156)) 
* TSK-1402: · Fix default assignee when creating issues ([#3159](https://github.com/hcengineering/platform/issues/3159)) 
* TSK-1469,-1470: · Added SelectAvatars, UserBoxItems components ([#3176](https://github.com/hcengineering/platform/issues/3176)) 
* TSK-1489: · Fixed Components, Milestones, IssueTemplates layout ([#3220](https://github.com/hcengineering/platform/issues/3220)) 
* TSK-1500: · Enable compression by default ([#3177](https://github.com/hcengineering/platform/issues/3177)) 
* TSK-760: · Fix scroll issue for mac ([#3173](https://github.com/hcengineering/platform/issues/3173)) 
* UBER-122: · Fix invalid time report shown ([#3191](https://github.com/hcengineering/platform/issues/3191)) 
* UBER-130: · Fix expand/collapse on multiple levels ([#3198](https://github.com/hcengineering/platform/issues/3198)) 
* UBER-136: · Fix Exception with custom attributes ([#3195](https://github.com/hcengineering/platform/issues/3195)) 
* UBER-144: · Fixed showHeader ([#3214](https://github.com/hcengineering/platform/issues/3214)) 
* UBER-174: · Introduce createOn every there ([#3222](https://github.com/hcengineering/platform/issues/3222)) 
* UBER-177: · Fixed Filter pop-ups ([#3225](https://github.com/hcengineering/platform/issues/3225)) 
* UBER-48: · Custom fields for organization in leads ([#3203](https://github.com/hcengineering/platform/issues/3203)) 
* UBER-54: · Attempt to Expand/collapse issue fix ([#3183](https://github.com/hcengineering/platform/issues/3183)) 
* UBER-56: · Check if title is hidden for Candidate (Talent) in Kanban and Application. Fix Talent card width in Application ([#3196](https://github.com/hcengineering/platform/issues/3196)) 
* UBER-62: · Maintenance warnings ([#3210](https://github.com/hcengineering/platform/issues/3210)) 
* UBER-76: · Trigger search after timeout ([#3193](https://github.com/hcengineering/platform/issues/3193)) 
* UBER-81: · Fix move project ([#3182](https://github.com/hcengineering/platform/issues/3182)) 
* UBER-83: · Add BrowserStack notice into readme ([#3178](https://github.com/hcengineering/platform/issues/3178)) 
* UBER-87: · Add new icons ([#3188](https://github.com/hcengineering/platform/issues/3188)) 
* USER-145: · Fixed FixedColumn ([#3216](https://github.com/hcengineering/platform/issues/3216)) 
* USER-79: · Fixed the sidebar in the Panel. Update IssuePreview layout. ([#3201](https://github.com/hcengineering/platform/issues/3201)) 

## [0.6.95] - 2023-05-12

* 🚀 FEATURES: · Request notification for author ([#3147](https://github.com/hcengineering/platform/issues/3147)) 
* 🐛 BUG FIXES: · Favicon ([#3146](https://github.com/hcengineering/platform/issues/3146)) · Components UI tests ([#3157](https://github.com/hcengineering/platform/issues/3157)) · Missing attached filenames ([#3172](https://github.com/hcengineering/platform/issues/3172)) 
* TSK-1324: · Update popups and colors ([#3152](https://github.com/hcengineering/platform/issues/3152)) 
* TSK-1387: · Count cancelled sub-issues as completed ([#3158](https://github.com/hcengineering/platform/issues/3158)) 
* TSK-1418: · Make issue notification width smaller ([#3160](https://github.com/hcengineering/platform/issues/3160)) 
* TSK-1429: · Rework dueDate to ignore overdue in applicants, kanban and right panel ([#3169](https://github.com/hcengineering/platform/issues/3169)) 
* TSK-1432: · Fix popup closing ([#3170](https://github.com/hcengineering/platform/issues/3170)) 
* TSK-1436: · Change deleting spaces to removing, add action to move all non-valid requests to correct spaces ([#3149](https://github.com/hcengineering/platform/issues/3149)) 
* TSK-1451: · Fix focus issues + jump workaround ([#3167](https://github.com/hcengineering/platform/issues/3167)) 
* TSK-1452: · Revert sprint statistics display ([#3142](https://github.com/hcengineering/platform/issues/3142)) 
* TSK-1454: · Added varieties to the TabList ([#3161](https://github.com/hcengineering/platform/issues/3161)) 
* TSK-1459: · Update Panel layout ([#3163](https://github.com/hcengineering/platform/issues/3163)) 
* TSK-742: · Use partial binary protocol with ability on/off ([#3153](https://github.com/hcengineering/platform/issues/3153)) 

## [0.6.94] - 2023-05-04

* 🐛 BUG FIXES: · Kanban ([#3135](https://github.com/hcengineering/platform/issues/3135)) 
* TSK-1098: · My issues list ([#3137](https://github.com/hcengineering/platform/issues/3137)) 
* TSK-1236: · Trigger to remove members when deleting department. Fix for already broken departments ([#3120](https://github.com/hcengineering/platform/issues/3120)) 
* TSK-1257: · Add sorting by create time ([#3138](https://github.com/hcengineering/platform/issues/3138)) 
* TSK-1409: · Bump. client resources 0.6.16 ([#3134](https://github.com/hcengineering/platform/issues/3134)) 
* TSK-831: · Edit issue fixes ([#3140](https://github.com/hcengineering/platform/issues/3140)) 

## [0.6.93] - 2023-05-04

* TSK-1251: · My issues action. Hotkeys to lower case ([#3122](https://github.com/hcengineering/platform/issues/3122)) 
* TSK-1337: · Ui fixes. ([#3133](https://github.com/hcengineering/platform/issues/3133)) 
* TSK-1394,-1407,-1412,-1417,-1422,-1423: · Minor fixes. Fixed Scroller. ([#3124](https://github.com/hcengineering/platform/issues/3124)) 
* TSK-1400: · Show 0 in total (time spend reports) ([#3127](https://github.com/hcengineering/platform/issues/3127)) 
* TSK-1414: · Fix exceptions in Kanban ([#3119](https://github.com/hcengineering/platform/issues/3119)) · Fix exceptions in Kanban ([#3119](https://github.com/hcengineering/platform/issues/3119)) ([#3123](https://github.com/hcengineering/platform/issues/3123)) 
* TSK-1419: · Show greyed requests on holidays and weekends ([#3121](https://github.com/hcengineering/platform/issues/3121)) 
* TSK-1431,-1440: · Update AttachmentPresenter. Replace colors, minor fixes. ([#3131](https://github.com/hcengineering/platform/issues/3131)) 

## [0.6.92] - 2023-05-02

* 🐛 BUG FIXES: · 'not selected' filter option for due date ([#3111](https://github.com/hcengineering/platform/issues/3111)) 
* TSK-1166: · Sprint editor action ([#3110](https://github.com/hcengineering/platform/issues/3110)) 
* TSK-1206: · Drag-drop statuses between categories ([#3112](https://github.com/hcengineering/platform/issues/3112)) 
* TSK-1324: · Update kanban layout ([#3118](https://github.com/hcengineering/platform/issues/3118)) 
* TSK-1339: · Resize tooltip for dueDate and ignore overdue in done/cancelled ([#3113](https://github.com/hcengineering/platform/issues/3113)) 
* TSK-1393: · Fix status findAll requests extra data ([#3105](https://github.com/hcengineering/platform/issues/3105)) 
* TSK-1405: · Fix hover selection ([#3109](https://github.com/hcengineering/platform/issues/3109)) 
* TSK-1406: · Correct Configuration defaults ([#3107](https://github.com/hcengineering/platform/issues/3107)) 
* TSK-1410,-1408,-1392,-1389,-1386,-1377: · Minor fixes. Update IssueNotification layout. ([#3117](https://github.com/hcengineering/platform/issues/3117)) 

## [0.6.91a] - 2023-04-27

* 🐛 BUG FIXES: · Show more/less ([#3095](https://github.com/hcengineering/platform/issues/3095)) · DepartmentCard ([#3099](https://github.com/hcengineering/platform/issues/3099)) 
* TSK-1339: · Show dueDate for cancelled/done issues ([#3091](https://github.com/hcengineering/platform/issues/3091)) 
* TSK-1378: · Qfix for exception ([#3097](https://github.com/hcengineering/platform/issues/3097)) 
* TSK-1381: · Show preview and Table mouse hover selection ([#3098](https://github.com/hcengineering/platform/issues/3098)) 

## [0.6.91] - 2023-04-27

* 🐛 BUG FIXES: · Status remove ([#3070](https://github.com/hcengineering/platform/issues/3070)) · Tags editor ([#3071](https://github.com/hcengineering/platform/issues/3071)) · Draft comment stuck ([#3072](https://github.com/hcengineering/platform/issues/3072)) · Mention paste ([#3075](https://github.com/hcengineering/platform/issues/3075)) 
* TSK-1009: · Configurable platform ([#3055](https://github.com/hcengineering/platform/issues/3055)) 
* TSK-1066: · Don't allow creating requests if already exists for set days ([#3053](https://github.com/hcengineering/platform/issues/3053)) 
* TSK-1068: · Update department for Staff via side panel ([#3073](https://github.com/hcengineering/platform/issues/3073)) 
* TSK-1098: · All issues related fixes ([#3079](https://github.com/hcengineering/platform/issues/3079)) 
* TSK-1113: · Add issueUrl to notification for sub-issues ([#3057](https://github.com/hcengineering/platform/issues/3057)) 
* TSK-1114: · Fix default issue status ([#3044](https://github.com/hcengineering/platform/issues/3044)) 
* TSK-1248: · Revert changes and add check for unset field ([#3054](https://github.com/hcengineering/platform/issues/3054)) 
* TSK-1311: · Add editors for String and Number ([#3056](https://github.com/hcengineering/platform/issues/3056)) 
* TSK-1312: · Refit tooltip after loading components inside it ([#3083](https://github.com/hcengineering/platform/issues/3083)) 
* TSK-1314: · Fix slow Kanban open ([#3052](https://github.com/hcengineering/platform/issues/3052)) 
* TSK-1323: · Fix colors for list ([#3069](https://github.com/hcengineering/platform/issues/3069)) 
* TSK-1342: · Reduce number of transfer data and improve Kanban initial render speed ([#3078](https://github.com/hcengineering/platform/issues/3078)) 
* TSK-1353: · Update ListView headers. Replaced colors in settings. ([#3086](https://github.com/hcengineering/platform/issues/3086)) 
* TSK-1375: · Sub issue selector icons ([#3089](https://github.com/hcengineering/platform/issues/3089)) 
* TSK-571: · Fix keyboard list navigation ([#3085](https://github.com/hcengineering/platform/issues/3085)) 

## [0.6.90a] - 2023-04-23

* ⚙️ MISCELLANEOUS TASKS: · Debug info ([#3050](https://github.com/hcengineering/platform/issues/3050)) 

## [0.6.90] - 2023-04-23

* 🐛 BUG FIXES: · Parent status presenter ([#3035](https://github.com/hcengineering/platform/issues/3035)) · Paste handler ([#3038](https://github.com/hcengineering/platform/issues/3038)) · Read vacancy ([#3039](https://github.com/hcengineering/platform/issues/3039)) · Remove attachment ([#3040](https://github.com/hcengineering/platform/issues/3040)) · Due date ([#3042](https://github.com/hcengineering/platform/issues/3042)) · Resolved loc ([#3046](https://github.com/hcengineering/platform/issues/3046)) 
* ⚙️ MISCELLANEOUS TASKS: · Panel opacity ([#3047](https://github.com/hcengineering/platform/issues/3047)) 
* TSK-1243: · Add scroller to project's components list ([#3045](https://github.com/hcengineering/platform/issues/3045)) 

## [0.6.89] - 2023-04-21

* 🐛 BUG FIXES: · Removed attachment presenter ([#3026](https://github.com/hcengineering/platform/issues/3026)) 
* ⚙️ MISCELLANEOUS TASKS: · Status ([#3031](https://github.com/hcengineering/platform/issues/3031)) 
* TSK-1047: · Fix showing requests after moving staff to another department ([#3029](https://github.com/hcengineering/platform/issues/3029)) 
* TSK-1064: · Fix export csv in hr ([#3032](https://github.com/hcengineering/platform/issues/3032)) 
* TSK-1237: · Improve full text indexer ([#3025](https://github.com/hcengineering/platform/issues/3025)) 
* TSK-1274: · Fix Kanban live updates ([#3024](https://github.com/hcengineering/platform/issues/3024)) 

## [0.6.88] - 2023-04-19

* 🐛 BUG FIXES: · Templates ([#3018](https://github.com/hcengineering/platform/issues/3018)) · Integration selector ([#3020](https://github.com/hcengineering/platform/issues/3020)) 
* TSK-1248: · Sort null last for dates ([#3021](https://github.com/hcengineering/platform/issues/3021)) 
* TSK-1252: · Dispatch update event for attribute bar ([#3017](https://github.com/hcengineering/platform/issues/3017)) 
* TSK-964: · Fit popup when component is loaded. Redo cases when popup doesn't fit due to small window sizes ([#3022](https://github.com/hcengineering/platform/issues/3022)) 

## [0.6.87] - 2023-04-19

* 🐛 BUG FIXES: · Open action ([#3007](https://github.com/hcengineering/platform/issues/3007)) · Issue template ([#3006](https://github.com/hcengineering/platform/issues/3006)) · Saved view null loc ([#3009](https://github.com/hcengineering/platform/issues/3009)) · Kanban update ([#3010](https://github.com/hcengineering/platform/issues/3010)) · Object filter ([#3011](https://github.com/hcengineering/platform/issues/3011)) · Status editor ([#3014](https://github.com/hcengineering/platform/issues/3014)) · Space security ([#3016](https://github.com/hcengineering/platform/issues/3016)) 
* TSK-1158: · Remove component from sprint. Remove logic for changing component on sprint change ([#2998](https://github.com/hcengineering/platform/issues/2998)) 
* TSK-1248: · Fix dueDate sorting order ([#3013](https://github.com/hcengineering/platform/issues/3013)) 
* TSK-808: · Ignore initial validation when autofilled for login form ([#3012](https://github.com/hcengineering/platform/issues/3012)) 

## [0.6.86] - 2023-04-17

* 🐛 BUG FIXES: · Integration share ([#3002](https://github.com/hcengineering/platform/issues/3002)) · Status filter count ([#3000](https://github.com/hcengineering/platform/issues/3000)) · Location override ([#3004](https://github.com/hcengineering/platform/issues/3004)) 
* TSK-1213: · Allow to clean archived vacancies with content ([#2999](https://github.com/hcengineering/platform/issues/2999)) 
* TSK-1216: · Fix bitrix import ([#3005](https://github.com/hcengineering/platform/issues/3005)) 
* TSK-753: · Open user's department in schedule by default ([#3001](https://github.com/hcengineering/platform/issues/3001)) 

## [0.6.85] - 2023-04-17

* 🐛 BUG FIXES: · List drop ([#2996](https://github.com/hcengineering/platform/issues/2996)) 
* TSK-1032: · Add confirmation dialog for projects, fix sprint deleting and allow deleting for Owner or creator only ([#2964](https://github.com/hcengineering/platform/issues/2964)) 
* TSK-1201: · Fix bitrix migration and too to clean removed transactions ([#2995](https://github.com/hcengineering/platform/issues/2995)) 

## [0.6.84] - 2023-04-16

* 🐛 BUG FIXES: · Kanban is slow on updates ([#2991](https://github.com/hcengineering/platform/issues/2991)) · Query create lookup ([#2993](https://github.com/hcengineering/platform/issues/2993)) 
* TSK-1200: · Fix Applications with wrong state ([#2992](https://github.com/hcengineering/platform/issues/2992)) 

## [0.6.83] - 2023-04-14

* 🐛 BUG FIXES: · Gmail reconnect ([#2988](https://github.com/hcengineering/platform/issues/2988)) · Channel filter selector ([#2989](https://github.com/hcengineering/platform/issues/2989)) 
* ⚙️ MISCELLANEOUS TASKS: · Core 23 ([#2982](https://github.com/hcengineering/platform/issues/2982)) 
* TSK-1062: · Work on Employee and EmployeeAccount migration ([#2986](https://github.com/hcengineering/platform/issues/2986)) 
* TSK-1189: · Fix showing all available categories ([#2987](https://github.com/hcengineering/platform/issues/2987)) 
* TSK-1194: · Fix filter ([#2990](https://github.com/hcengineering/platform/issues/2990)) 

## [0.6.82] - 2023-04-13

* 🐛 BUG FIXES: · Zero status filter values ([#2970](https://github.com/hcengineering/platform/issues/2970)) · Tx collapse ([#2972](https://github.com/hcengineering/platform/issues/2972)) · Status space query ([#2973](https://github.com/hcengineering/platform/issues/2973)) · List undefined group ([#2979](https://github.com/hcengineering/platform/issues/2979)) · Popup icon color ([#2980](https://github.com/hcengineering/platform/issues/2980)) 
* TSK-1152: · Fix connections mess ([#2969](https://github.com/hcengineering/platform/issues/2969)) 
* TSK-1153: · Fix server model load exceptions ([#2967](https://github.com/hcengineering/platform/issues/2967)) 
* TSK-1154: · Statuses table support ([#2974](https://github.com/hcengineering/platform/issues/2974)) 
* TSK-1170: · Fix transactions retrieval to speedup of workspace open ([#2976](https://github.com/hcengineering/platform/issues/2976)) 

## [0.6.81] - 2023-04-12

* 🐛 BUG FIXES: · Sub issue selector ([#2953](https://github.com/hcengineering/platform/issues/2953)) · Status undefined ([#2958](https://github.com/hcengineering/platform/issues/2958)) · Popup fit ([#2959](https://github.com/hcengineering/platform/issues/2959)) · Disabled integration notification ([#2962](https://github.com/hcengineering/platform/issues/2962)) 
* TSK-1012: · Change text names for Organizations to Companies ([#2963](https://github.com/hcengineering/platform/issues/2963)) 
* TSK-1086: · Fix merge ([#2961](https://github.com/hcengineering/platform/issues/2961)) 
* TSK-1141: · Fix bitrix fields ([#2956](https://github.com/hcengineering/platform/issues/2956)) 
* TSK-1146: · Support initial content text for collaborator doc ([#2960](https://github.com/hcengineering/platform/issues/2960)) 
* TSK-1148: · Mixin button for Vacancy and NPE fixes ([#2965](https://github.com/hcengineering/platform/issues/2965)) 
* TSK-1150: · Rollback svelte ([#2966](https://github.com/hcengineering/platform/issues/2966)) 

## [0.6.80a] - 2023-04-12

* TSK-1089: · Proper Recruit Archive ([#2952](https://github.com/hcengineering/platform/issues/2952)) 

## [0.6.80] - 2023-04-11

* 🚀 FEATURES: · Add telegram template field ([#2941](https://github.com/hcengineering/platform/issues/2941)) 
* 🐛 BUG FIXES: · Create draft issue duplicate id ([#2935](https://github.com/hcengineering/platform/issues/2935)) · Remove tag ([#2939](https://github.com/hcengineering/platform/issues/2939)) · Filter removing values ([#2940](https://github.com/hcengineering/platform/issues/2940)) · Typo ([#2946](https://github.com/hcengineering/platform/issues/2946)) · Multiattachment ([#2950](https://github.com/hcengineering/platform/issues/2950)) · Done filter ([#2951](https://github.com/hcengineering/platform/issues/2951)) 
* ⚙️ MISCELLANEOUS TASKS: · And publish bitrix package ([#2926](https://github.com/hcengineering/platform/issues/2926)) 
* TSK-1040: · Support editable for DraggableList ([#2932](https://github.com/hcengineering/platform/issues/2932)) 
* TSK-1072: · Fix Created by ([#2948](https://github.com/hcengineering/platform/issues/2948)) 
* TSK-1092: · Fix reconnect for Safari ([#2929](https://github.com/hcengineering/platform/issues/2929)) 
* TSK-1093: · Fix Application doneState showing ([#2927](https://github.com/hcengineering/platform/issues/2927)) 
* TSK-1106: · Update to latest packages ([#2943](https://github.com/hcengineering/platform/issues/2943)) 

## [0.6.79] - 2023-04-07

* 🚀 FEATURES: · To disable creation in special view ([#2865](https://github.com/hcengineering/platform/issues/2865)) · Add inbox employee bold ([#2909](https://github.com/hcengineering/platform/issues/2909)) · Add ignore keys for ClassFilters ([#2912](https://github.com/hcengineering/platform/issues/2912)) · Add commentator to collaborators ([#2911](https://github.com/hcengineering/platform/issues/2911)) 
* 🐛 BUG FIXES: · Date picker translation ([#2883](https://github.com/hcengineering/platform/issues/2883)) · Array values in the "EmployeeRefPresenter" ([#2859](https://github.com/hcengineering/platform/issues/2859)) · Channels last view ([#2894](https://github.com/hcengineering/platform/issues/2894)) · Filter remove ([#2888](https://github.com/hcengineering/platform/issues/2888)) · Message content width ([#2903](https://github.com/hcengineering/platform/issues/2903)) · Notification mark ([#2908](https://github.com/hcengineering/platform/issues/2908)) · Bitrix gmail sync ([#2918](https://github.com/hcengineering/platform/issues/2918)) · Activity is new ([#2923](https://github.com/hcengineering/platform/issues/2923)) 
* ⚙️ MISCELLANEOUS TASKS: · Contact resolver id check ([#2910](https://github.com/hcengineering/platform/issues/2910)) 
* TSK-1007: · Add comments in talent editor ([#2922](https://github.com/hcengineering/platform/issues/2922)) 
* TSK-1013: · Add position field to Employee ([#2874](https://github.com/hcengineering/platform/issues/2874)) 
* TSK-1015: · Bitrix Create Vacancy/Application ([#2913](https://github.com/hcengineering/platform/issues/2913)) 
* TSK-1038: · Fix comments presenter ([#2896](https://github.com/hcengineering/platform/issues/2896)) 
* TSK-1062: · Fix merge properly ([#2919](https://github.com/hcengineering/platform/issues/2919)) 
* TSK-1065: · Check model version ([#2916](https://github.com/hcengineering/platform/issues/2916)) 
* TSK-1088: · Show Kanban counters ([#2924](https://github.com/hcengineering/platform/issues/2924)) 
* TSK-943: · General Status support ([#2842](https://github.com/hcengineering/platform/issues/2842)) 
* TSK-990: · Remove Back button in settings ([#2875](https://github.com/hcengineering/platform/issues/2875)) 
* TSK-1040: · Support draft for DraggableList ([#2898](https://github.com/hcengineering/platform/issues/2898)) 

## [0.6.78a] - 2023-04-03

* 🐛 BUG FIXES: · Broken filter ([#2876](https://github.com/hcengineering/platform/issues/2876)) 

## [0.6.78] - 2023-04-03

* 🚀 FEATURES: · Add custom label to Attachments component ([#2872](https://github.com/hcengineering/platform/issues/2872)) 
* 🐛 BUG FIXES: · Setting migration ([#2869](https://github.com/hcengineering/platform/issues/2869)) · Integration selector ([#2871](https://github.com/hcengineering/platform/issues/2871)) · Typos ([#2873](https://github.com/hcengineering/platform/issues/2873)) 
* TSK-1010: · Change color for New Customer button ([#2870](https://github.com/hcengineering/platform/issues/2870)) 
* TSK-950: · Remove value from filter if the object doesn't exist ([#2852](https://github.com/hcengineering/platform/issues/2852)) 

## [0.6.77] - 2023-03-31

* 🚀 FEATURES: · To disable particular items in ObjectPopup ([#2824](https://github.com/hcengineering/platform/issues/2824)) · Add ability to hide checkboxes ([#2843](https://github.com/hcengineering/platform/issues/2843)) 
* 🐛 BUG FIXES: · Fill defaults ([#2832](https://github.com/hcengineering/platform/issues/2832)) · Cmd+click for new tab ([#2835](https://github.com/hcengineering/platform/issues/2835)) · Blur clear email ([#2862](https://github.com/hcengineering/platform/issues/2862)) · Space security ([#2868](https://github.com/hcengineering/platform/issues/2868)) 
* TSK-839: · Fix localization strings ([#2833](https://github.com/hcengineering/platform/issues/2833)) 
* TSK-903: · Do not allow saving if set to private with no members ([#2854](https://github.com/hcengineering/platform/issues/2854)) 
* TSK-916: · Fix attribute errors in console ([#2839](https://github.com/hcengineering/platform/issues/2839)) 
* TSK-942: · Add hours to current time ([#2837](https://github.com/hcengineering/platform/issues/2837)) 
* TSK-955: · Fix status display ([#2840](https://github.com/hcengineering/platform/issues/2840)) 
* TSK-960: · Move for issues ([#2846](https://github.com/hcengineering/platform/issues/2846)) 
* TSK-963: · Show avatar on comments ([#2857](https://github.com/hcengineering/platform/issues/2857)) 
* TSK-976: · Hide preview action ([#2847](https://github.com/hcengineering/platform/issues/2847)) 
* TSK-983: · Fix Cache control for index pages ([#2850](https://github.com/hcengineering/platform/issues/2850)) 
* TSK-987: · Show filter with 0 value ([#2855](https://github.com/hcengineering/platform/issues/2855)) 
* TSK-988: · Sticky first column in hr calendar ([#2867](https://github.com/hcengineering/platform/issues/2867)) 
* TSK-989: · Transparent requests (PTO, extra, etc.) when not in department or it's descendants ([#2861](https://github.com/hcengineering/platform/issues/2861)) 
* TSK-992: · Fix column name in Companies ([#2860](https://github.com/hcengineering/platform/issues/2860)) 

## [0.6.76b] - 2023-03-24

* 🐛 BUG FIXES: · Account presenter ([#2829](https://github.com/hcengineering/platform/issues/2829)) · Last loc ([#2831](https://github.com/hcengineering/platform/issues/2831)) 

## [0.6.76a] - 2023-03-24

* 🐛 BUG FIXES: · Action handler performance. ([#2828](https://github.com/hcengineering/platform/issues/2828)) 
* TSK-897: · Allow team-leads and managers to edit descendant departments ([#2825](https://github.com/hcengineering/platform/issues/2825)) 
* TSK-941: · Fix incorrect rewriting space after selecting in SpaceSelect ([#2827](https://github.com/hcengineering/platform/issues/2827)) 

## [0.6.76] - 2023-03-24

* 🐛 BUG FIXES: · Issue open direct link empty space ([#2789](https://github.com/hcengineering/platform/issues/2789)) · Account error handler ([#2795](https://github.com/hcengineering/platform/issues/2795)) · Client resources ([#2791](https://github.com/hcengineering/platform/issues/2791)) · Filters ([#2804](https://github.com/hcengineering/platform/issues/2804)) · Component rename ([#2805](https://github.com/hcengineering/platform/issues/2805)) · Vacancies query ([#2810](https://github.com/hcengineering/platform/issues/2810)) · Profile ([#2816](https://github.com/hcengineering/platform/issues/2816)) · Import ([#2821](https://github.com/hcengineering/platform/issues/2821)) 
* ⚙️ MISCELLANEOUS TASKS: · Client-resources ([#2798](https://github.com/hcengineering/platform/issues/2798)) 
* TSK-745: · Do not allow changing previous months events (Requests and public holidays) ([#2796](https://github.com/hcengineering/platform/issues/2796)) 
* TSK-811: · Fix for undefined when saving platform last location ([#2790](https://github.com/hcengineering/platform/issues/2790)) 
* TSK-813: · Fix input width and remove divider for time report popup ([#2794](https://github.com/hcengineering/platform/issues/2794)) 
* TSK-825: · Client proper reconnection ([#2797](https://github.com/hcengineering/platform/issues/2797)) 
* TSK-831: · Edit Title and Description inline ([#2788](https://github.com/hcengineering/platform/issues/2788)) 
* TSK-858: · Send picture without text as comment for issues ([#2793](https://github.com/hcengineering/platform/issues/2793)) 
* TSK-885: · Fix invalid deps ([#2777](https://github.com/hcengineering/platform/issues/2777)) 
* TSK-912: · Notifications on removing the request ([#2806](https://github.com/hcengineering/platform/issues/2806)) 
* TSK-915: · Tracker status ([#2802](https://github.com/hcengineering/platform/issues/2802)) 
* TSK-920: · Rename CreatedBy field ([#2807](https://github.com/hcengineering/platform/issues/2807)) 
* TSK-924: · Follow proper order for Tracker Kanban ([#2815](https://github.com/hcengineering/platform/issues/2815)) 
* TSK-934: · Redirect to last location on opening main page ([#2817](https://github.com/hcengineering/platform/issues/2817)) 
* TSK-937: · Fix tooltip for employee ([#2822](https://github.com/hcengineering/platform/issues/2822)) 

## [0.6.75b] - 2023-03-21

* 🐛 BUG FIXES: · Undefined number presenter ([#2787](https://github.com/hcengineering/platform/issues/2787)) 
* TSK-894: · Fix template creation and apply ([#2785](https://github.com/hcengineering/platform/issues/2785)) 
* TSK-895: · Allow to mention only active employees ([#2786](https://github.com/hcengineering/platform/issues/2786)) 

## [0.6.75a] - 2023-03-21

* TSK-877: · Show only Candidates for Application creation dialog ([#2784](https://github.com/hcengineering/platform/issues/2784)) 
* TSK-889: · Fix hang and displayName search for Employee ([#2783](https://github.com/hcengineering/platform/issues/2783)) 

## [0.6.75] - 2023-03-21

* 🐛 BUG FIXES: · Redirect url ([#2775](https://github.com/hcengineering/platform/issues/2775)) 
* TSK-811: · Show last workspace location after switching/opening workspace ([#2776](https://github.com/hcengineering/platform/issues/2776)) 
* TSK-813: · Remove WorkDayLength and change time reports to hours ([#2763](https://github.com/hcengineering/platform/issues/2763)) 
* TSK-859: · Replacing icons. TSK-883: Pop-up for viewing images. ([#2782](https://github.com/hcengineering/platform/issues/2782)) 
* TSK-871: · Fix overtime display ([#2769](https://github.com/hcengineering/platform/issues/2769)) 
* TSK-879: · Fix empty assignee selection ([#2774](https://github.com/hcengineering/platform/issues/2774)) 
* TSK-890: · Fix component icons ([#2778](https://github.com/hcengineering/platform/issues/2778)) 
* TSK-891: · Fix UI Tests instability ([#2780](https://github.com/hcengineering/platform/issues/2780)) 

## [0.6.74a] - 2023-03-17

* 🐛 BUG FIXES: · Component migration ([#2767](https://github.com/hcengineering/platform/issues/2767)) 

## [0.6.74] - 2023-03-17

* 🚀 FEATURES: · To hide actions ([#2737](https://github.com/hcengineering/platform/issues/2737)) · Add component migration ([#2764](https://github.com/hcengineering/platform/issues/2764)) 
* 🐛 BUG FIXES: · Chunter replies ([#2759](https://github.com/hcengineering/platform/issues/2759)) · Links resolvers ([#2761](https://github.com/hcengineering/platform/issues/2761)) 
* ⚙️ MISCELLANEOUS TASKS: · Focus when open vacancy editor ([#2757](https://github.com/hcengineering/platform/issues/2757)) · Roadmap ([#2760](https://github.com/hcengineering/platform/issues/2760)) 
* TSK-812: · Opening images in the center. Minor design corrections. ([#2755](https://github.com/hcengineering/platform/issues/2755)) 
* TSK-857: · Create company button ([#2762](https://github.com/hcengineering/platform/issues/2762)) 

## [0.6.73a] - 2023-03-16

* 🐛 BUG FIXES: · Filter overflow ([#2746](https://github.com/hcengineering/platform/issues/2746)) 
* TSK-568: · User-friendly message on join for expired links ([#2752](https://github.com/hcengineering/platform/issues/2752)) 
* TSK-802: · Save token to array ([#2754](https://github.com/hcengineering/platform/issues/2754)) 
* TSK-807: · Query only active Employees ([#2753](https://github.com/hcengineering/platform/issues/2753)) 
* TSK-849: · Show labels in list ([#2749](https://github.com/hcengineering/platform/issues/2749)) 

## [0.6.73] - 2023-03-16

* 🐛 BUG FIXES: · Short links quickfix ([#2745](https://github.com/hcengineering/platform/issues/2745)) 
* TSK-791: · Handle department's public holidays + add stats for it ([#2735](https://github.com/hcengineering/platform/issues/2735)) 
* TSK-827: · Rename Process to Pattern ([#2740](https://github.com/hcengineering/platform/issues/2740)) 
* TSK-837: · Fix backup OOM ([#2732](https://github.com/hcengineering/platform/issues/2732)) 
* TSK-838: · Created by ([#2742](https://github.com/hcengineering/platform/issues/2742)) 
* TSK-842: · Fix resume recognition functionality ([#2736](https://github.com/hcengineering/platform/issues/2736)) 
* TSL-840: · Fixed the display of Filtered views ([#2743](https://github.com/hcengineering/platform/issues/2743)) 

## [0.6.72b] - 2023-03-14

* 🐛 BUG FIXES: · Private security ([#2731](https://github.com/hcengineering/platform/issues/2731)) 

## [0.6.72a] - 2023-03-13

* 🚀 FEATURES: · Add system spaces ([#2724](https://github.com/hcengineering/platform/issues/2724)) 
* 🐛 BUG FIXES: · Org member channel open ([#2725](https://github.com/hcengineering/platform/issues/2725)) 
* ⚙️ MISCELLANEOUS TASKS: · Mention extra ([#2726](https://github.com/hcengineering/platform/issues/2726)) 
* TSK-803: · Fix load speed ([#2728](https://github.com/hcengineering/platform/issues/2728)) 

## [0.6.71] - 2023-03-06

* 🚀 FEATURES: · Add Bitrix required mixins ([#2713](https://github.com/hcengineering/platform/issues/2713)) 

## [0.6.70] - 2023-03-06

* 🚀 FEATURES: · To disable nav header and specials ([#2707](https://github.com/hcengineering/platform/issues/2707)) · Filtering assignee list ([#2708](https://github.com/hcengineering/platform/issues/2708)) 

## [0.6.69b] - 2023-03-02

* ⚙️ MISCELLANEOUS TASKS: · Owner space security ([#2705](https://github.com/hcengineering/platform/issues/2705)) 
* TSK-761: · Team default assignee ([#2706](https://github.com/hcengineering/platform/issues/2706)) 
* TSK-769: · Fix channel editor ([#2704](https://github.com/hcengineering/platform/issues/2704)) 

## [0.6.69a] - 2023-03-02

* 🐛 BUG FIXES: · Related issues assignee ([#2702](https://github.com/hcengineering/platform/issues/2702)) 

## [0.6.69] - 2023-03-01

* 🚀 FEATURES: · Add "required" asterisk ([#2686](https://github.com/hcengineering/platform/issues/2686)) · Add steps dialog based on "Panel" component ([#2688](https://github.com/hcengineering/platform/issues/2688)) · Add checkIsHeaderHidden func to Application model ([#2690](https://github.com/hcengineering/platform/issues/2690)) · Add scroller to the "StepsDialog" content ([#2697](https://github.com/hcengineering/platform/issues/2697)) 
* 🐛 BUG FIXES: · Bitrix attachments ([#2683](https://github.com/hcengineering/platform/issues/2683)) · Attachment dragndrop ([#2687](https://github.com/hcengineering/platform/issues/2687)) · Chunter employees ([#2698](https://github.com/hcengineering/platform/issues/2698)) 
* ⚙️ MISCELLANEOUS TASKS: · StepsDialog steps switching ([#2692](https://github.com/hcengineering/platform/issues/2692)) 
* TSK-517: · Show 'Last Modified' instead of 'Date' for attachments ([#2696](https://github.com/hcengineering/platform/issues/2696)) 
* TSK-713: · Notifications for DM ([#2695](https://github.com/hcengineering/platform/issues/2695)) 
* TSK-728: · Server reconnect support ([#2689](https://github.com/hcengineering/platform/issues/2689)) 
* TSK-734: · Fix Bitrix email import ([#2700](https://github.com/hcengineering/platform/issues/2700)) 

## [0.6.68a] - 2023-02-22

* ⚙️ MISCELLANEOUS TASKS: · Gmail ([#2680](https://github.com/hcengineering/platform/issues/2680)) 

## [0.6.68] - 2023-02-22

* 🚀 FEATURES: · Add action for changing request type ([#2668](https://github.com/hcengineering/platform/issues/2668)) 
* 🐛 BUG FIXES: · Create doc ([#2672](https://github.com/hcengineering/platform/issues/2672)) 
* ⚙️ MISCELLANEOUS TASKS: · Bump from CI ([#2670](https://github.com/hcengineering/platform/issues/2670)) · Member when delete contact ([#2673](https://github.com/hcengineering/platform/issues/2673)) 
* EZQ-49: · Update collaborator ([#2677](https://github.com/hcengineering/platform/issues/2677)) 
* TSK-544: · Search by issue number and description ([#2675](https://github.com/hcengineering/platform/issues/2675)) 

## [0.6.67d] - 2023-02-20

* 🐛 BUG FIXES: · CI 

## [0.6.67a] - 2023-02-20

* 🐛 BUG FIXES: · Attached remove ([#2661](https://github.com/hcengineering/platform/issues/2661)) · Ci ([#2664](https://github.com/hcengineering/platform/issues/2664)) 

## [0.6.67] - 2023-02-20

* 🐛 BUG FIXES: · Small issues ([#2646](https://github.com/hcengineering/platform/issues/2646)) 
* ⚙️ MISCELLANEOUS TASKS: · Obsolete queryview ([#2659](https://github.com/hcengineering/platform/issues/2659)) 
* TSK-467: · Throw error when used for AttachedDoc ([#2649](https://github.com/hcengineering/platform/issues/2649)) 
* TSK-637: · Add login and recovery action ([#2654](https://github.com/hcengineering/platform/issues/2654)) 
* TSK-678: · Update First/Last names ([#2652](https://github.com/hcengineering/platform/issues/2652)) 
* TSK-679: · Add Whatsapp ([#2651](https://github.com/hcengineering/platform/issues/2651)) 
* TSK-685: · Prioritise selection when focus exists ([#2648](https://github.com/hcengineering/platform/issues/2648)) 

## [0.6.66] - 2023-02-16

* 🐛 BUG FIXES: · Query if "_class" is object with "$nin" ([#2620](https://github.com/hcengineering/platform/issues/2620)) · Workbench direction ([#2617](https://github.com/hcengineering/platform/issues/2617)) · Table footer ([#2619](https://github.com/hcengineering/platform/issues/2619)) · List props ([#2623](https://github.com/hcengineering/platform/issues/2623)) · Extra no grouping ([#2624](https://github.com/hcengineering/platform/issues/2624)) · Autoscroll ([#2622](https://github.com/hcengineering/platform/issues/2622)) · Contacts layout ([#2631](https://github.com/hcengineering/platform/issues/2631)) · Create height ([#2633](https://github.com/hcengineering/platform/issues/2633)) · Typo ([#2634](https://github.com/hcengineering/platform/issues/2634)) · For removing team from mutable object in cached map ([#2637](https://github.com/hcengineering/platform/issues/2637)) · Account/Backup ([#2642](https://github.com/hcengineering/platform/issues/2642)) · View options ([#2643](https://github.com/hcengineering/platform/issues/2643)) 
* ⚙️ MISCELLANEOUS TASKS: · Supercharge/mongodb-github-action from 1.8.0 to 1.9.0 ([#2621](https://github.com/hcengineering/platform/issues/2621)) · Team ([#2625](https://github.com/hcengineering/platform/issues/2625)) 

## [0.6.65] - 2023-02-10

* 🚀 FEATURES: · Add AttributeFilter in Activity ([#2608](https://github.com/hcengineering/platform/issues/2608)) · To add tabs to Contacts App ([#2599](https://github.com/hcengineering/platform/issues/2599)) · Add "isEmpty" prop to "MessageViewer" ([#2613](https://github.com/hcengineering/platform/issues/2613)) · Add 7/8 to time report ([#2614](https://github.com/hcengineering/platform/issues/2614)) 
* 🐛 BUG FIXES: · Saved view load ([#2609](https://github.com/hcengineering/platform/issues/2609)) · Filter type popup ([#2610](https://github.com/hcengineering/platform/issues/2610)) · CreateOn ([#2616](https://github.com/hcengineering/platform/issues/2616)) 
* TSK-651: · Fix Team editing ([#2611](https://github.com/hcengineering/platform/issues/2611)) 

## [0.6.64] - 2023-02-08

* 🐛 BUG FIXES: · Chunter infinite spinner. ([#2585](https://github.com/hcengineering/platform/issues/2585)) · "SortableList" drag n drop with descending sorting ([#2591](https://github.com/hcengineering/platform/issues/2591)) · Migration ([#2593](https://github.com/hcengineering/platform/issues/2593)) 
* ⚙️ MISCELLANEOUS TASKS: · Core plugin version ([#2583](https://github.com/hcengineering/platform/issues/2583)) · Scrums for now ([#2584](https://github.com/hcengineering/platform/issues/2584)) · Project button ([#2578](https://github.com/hcengineering/platform/issues/2578)) · Editing for contact ([#2603](https://github.com/hcengineering/platform/issues/2603)) 
* TSK-413: · Implement scrum recording ([#2550](https://github.com/hcengineering/platform/issues/2550)) 
* TSK-570: · Fix RelatedIssues ([#2596](https://github.com/hcengineering/platform/issues/2596)) 
* TSK-608: · Move Vacancy support. ([#2597](https://github.com/hcengineering/platform/issues/2597)) 

## [0.6.63] - 2023-02-02

* 🐛 BUG FIXES: · More links ([#2577](https://github.com/hcengineering/platform/issues/2577)) · List create props ([#2580](https://github.com/hcengineering/platform/issues/2580)) 

## [0.6.62] - 2023-02-01

* 🚀 FEATURES: · Ses by default ([#2569](https://github.com/hcengineering/platform/issues/2569)) · Add wizard ([#2571](https://github.com/hcengineering/platform/issues/2571)) 
* 🐛 BUG FIXES: · Small issues ([#2566](https://github.com/hcengineering/platform/issues/2566)) 

## [0.6.61] - 2023-01-30

* 🚀 FEATURES: · Add props to the "CreateObject" popup ([#2552](https://github.com/hcengineering/platform/issues/2552)) 
* 🐛 BUG FIXES: · Typo ([#2557](https://github.com/hcengineering/platform/issues/2557)) · Html links ([#2558](https://github.com/hcengineering/platform/issues/2558)) 
* TSK-476: · Bitrix import fixes ([#2548](https://github.com/hcengineering/platform/issues/2548)) 
* TSK-569: · Fix MarkupPresenter, ShowMore ([#2553](https://github.com/hcengineering/platform/issues/2553)) 

## [0.6.60a] - 2023-01-27

* 🐛 BUG FIXES: · Gmail url bundle ([#2551](https://github.com/hcengineering/platform/issues/2551)) 

## [0.6.60] - 2023-01-26

* 🐛 BUG FIXES: · Viewlet preferences ([#2547](https://github.com/hcengineering/platform/issues/2547)) 

## [0.6.59] - 2023-01-25

* 🚀 FEATURES: · Add "on:change" tab event ([#2541](https://github.com/hcengineering/platform/issues/2541)) 
* 🐛 BUG FIXES: · Recruit ([#2543](https://github.com/hcengineering/platform/issues/2543)) · Remove contact with gravatar/color ([#2542](https://github.com/hcengineering/platform/issues/2542)) · Private txes ([#2544](https://github.com/hcengineering/platform/issues/2544)) · Jumping popup ([#2545](https://github.com/hcengineering/platform/issues/2545)) 

## [0.6.58] - 2023-01-25

* 🐛 BUG FIXES: · Applications view ([#2537](https://github.com/hcengineering/platform/issues/2537)) 
* ⚙️ MISCELLANEOUS TASKS: · AccountPopup ([#2539](https://github.com/hcengineering/platform/issues/2539)) 

## [0.6.57] - 2023-01-24

* 🚀 FEATURES: · Add Timeline component ([#2535](https://github.com/hcengineering/platform/issues/2535)) 
* TSK-553: · Fix padding in assignee popup ([#2531](https://github.com/hcengineering/platform/issues/2531)) 

## [0.6.56] - 2023-01-23

* 🐛 BUG FIXES: · Issue icon ([#2532](https://github.com/hcengineering/platform/issues/2532)) · List collapse ([#2533](https://github.com/hcengineering/platform/issues/2533)) 

## [0.6.55] - 2023-01-20

* 🚀 FEATURES: · To show filter items only for current space · Add support for user-saved filtered Views ([#2521](https://github.com/hcengineering/platform/issues/2521)) 
* 🐛 BUG FIXES: · Sprints sort func ([#2507](https://github.com/hcengineering/platform/issues/2507)) · Special view ([#2516](https://github.com/hcengineering/platform/issues/2516)) · Issue templates ([#2517](https://github.com/hcengineering/platform/issues/2517)) 
* ⚙️ MISCELLANEOUS TASKS: · Versions ([#2494](https://github.com/hcengineering/platform/issues/2494)) · Notifications layout ([#2500](https://github.com/hcengineering/platform/issues/2500)) · Default status id for issues when created one after another ([#2501](https://github.com/hcengineering/platform/issues/2501)) · Requests layout, fix UI ([#2503](https://github.com/hcengineering/platform/issues/2503)) · Preference migrate ([#2506](https://github.com/hcengineering/platform/issues/2506)) · Sprint update propogation ([#2512](https://github.com/hcengineering/platform/issues/2512)) · EstimationPopup layout ([#2513](https://github.com/hcengineering/platform/issues/2513)) · Extra import 
* TSK-360: · Assignee selection enhancements ([#2509](https://github.com/hcengineering/platform/issues/2509)) 

## [0.6.54] - 2023-01-06

* 🚀 FEATURES: · Requests ([#2492](https://github.com/hcengineering/platform/issues/2492)) 

## [0.6.53a] - 2022-12-30

* 🚀 FEATURES: · Select workpace ([#2487](https://github.com/hcengineering/platform/issues/2487)) 
* 🐛 BUG FIXES: · Sprint editor display ([#2488](https://github.com/hcengineering/platform/issues/2488)) 
* TSK-507: · Assignee box Direction line is hidden to early ([#2485](https://github.com/hcengineering/platform/issues/2485)) 

## [0.6.53] - 2022-12-29

* 🚀 FEATURES: · Add scale PDF preview ([#2478](https://github.com/hcengineering/platform/issues/2478)) 
* 🐛 BUG FIXES: · Svete a11y warnings ([#2469](https://github.com/hcengineering/platform/issues/2469)) · Month view rounding ([#2472](https://github.com/hcengineering/platform/issues/2472)) · Navigation link with auth ([#2475](https://github.com/hcengineering/platform/issues/2475)) · Archive layout ([#2479](https://github.com/hcengineering/platform/issues/2479)) · Plugin import search ([#2480](https://github.com/hcengineering/platform/issues/2480)) · Wrong calendar numbers ([#2484](https://github.com/hcengineering/platform/issues/2484)) 

## [0.6.52] - 2022-12-22

* 🐛 BUG FIXES: · Categories sorting ([#2459](https://github.com/hcengineering/platform/issues/2459)) · Progress rotation orbit ([#2460](https://github.com/hcengineering/platform/issues/2460)) · ExpandCollapse ([#2463](https://github.com/hcengineering/platform/issues/2463)) · Calendar year view ([#2464](https://github.com/hcengineering/platform/issues/2464)) · Workspace popup position ([#2466](https://github.com/hcengineering/platform/issues/2466)) · Typo ([#2467](https://github.com/hcengineering/platform/issues/2467)) 
* TSK-485: · Calendar Year/Month summary ([#2465](https://github.com/hcengineering/platform/issues/2465)) 

## [0.6.51] - 2022-12-21

* 🚀 FEATURES: · Add list item presenter ([#2449](https://github.com/hcengineering/platform/issues/2449)) · Add missed configs ([#2448](https://github.com/hcengineering/platform/issues/2448)) 
* 🐛 BUG FIXES: · Attachments in drafts ([#2451](https://github.com/hcengineering/platform/issues/2451)) · Workbench switcher ([#2454](https://github.com/hcengineering/platform/issues/2454)) · Create canidate ([#2456](https://github.com/hcengineering/platform/issues/2456)) · Calendar rounding ([#2457](https://github.com/hcengineering/platform/issues/2457)) · Sprints switch url update ([#2458](https://github.com/hcengineering/platform/issues/2458)) 
* ⚙️ MISCELLANEOUS TASKS: · Panel. Fix editors. ([#2450](https://github.com/hcengineering/platform/issues/2450)) 
* TSK-473: · Added tracker layout sanity tests ([#2452](https://github.com/hcengineering/platform/issues/2452)) 

## [0.6.50] - 2022-12-16

* 🚀 FEATURES: · Add copy link button to notification ([#2444](https://github.com/hcengineering/platform/issues/2444)) · Add person selector ([#2447](https://github.com/hcengineering/platform/issues/2447)) 
* TSK-487: · Resume draft stuck in Resume state ([#2443](https://github.com/hcengineering/platform/issues/2443)) 

## [0.6.49] - 2022-12-15

* 🚀 FEATURES: · Add AccordionEditor ([#2431](https://github.com/hcengineering/platform/issues/2431)) · Add object factory for the "TagElement" component ([#2435](https://github.com/hcengineering/platform/issues/2435)) · Add IssueView location subscribe ([#2440](https://github.com/hcengineering/platform/issues/2440)) 
* 🐛 BUG FIXES: · AccordionEditor and UI ([#2436](https://github.com/hcengineering/platform/issues/2436)) · AccordionEditor, ExpandCollapse ([#2438](https://github.com/hcengineering/platform/issues/2438)) · Changed token ([#2439](https://github.com/hcengineering/platform/issues/2439)) 
* ⚙️ MISCELLANEOUS TASKS: · Versions ([#2430](https://github.com/hcengineering/platform/issues/2430)) · Extra requests ([#2429](https://github.com/hcengineering/platform/issues/2429)) 
* TSK-344: · Draft for new Candidate/Person etc ([#2432](https://github.com/hcengineering/platform/issues/2432)) 
* TSK-425: · Supported team settings ([#2406](https://github.com/hcengineering/platform/issues/2406)) 
* TSK-461: · Refactor Tracker/Remember Issues ([#2425](https://github.com/hcengineering/platform/issues/2425)) 

## [0.6.48] - 2022-12-07

* 🐛 BUG FIXES: · HR issues. ([#2418](https://github.com/hcengineering/platform/issues/2418)) · Card layout ([#2420](https://github.com/hcengineering/platform/issues/2420)) · Minor issues ([#2426](https://github.com/hcengineering/platform/issues/2426)) 
* ⚙️ MISCELLANEOUS TASKS: · Popups ([#2421](https://github.com/hcengineering/platform/issues/2421)) 
* TSK-343: · Remember unfinished comment per document ([#2400](https://github.com/hcengineering/platform/issues/2400)) 
* TSK-458: · Create of sub-issue not show Issue created notification ([#2419](https://github.com/hcengineering/platform/issues/2419)) 

## [0.6.47] - 2022-12-02

* 🚀 FEATURES: · Add sortable list ([#2403](https://github.com/hcengineering/platform/issues/2403)) · To use maxWidth with Panel ([#2411](https://github.com/hcengineering/platform/issues/2411)) · Add horizontal view to the sortable list ([#2412](https://github.com/hcengineering/platform/issues/2412)) · Attachments customizations. ([#2414](https://github.com/hcengineering/platform/issues/2414)) 
* 🐛 BUG FIXES: · Activity ([#2415](https://github.com/hcengineering/platform/issues/2415)) 
* ⚙️ MISCELLANEOUS TASKS: · EditDoc layout ([#2402](https://github.com/hcengineering/platform/issues/2402)) 
* TSK-419: · Update workspaces while open menu ([#2413](https://github.com/hcengineering/platform/issues/2413)) 

## [0.6.46] - 2022-11-29

* 🐛 BUG FIXES: · Popup for @ document referencing and Emoji popup ([#2398](https://github.com/hcengineering/platform/issues/2398)) 
* ACTIVITY: · Filters ([#2395](https://github.com/hcengineering/platform/issues/2395)) 

## [0.6.45] - 2022-11-24

* TSK-397: · Fixed time report round ([#2389](https://github.com/hcengineering/platform/issues/2389)) 
* TSK-418: · Added working day option ([#2393](https://github.com/hcengineering/platform/issues/2393)) 
* TSK-421: · Improve Core testing and coverage ([#2387](https://github.com/hcengineering/platform/issues/2387)) 
* TSK-435: · Fix create issue edit focus lost. ([#2396](https://github.com/hcengineering/platform/issues/2396)) 

## [0.6.44] - 2022-11-22

* 🚀 FEATURES: · Add sprint members ([#2392](https://github.com/hcengineering/platform/issues/2392)) 
* HR: · Update Schedule layout. Fix tooltip and popup. ([#2388](https://github.com/hcengineering/platform/issues/2388)) 
* TSK-399: · Allow to delete sprints ([#2386](https://github.com/hcengineering/platform/issues/2386)) 
* TSK-420: · Fixed time report placeholders ([#2390](https://github.com/hcengineering/platform/issues/2390)) 

## [0.6.43] - 2022-11-17

* 🚀 FEATURES: · To create new team ([#2375](https://github.com/hcengineering/platform/issues/2375)) 
* 🐛 BUG FIXES: · Workspace join ([#2383](https://github.com/hcengineering/platform/issues/2383)) · Popups ([#2384](https://github.com/hcengineering/platform/issues/2384)) 

## [0.6.42] - 2022-11-16

* 🐛 BUG FIXES: · Overlapping in List ([#2378](https://github.com/hcengineering/platform/issues/2378)) · Docker container push ([#2379](https://github.com/hcengineering/platform/issues/2379)) · Mongo operator ([#2380](https://github.com/hcengineering/platform/issues/2380)) · Main product ws update ([#2381](https://github.com/hcengineering/platform/issues/2381)) · Separation by productId ([#2382](https://github.com/hcengineering/platform/issues/2382)) 

## [0.6.41] - 2022-11-12

* 🚀 FEATURES: · To report time for sub-issue from main view ([#2358](https://github.com/hcengineering/platform/issues/2358)) · Add close New Issue confirmation dialog ([#2370](https://github.com/hcengineering/platform/issues/2370)) · Add verifications for some test steps ([#2371](https://github.com/hcengineering/platform/issues/2371)) 
* 🐛 BUG FIXES: · Reporting null time ([#2362](https://github.com/hcengineering/platform/issues/2362)) · Table display in Documents application and CreateIssue layout ([#2372](https://github.com/hcengineering/platform/issues/2372)) · Navigation handling ([#2373](https://github.com/hcengineering/platform/issues/2373)) 
* ⚙️ MISCELLANEOUS TASKS: · Workbench ([#2366](https://github.com/hcengineering/platform/issues/2366)) · Contact ([#2369](https://github.com/hcengineering/platform/issues/2369)) 
* TSK-363: · Fixed multiple no sprint category ([#2352](https://github.com/hcengineering/platform/issues/2352)) 
* TSK-364: · Fixed filter updates for collapse issues state ([#2355](https://github.com/hcengineering/platform/issues/2355)) 

## [0.6.40] - 2022-11-02

* 🚀 FEATURES: · Add open parent issue button for a sub-issue edit panel ([#2304](https://github.com/hcengineering/platform/issues/2304)) · Add mobile integration id ([#2328](https://github.com/hcengineering/platform/issues/2328)) · To set a due date for selected issues ([#2336](https://github.com/hcengineering/platform/issues/2336)) 
* 🐛 BUG FIXES: · Copying text to clipboard for Safari · UpDownNavigator ([#2311](https://github.com/hcengineering/platform/issues/2311)) · Kicked accounts could become active after upgrade ([#2314](https://github.com/hcengineering/platform/issues/2314)) · UI: DatePopup, Panel, PDFViewer. Adapting to Firefox. ([#2331](https://github.com/hcengineering/platform/issues/2331)) · 365 ([#2337](https://github.com/hcengineering/platform/issues/2337)) · Reported time date ([#2338](https://github.com/hcengineering/platform/issues/2338)) · Moving selected issues to team ([#2348](https://github.com/hcengineering/platform/issues/2348)) 
* ⚙️ MISCELLANEOUS TASKS: · Double tap and update mobile UI ([#2312](https://github.com/hcengineering/platform/issues/2312)) · Paambaati/codeclimate-action from 3.1.0 to 3.1.1 ([#2316](https://github.com/hcengineering/platform/issues/2316)) · Paambaati/codeclimate-action from 3.1.1 to 3.2.0 ([#2318](https://github.com/hcengineering/platform/issues/2318)) · IssuesList layout ([#2317](https://github.com/hcengineering/platform/issues/2317)) · Notification version ([#2329](https://github.com/hcengineering/platform/issues/2329)) · Versions ([#2334](https://github.com/hcengineering/platform/issues/2334)) 
* TSK-212: · Add notification on issue created ([#2325](https://github.com/hcengineering/platform/issues/2325)) 
* TSK-342: · Add resume issue function ([#2332](https://github.com/hcengineering/platform/issues/2332)) 

## [0.6.39] - 2022-10-17

* 🚀 FEATURES: · Add task number field for the fulltext elastic search ([#2291](https://github.com/hcengineering/platform/issues/2291)) · Add lang UT ([#2297](https://github.com/hcengineering/platform/issues/2297)) 
* 🐛 BUG FIXES: · Displaying report time in different places ([#2290](https://github.com/hcengineering/platform/issues/2290)) · UI for mobile ([#2293](https://github.com/hcengineering/platform/issues/2293)) · Core intl ([#2301](https://github.com/hcengineering/platform/issues/2301)) · Jumping Scroller ([#2305](https://github.com/hcengineering/platform/issues/2305)) 
* ⚙️ MISCELLANEOUS TASKS: · Unnecessary '?? 0' statement · LoginApp UI for mobile ([#2298](https://github.com/hcengineering/platform/issues/2298)) · Login. Fix warnings. ([#2300](https://github.com/hcengineering/platform/issues/2300)) · And publish new versions ([#2306](https://github.com/hcengineering/platform/issues/2306)) · Paambaati/codeclimate-action from 3.0.0 to 3.1.0 ([#2307](https://github.com/hcengineering/platform/issues/2307)) 

## [0.6.38] - 2022-10-06

* 🐛 BUG FIXES: · Estimation hour floor ([#2282](https://github.com/hcengineering/platform/issues/2282)) · Clipboard write for Safari ([#2283](https://github.com/hcengineering/platform/issues/2283)) · Process issues ([#2285](https://github.com/hcengineering/platform/issues/2285)) · Bug with wrong filtering by doneState in Applications · Process issues ([#2287](https://github.com/hcengineering/platform/issues/2287)) 

## [0.6.37] - 2022-09-22

* 🚀 FEATURES: · To specify project to sprints ([#2275](https://github.com/hcengineering/platform/issues/2275)) 
* 🐛 BUG FIXES: · Image preview ([#2276](https://github.com/hcengineering/platform/issues/2276)) 
* ⚙️ MISCELLANEOUS TASKS: · Scroller: add horizontal scroll ([#2271](https://github.com/hcengineering/platform/issues/2271)) 

## [0.6.36] - 2022-09-16

* 🐛 BUG FIXES: · Join redirect ([#2266](https://github.com/hcengineering/platform/issues/2266)) · UI. Update Scroller. ([#2270](https://github.com/hcengineering/platform/issues/2270)) 

## [0.6.35] - 2022-08-30

* 🚀 FEATURES: · To create organizations from CSV ([#2260](https://github.com/hcengineering/platform/issues/2260)) 
* 🐛 BUG FIXES: · Browser notification ([#2261](https://github.com/hcengineering/platform/issues/2261)) 
* ⚙️ MISCELLANEOUS TASKS: · Supercharge/mongodb-github-action from 1.7.0 to 1.8.0 ([#2264](https://github.com/hcengineering/platform/issues/2264)) 

## [0.6.34] - 2022-08-25

* 🐛 BUG FIXES: · MongoDB lookup ([#2257](https://github.com/hcengineering/platform/issues/2257)) · Event source ([#2258](https://github.com/hcengineering/platform/issues/2258)) 
* TRACKER: · Enlarged headers ([#2259](https://github.com/hcengineering/platform/issues/2259)) 

## [0.6.33c] - 2022-08-23

* 🐛 BUG FIXES: · Estimation issues ([#2256](https://github.com/hcengineering/platform/issues/2256)) 

## [0.6.33a] - 2022-08-22

* HR: · When hovering over a cell, the day is highlighted. ([#2253](https://github.com/hcengineering/platform/issues/2253)) 

## [0.6.33] - 2022-08-16

* 🐛 BUG FIXES: · Schedule total ([#2250](https://github.com/hcengineering/platform/issues/2250)) 

## [0.6.32] - 2022-08-05

* 🚀 FEATURES: · Kanban filter ([#2243](https://github.com/hcengineering/platform/issues/2243)) · Mixin Add/Edit/Delete operations ([#2247](https://github.com/hcengineering/platform/issues/2247)) 
* 🐛 BUG FIXES: · Loading empy tracker kanban ([#2244](https://github.com/hcengineering/platform/issues/2244)) 

## [0.6.31a] - 2022-07-20

* 🐛 BUG FIXES: · HR statistics ([#2242](https://github.com/hcengineering/platform/issues/2242)) 

## [0.6.31] - 2022-07-19

* 🚀 FEATURES: · Add extra backup elastic logging ([#2236](https://github.com/hcengineering/platform/issues/2236)) · Add none filter ([#2238](https://github.com/hcengineering/platform/issues/2238)) · HR statistics ([#2240](https://github.com/hcengineering/platform/issues/2240)) 
* 🐛 BUG FIXES: · Schedule timezone ([#2234](https://github.com/hcengineering/platform/issues/2234)) · Password bugs ([#2235](https://github.com/hcengineering/platform/issues/2235)) · Mixin query ([#2239](https://github.com/hcengineering/platform/issues/2239)) · TSK-294 Allow to Bulk operations over enums ([#2241](https://github.com/hcengineering/platform/issues/2241)) 
* TSK-268: · Supported expandable for issue list ([#2222](https://github.com/hcengineering/platform/issues/2222)) 

## [0.6.30c] - 2022-07-10

* TRACKER: · Fix issue status colors in the kanban view ([#2231](https://github.com/hcengineering/platform/issues/2231)) · Refactor ViewOptions ([#2228](https://github.com/hcengineering/platform/issues/2228)) 

## [0.6.30b] - 2022-07-07

* 🚀 FEATURES: · Edit employee for owner ([#2210](https://github.com/hcengineering/platform/issues/2210)) · Deactivate employee without account ([#2225](https://github.com/hcengineering/platform/issues/2225)) 
* 🐛 BUG FIXES: · Few issues ([#2216](https://github.com/hcengineering/platform/issues/2216)) · Assignee deselect in the "New Issue" dialog ([#2223](https://github.com/hcengineering/platform/issues/2223)) · Assignee / lead presenters ([#2226](https://github.com/hcengineering/platform/issues/2226)) 
* ⚙️ MISCELLANEOUS TASKS: · Comments ([#2207](https://github.com/hcengineering/platform/issues/2207)) · Completed and canceled issues from the list ([#2213](https://github.com/hcengineering/platform/issues/2213)) · Issue status colors ([#2218](https://github.com/hcengineering/platform/issues/2218)) 
* BOARD: · Fix show popup actions ([#2211](https://github.com/hcengineering/platform/issues/2211)) 
* TRACKER: · Fix colors for issue status icons ([#2203](https://github.com/hcengineering/platform/issues/2203)) · Fix kanban query ([#2204](https://github.com/hcengineering/platform/issues/2204)) · Updated status icons ([#2215](https://github.com/hcengineering/platform/issues/2215)) · Labels on the card. ([#2221](https://github.com/hcengineering/platform/issues/2221)) · Hide inbox / views ([#2224](https://github.com/hcengineering/platform/issues/2224)) 

## [0.6.30a] - 2022-07-04

* 🐛 BUG FIXES: · Few issues ([#2196](https://github.com/hcengineering/platform/issues/2196)) · Tooltips ([#2197](https://github.com/hcengineering/platform/issues/2197)) · MyIssues ([#2195](https://github.com/hcengineering/platform/issues/2195)) · Checkboxes ([#2198](https://github.com/hcengineering/platform/issues/2198)) · "SetParent", "Add sub-issue" and "Set Due date" actions ([#2185](https://github.com/hcengineering/platform/issues/2185)) · AllIssues naming ([#2200](https://github.com/hcengineering/platform/issues/2200)) 
* HR: · Update schedule layout ([#2202](https://github.com/hcengineering/platform/issues/2202)) 
* USERBOX: · Clean up selected for user box on value change ([#2199](https://github.com/hcengineering/platform/issues/2199)) 

## [0.6.30] - 2022-07-02

* 🚀 FEATURES: · Add editor for Funnel ([#2140](https://github.com/hcengineering/platform/issues/2140)) · Add move action ([#2164](https://github.com/hcengineering/platform/issues/2164)) · Channels table sort ([#2168](https://github.com/hcengineering/platform/issues/2168)) · Create employee ([#2179](https://github.com/hcengineering/platform/issues/2179)) · To do departament d&d ([#2194](https://github.com/hcengineering/platform/issues/2194)) 
* 🐛 BUG FIXES: · Add Label ([#2163](https://github.com/hcengineering/platform/issues/2163)) · Issues TSK-220, TSK-221 ([#2170](https://github.com/hcengineering/platform/issues/2170)) · TSK-241 ([#2182](https://github.com/hcengineering/platform/issues/2182)) · Product filters ([#2192](https://github.com/hcengineering/platform/issues/2192)) · Role migration, remove extra rosamunds ([#2190](https://github.com/hcengineering/platform/issues/2190)) 
* ⚙️ MISCELLANEOUS TASKS: · Account menu. Remove Tooltip. ([#2189](https://github.com/hcengineering/platform/issues/2189)) · Deps ([#2186](https://github.com/hcengineering/platform/issues/2186)) 
* AUTOMATION: · Disable UI ([#2158](https://github.com/hcengineering/platform/issues/2158)) 
* BOARD: · Remove server plugin ([#2159](https://github.com/hcengineering/platform/issues/2159)) 
* EDITBOX: · Fixed size calculation ([#2181](https://github.com/hcengineering/platform/issues/2181)) 
* HR: · Update values on blur ([#2161](https://github.com/hcengineering/platform/issues/2161)) 
* TRACKER: · Fix extra refresh ([#2160](https://github.com/hcengineering/platform/issues/2160)) · Add relation ([#2174](https://github.com/hcengineering/platform/issues/2174)) · Workflow statuses ([#2171](https://github.com/hcengineering/platform/issues/2171)) · Add issues up/down navigator ([#2188](https://github.com/hcengineering/platform/issues/2188)) 

## [0.6.29b] - 2022-06-27

* 🐛 BUG FIXES: · TSK-203 ([#2152](https://github.com/hcengineering/platform/issues/2152)) 
* CHUNTER: · Open message links without reload ([#2124](https://github.com/hcengineering/platform/issues/2124)) 

## [0.6.29a] - 2022-06-27

* 🐛 BUG FIXES: · Release issues ([#2146](https://github.com/hcengineering/platform/issues/2146)) · TSK-160 ([#2148](https://github.com/hcengineering/platform/issues/2148)) · Mixin lookup ([#2149](https://github.com/hcengineering/platform/issues/2149)) · Tasklist presenation ([#2147](https://github.com/hcengineering/platform/issues/2147)) 
* TRACKER: · Parent issues name ([#2136](https://github.com/hcengineering/platform/issues/2136)) · Sync project with parent ([#2137](https://github.com/hcengineering/platform/issues/2137)) 

## [0.6.29] - 2022-06-25

* 🚀 FEATURES: · Add priority filter ([#2114](https://github.com/hcengineering/platform/issues/2114)) · Add MyIssues ([#2128](https://github.com/hcengineering/platform/issues/2128)) · Add objectTitle mixin ([#2144](https://github.com/hcengineering/platform/issues/2144)) 
* 🐛 BUG FIXES: · Release notes and new csv import ([#2116](https://github.com/hcengineering/platform/issues/2116)) · Popups. Increased image size of the assignee. ([#2117](https://github.com/hcengineering/platform/issues/2117)) · Components. ([#2122](https://github.com/hcengineering/platform/issues/2122)) · PriorityPresenter ([#2121](https://github.com/hcengineering/platform/issues/2121)) · "$lookup" when changing "attachedTo" ([#2113](https://github.com/hcengineering/platform/issues/2113)) · Actions ([#2132](https://github.com/hcengineering/platform/issues/2132)) 
* ⚙️ MISCELLANEOUS TASKS: · Window title ([#2138](https://github.com/hcengineering/platform/issues/2138)) 
* ACTIVITY: · Fix comments display ([#2143](https://github.com/hcengineering/platform/issues/2143)) 
* AUTOMATION: · Initial support ([#2134](https://github.com/hcengineering/platform/issues/2134)) 
* TRACKER: · Issues search ([#2129](https://github.com/hcengineering/platform/issues/2129)) · Introduce Roadmap ([#2139](https://github.com/hcengineering/platform/issues/2139)) 
* UI: · Refactor ([#2127](https://github.com/hcengineering/platform/issues/2127)) 

## [0.6.28] - 2022-06-20

* 🚀 FEATURES: · Add Labels support ([#2104](https://github.com/hcengineering/platform/issues/2104)) 
* 🐛 BUG FIXES: · TSK-152 ([#2110](https://github.com/hcengineering/platform/issues/2110)) 
* ⚙️ MISCELLANEOUS TASKS: · Project editor from sub-issues list ([#2108](https://github.com/hcengineering/platform/issues/2108)) · Issues layout ([#2107](https://github.com/hcengineering/platform/issues/2107)) 
* BOARD: · Fix header ([#2098](https://github.com/hcengineering/platform/issues/2098)) 
* CHUNTER: · Copy link to message ([#2078](https://github.com/hcengineering/platform/issues/2078)) 
* TRACKER: · Fix status editor ([#2097](https://github.com/hcengineering/platform/issues/2097)) 

## [0.6.27b] - 2022-06-17

* 🚀 FEATURES: · Add remember active viewlet ([#2094](https://github.com/hcengineering/platform/issues/2094)) · Add trigger for updating sub-issues project ([#2079](https://github.com/hcengineering/platform/issues/2079)) 

## [0.6.27a] - 2022-06-16

* 🚀 FEATURES: · Add Submenu component. Update tooltip, Menu. ([#2088](https://github.com/hcengineering/platform/issues/2088)) 
* 🐛 BUG FIXES: · Release notes ([#2086](https://github.com/hcengineering/platform/issues/2086)) · Tracker board card ([#2090](https://github.com/hcengineering/platform/issues/2090)) 

## [0.6.27] - 2022-06-15

* 🚀 FEATURES: · Add kanban view ([#2071](https://github.com/hcengineering/platform/issues/2071)) · Enum value to be used in filters ([#2085](https://github.com/hcengineering/platform/issues/2085)) · Add board to Active/Backlog ([#2084](https://github.com/hcengineering/platform/issues/2084)) 
* 🐛 BUG FIXES: · Main build ([#2065](https://github.com/hcengineering/platform/issues/2065)) · TSK-9 ([#2066](https://github.com/hcengineering/platform/issues/2066)) · TSK-101 navigation ([#2068](https://github.com/hcengineering/platform/issues/2068)) · TSK-104 Create Candidate hang ([#2072](https://github.com/hcengineering/platform/issues/2072)) 
* CHUNTER: · Add button for link formatting ([#2063](https://github.com/hcengineering/platform/issues/2063)) 
* TSK-112: · Fix workbench switch ([#2074](https://github.com/hcengineering/platform/issues/2074)) 
* TSK-81: · Disable State delete action ([#2076](https://github.com/hcengineering/platform/issues/2076)) 
* TAGS: · Fix collection editor ([#2080](https://github.com/hcengineering/platform/issues/2080)) · Add inline editor ([#2081](https://github.com/hcengineering/platform/issues/2081)) 
* TRACKER: · Add priority to sub-issues ([#2054](https://github.com/hcengineering/platform/issues/2054)) 

## [0.6.26a] - 2022-06-14

* 🐛 BUG FIXES: · Release notes for 0.6.26 ([#2061](https://github.com/hcengineering/platform/issues/2061)) 
* ⚙️ MISCELLANEOUS TASKS: · Icons. ([#2064](https://github.com/hcengineering/platform/issues/2064)) 

## [0.6.26] - 2022-06-10

* 🚀 FEATURES: · Add issue-id to sub-issue list ([#2035](https://github.com/hcengineering/platform/issues/2035)) · Add support for basic checkboxes in text ([#2019](https://github.com/hcengineering/platform/issues/2019)) · Add ui tests for sub-issue creation ([#2053](https://github.com/hcengineering/platform/issues/2053)) · Add project status test ([#2056](https://github.com/hcengineering/platform/issues/2056)) 
* 🐛 BUG FIXES: · Changelog ([#2040](https://github.com/hcengineering/platform/issues/2040)) · Board status order ([#2042](https://github.com/hcengineering/platform/issues/2042)) · Project status ([#2044](https://github.com/hcengineering/platform/issues/2044)) · Date format ([#2049](https://github.com/hcengineering/platform/issues/2049)) · TSK-96 ([#2052](https://github.com/hcengineering/platform/issues/2052)) · Task Description in Activity ([#2059](https://github.com/hcengineering/platform/issues/2059)) 
* ⚙️ MISCELLANEOUS TASKS: · Sub-issue rank when attaching to another issue ([#2055](https://github.com/hcengineering/platform/issues/2055)) · Viewoptions layout. ([#2050](https://github.com/hcengineering/platform/issues/2050)) 
* BOARD: · Fix tags/labels for board table view ([#2045](https://github.com/hcengineering/platform/issues/2045)) · Fix attribute views for tags ([#2046](https://github.com/hcengineering/platform/issues/2046)) · Update popups style ([#2043](https://github.com/hcengineering/platform/issues/2043)) · Add labels view ([#2047](https://github.com/hcengineering/platform/issues/2047)) 

## [0.6.25] - 2022-06-08

* 🚀 FEATURES: · Add "Editable" mixin to "Issue" class (TSK-19) ([#2021](https://github.com/hcengineering/platform/issues/2021)) · Add context menu to the sub-issues list ([#2029](https://github.com/hcengineering/platform/issues/2029)) 
* 🐛 BUG FIXES: · Filter section missing attribute ([#2030](https://github.com/hcengineering/platform/issues/2030)) · Members in Review/Board etc. ([#2036](https://github.com/hcengineering/platform/issues/2036)) · IssueStatus order ([#2038](https://github.com/hcengineering/platform/issues/2038)) · Tracker projects layout ([#2039](https://github.com/hcengineering/platform/issues/2039)) 
* ⚙️ MISCELLANEOUS TASKS: · Changelog ([#2020](https://github.com/hcengineering/platform/issues/2020)) 
* TRACKER: · Added Projects to the card ([#2023](https://github.com/hcengineering/platform/issues/2023)) · Updating cards in Kanban ([#2032](https://github.com/hcengineering/platform/issues/2032)) · Add "Show Sub-issues" toggle into issue list ([#2033](https://github.com/hcengineering/platform/issues/2033)) 

## [0.6.24] - 2022-06-07

* 🚀 FEATURES: · Add "Create Sub-issue" component ([#2004](https://github.com/hcengineering/platform/issues/2004)) 
* 🐛 BUG FIXES: · Live query ([#2017](https://github.com/hcengineering/platform/issues/2017)) 
* ⚙️ MISCELLANEOUS TASKS: · Tracker board layout. Removed context menu. ([#2016](https://github.com/hcengineering/platform/issues/2016)) · Build cache for rush actions ([#2018](https://github.com/hcengineering/platform/issues/2018)) 
* PANEL: · Remove full size. Fix popup. ([#2007](https://github.com/hcengineering/platform/issues/2007)) 
* TRACKER: · Add project issue list view ([#2012](https://github.com/hcengineering/platform/issues/2012)) 

## [0.6.23] - 2022-06-03

* 🚀 FEATURES: · To define table columns order ([#1959](https://github.com/hcengineering/platform/issues/1959)) · Add project selector ([#1973](https://github.com/hcengineering/platform/issues/1973)) · Add TabList component. Update StatesBar layout. Fix Scroller. ([#1980](https://github.com/hcengineering/platform/issues/1980)) · Add Contact info presenter ([#1985](https://github.com/hcengineering/platform/issues/1985)) · Add recruit contact info ut ([#1987](https://github.com/hcengineering/platform/issues/1987)) 
* 🐛 BUG FIXES: · Checkboxes ([#1923](https://github.com/hcengineering/platform/issues/1923)) · Scrollbar and icons. Contact: Add Open integration. ([#1956](https://github.com/hcengineering/platform/issues/1956)) · Console error · Tags popup and Applicant Labels ([#1958](https://github.com/hcengineering/platform/issues/1958)) · Jump to date ([#1970](https://github.com/hcengineering/platform/issues/1970)) · Build check ([#1981](https://github.com/hcengineering/platform/issues/1981)) · Checklist ([#1979](https://github.com/hcengineering/platform/issues/1979)) · Activity ([#1998](https://github.com/hcengineering/platform/issues/1998)) · #1947 ([#1993](https://github.com/hcengineering/platform/issues/1993)) · Derived delete from collection ([#2002](https://github.com/hcengineering/platform/issues/2002)) · Build cache ([#1996](https://github.com/hcengineering/platform/issues/1996)) · Webpack errors ([#2006](https://github.com/hcengineering/platform/issues/2006)) 
* ⚙️ MISCELLANEOUS TASKS: · Heft ([#1974](https://github.com/hcengineering/platform/issues/1974)) · Minimist from 1.2.5 to 1.2.6 in /cloud/app ([#1976](https://github.com/hcengineering/platform/issues/1976)) 
* BOARD: · Update server-plugin for task to subscribe to updates on create & update ([#1925](https://github.com/hcengineering/platform/issues/1925)) 
* FLITERBAR: · Remove save button ([#1937](https://github.com/hcengineering/platform/issues/1937)) 
* SCROLLER: · Added autohide. Fixed track height when displaying table and colors. ([#1964](https://github.com/hcengineering/platform/issues/1964)) 
* TRACKER: · Change "Issue" type to "AttachedDoc" ([#1875](https://github.com/hcengineering/platform/issues/1875)) · Add Sub-issues list ([#1989](https://github.com/hcengineering/platform/issues/1989)) · Fix console errors in the Issue Editor ([#2001](https://github.com/hcengineering/platform/issues/2001)) 

## [0.6.22] - 2022-05-29

* 🚀 FEATURES: · Add icons to class settings ([#1903](https://github.com/hcengineering/platform/issues/1903)) 
* 🐛 BUG FIXES: · Match elastic orde ([#1871](https://github.com/hcengineering/platform/issues/1871)) · "Copy to clipboard" title ([#1876](https://github.com/hcengineering/platform/issues/1876)) ([#1877](https://github.com/hcengineering/platform/issues/1877)) · Popup, Loading, DateRange animation ([#1893](https://github.com/hcengineering/platform/issues/1893)) · Skills target and application labels ([#1896](https://github.com/hcengineering/platform/issues/1896)) · Add tag popup ([#1885](https://github.com/hcengineering/platform/issues/1885)) · Attachments popup ([#1899](https://github.com/hcengineering/platform/issues/1899)) · Vacancy Archive item presenting ([#1901](https://github.com/hcengineering/platform/issues/1901)) · Edit Vacancy attributes ([#1900](https://github.com/hcengineering/platform/issues/1900)) 
* ⚙️ MISCELLANEOUS TASKS: · Popups layouts ([#1864](https://github.com/hcengineering/platform/issues/1864)) · Reminders layout ([#1874](https://github.com/hcengineering/platform/issues/1874)) · Glitch ([#1902](https://github.com/hcengineering/platform/issues/1902)) 
* BOARD: · Update actions ([#1859](https://github.com/hcengineering/platform/issues/1859)) · Fix cover presenter ([#1872](https://github.com/hcengineering/platform/issues/1872)) · Checklist item dnd support ([#1873](https://github.com/hcengineering/platform/issues/1873)) 
* HR: · Issue fixes ([#1891](https://github.com/hcengineering/platform/issues/1891)) 
* TRACKER: · Add "Parent Issue" control to the "Edit Issue" dialog ([#1857](https://github.com/hcengineering/platform/issues/1857)) 

## [0.6.21] - 2022-05-24

* 🚀 FEATURES: · Add custom fields ([#1844](https://github.com/hcengineering/platform/issues/1844)) · Add CardCover type ([#1856](https://github.com/hcengineering/platform/issues/1856)) · To rebuild elastic for all workspaces ([#1862](https://github.com/hcengineering/platform/issues/1862)) 
* 🐛 BUG FIXES: · Cover context menu action ([#1860](https://github.com/hcengineering/platform/issues/1860)) 
* ⚙️ MISCELLANEOUS TASKS: · Filters layout ([#1847](https://github.com/hcengineering/platform/issues/1847)) 
* CONTACTS: · Type Filter ([#1855](https://github.com/hcengineering/platform/issues/1855)) 

## [0.6.20] - 2022-05-23

* 🚀 FEATURES: · Add dialog for selecting a parent issue  ([#1817](https://github.com/hcengineering/platform/issues/1817)) 
* 🐛 BUG FIXES: · ChannelsEditor ([#1833](https://github.com/hcengineering/platform/issues/1833)) 
* BOARD: · Update card ([#1826](https://github.com/hcengineering/platform/issues/1826)) 

## [0.6.19] - 2022-05-22

* 🚀 FEATURES: · Add confirmation to delete a checklist ([#1775](https://github.com/hcengineering/platform/issues/1775)) · Add checklist dueTo ([#1796](https://github.com/hcengineering/platform/issues/1796)) · Add KanbanCard description icon ([#1814](https://github.com/hcengineering/platform/issues/1814)) 
* 🐛 BUG FIXES: · Channel editor focus ([#1769](https://github.com/hcengineering/platform/issues/1769)) · Invite link ([#1781](https://github.com/hcengineering/platform/issues/1781)) · Title ([#1800](https://github.com/hcengineering/platform/issues/1800)) · Board preference ([#1807](https://github.com/hcengineering/platform/issues/1807)) · Activity text-overflow. ([#1811](https://github.com/hcengineering/platform/issues/1811)) · Labels activity ([#1819](https://github.com/hcengineering/platform/issues/1819)) · Number and string editors. Update attributes header. ([#1823](https://github.com/hcengineering/platform/issues/1823)) 
* ⚙️ MISCELLANEOUS TASKS: · EditStatuses, PDFViewer. Add full size for Panel. ([#1797](https://github.com/hcengineering/platform/issues/1797)) · Context menu in the "CreateIssue" dialog ([#1799](https://github.com/hcengineering/platform/issues/1799)) · ReferenceInput layout ([#1821](https://github.com/hcengineering/platform/issues/1821)) 
* BOARD: · Add TableView ([#1760](https://github.com/hcengineering/platform/issues/1760)) · Use Standard actions ([#1766](https://github.com/hcengineering/platform/issues/1766)) · Add checklists info ([#1772](https://github.com/hcengineering/platform/issues/1772)) · Add checklist assignee ([#1778](https://github.com/hcengineering/platform/issues/1778)) · Add convert checklist to card action ([#1805](https://github.com/hcengineering/platform/issues/1805)) 
* CHUNTER: · Convert direct message to private channel ([#1752](https://github.com/hcengineering/platform/issues/1752)) · Open dm on creation if already exists ([#1773](https://github.com/hcengineering/platform/issues/1773)) · Formatting ([#1804](https://github.com/hcengineering/platform/issues/1804)) 
* EDITISSUE: · Fix "Due date" button style. ([#1824](https://github.com/hcengineering/platform/issues/1824)) 
* HR: · Fixes to Vacancy/Application creation ([#1753](https://github.com/hcengineering/platform/issues/1753)) 
* TELEGRAM: · Latest messages below. Update AttachmentPreview layout. ([#1768](https://github.com/hcengineering/platform/issues/1768)) 
* TRACKER: · Project - Project selector ([#1740](https://github.com/hcengineering/platform/issues/1740)) · Split "edit issue" dialog to preview / edit ([#1731](https://github.com/hcengineering/platform/issues/1731)) · Project - Editors ([#1779](https://github.com/hcengineering/platform/issues/1779)) · Project - Project status buttons ([#1793](https://github.com/hcengineering/platform/issues/1793)) · Add context menu to the "EditIssue" dialog ([#1788](https://github.com/hcengineering/platform/issues/1788)) · "Edit Issue" dialog adjustments ([#1810](https://github.com/hcengineering/platform/issues/1810)) 

## [0.6.18] - 2022-05-15

* 🚀 FEATURES: · Add labels mode preference ([#1730](https://github.com/hcengineering/platform/issues/1730)) 
* 🐛 BUG FIXES: · Adding several cards ([#1722](https://github.com/hcengineering/platform/issues/1722)) · White theme. Allow to copy text. Update EditVacancy. ([#1723](https://github.com/hcengineering/platform/issues/1723)) · Members activity ([#1750](https://github.com/hcengineering/platform/issues/1750)) · Channel editor ([#1754](https://github.com/hcengineering/platform/issues/1754)) · Channels editor ([#1756](https://github.com/hcengineering/platform/issues/1756)) · Activity layout. ([#1757](https://github.com/hcengineering/platform/issues/1757)) 
* ⚙️ MISCELLANEOUS TASKS: · Review Category ([#1727](https://github.com/hcengineering/platform/issues/1727)) · EditChannel panel, Attributes ([#1735](https://github.com/hcengineering/platform/issues/1735)) 
* BOARD: · Initial checklist support ([#1672](https://github.com/hcengineering/platform/issues/1672)) · Refactor AddPanel with TextAreaEditor ([#1720](https://github.com/hcengineering/platform/issues/1720)) · Fix copy from message · Fix push/pull activity ([#1718](https://github.com/hcengineering/platform/issues/1718)) 
* CHUNTER: · User status ([#1608](https://github.com/hcengineering/platform/issues/1608)) ([#1692](https://github.com/hcengineering/platform/issues/1692)) 
* TRACKER: · Issue filters - additional features ([#1708](https://github.com/hcengineering/platform/issues/1708)) 

## [0.6.17] - 2022-05-11

* 🚀 FEATURES: · Add TextAreaEditor ([#1694](https://github.com/hcengineering/platform/issues/1694)) 
* 🐛 BUG FIXES: · Few issues ([#1705](https://github.com/hcengineering/platform/issues/1705)) · Card label layout ([#1707](https://github.com/hcengineering/platform/issues/1707)) 
* ⚙️ MISCELLANEOUS TASKS: · Show Activity button. Login button size. ([#1706](https://github.com/hcengineering/platform/issues/1706)) 

## [0.6.16] - 2022-05-08

* 🚀 FEATURES: · Add CardCover ([#1652](https://github.com/hcengineering/platform/issues/1652)) · Add KanbanCard cover ([#1688](https://github.com/hcengineering/platform/issues/1688)) · To create customer for Organization ([#1696](https://github.com/hcengineering/platform/issues/1696)) 
* 🐛 BUG FIXES: · Board menu button ([#1693](https://github.com/hcengineering/platform/issues/1693)) 
* ⚙️ MISCELLANEOUS TASKS: · Docker/login-action from 1 to 2 ([#1665](https://github.com/hcengineering/platform/issues/1665)) · Tags version and migrations other fix ([#1687](https://github.com/hcengineering/platform/issues/1687)) 

## [0.6.15] - 2022-05-05

* 🚀 FEATURES: · Mongo lookup pipeline ([#1557](https://github.com/hcengineering/platform/issues/1557)) · Add OnLabelDelete trigger ([#1576](https://github.com/hcengineering/platform/issues/1576)) · Add BoardMenu ([#1592](https://github.com/hcengineering/platform/issues/1592)) · Ci mismatching dependencies check ([#1616](https://github.com/hcengineering/platform/issues/1616)) · Add board activity ([#1613](https://github.com/hcengineering/platform/issues/1613)) · Add list watch ([#1637](https://github.com/hcengineering/platform/issues/1637)) 
* 🐛 BUG FIXES: · Vacancies search blinking ([#1566](https://github.com/hcengineering/platform/issues/1566)) · Skill reference delete ([#1577](https://github.com/hcengineering/platform/issues/1577)) · Activity merge collapse ([#1600](https://github.com/hcengineering/platform/issues/1600)) · Formatting issues ([#1617](https://github.com/hcengineering/platform/issues/1617)) · Z-index ([#1624](https://github.com/hcengineering/platform/issues/1624)) · Query clone respect mixins ([#1631](https://github.com/hcengineering/platform/issues/1631)) · Activity view for "No Priority" option ([#1641](https://github.com/hcengineering/platform/issues/1641)) · Actions popup for Issues List ([#1638](https://github.com/hcengineering/platform/issues/1638)) · Skills category is empty ([#1647](https://github.com/hcengineering/platform/issues/1647)) · Lead padding and add switch application ([#1649](https://github.com/hcengineering/platform/issues/1649)) · 1630. UI fixes. ([#1651](https://github.com/hcengineering/platform/issues/1651)) · Kanban scrollInto ([#1663](https://github.com/hcengineering/platform/issues/1663)) · UI for adding attributes ([#1660](https://github.com/hcengineering/platform/issues/1660)) 
* ⚙️ MISCELLANEOUS TASKS: · Panel layout. ([#1591](https://github.com/hcengineering/platform/issues/1591)) · Watch action ([#1619](https://github.com/hcengineering/platform/issues/1619)) · Panel, Telegram, Scroller layouts. ([#1621](https://github.com/hcengineering/platform/issues/1621)) · Telegram and Email layouts. Fix Channels. ([#1639](https://github.com/hcengineering/platform/issues/1639)) 
* BOARD: · Remove stale left panel items ([#1574](https://github.com/hcengineering/platform/issues/1574)) · Fix card members update ([#1620](https://github.com/hcengineering/platform/issues/1620)) · Checklists model adjustments ([#1633](https://github.com/hcengineering/platform/issues/1633)) 
* CHUNTER: · File browser additional fixes ([#1547](https://github.com/hcengineering/platform/issues/1547)) · Download file action ([#1570](https://github.com/hcengineering/platform/issues/1570)) · FileBrowser - add grid view ([#1571](https://github.com/hcengineering/platform/issues/1571)) · FileBrowser - replace px with rem ([#1582](https://github.com/hcengineering/platform/issues/1582)) · Remove attachments only for creator ([#1552](https://github.com/hcengineering/platform/issues/1552)) · Private channel & add channel members ui ([#1524](https://github.com/hcengineering/platform/issues/1524)) ([#1589](https://github.com/hcengineering/platform/issues/1589)) 
* EDITISSUE: · Add due date to the right panel ([#1272](https://github.com/hcengineering/platform/issues/1272)) ([#1642](https://github.com/hcengineering/platform/issues/1642)) 
* TRACKER: · Fix IssuesList selection ([#1578](https://github.com/hcengineering/platform/issues/1578)) · Rewrite AssigneePresenter ([#1568](https://github.com/hcengineering/platform/issues/1568)) · Fix issue status view for "Activity" ([#1632](https://github.com/hcengineering/platform/issues/1632)) · Fix issue priority view for "Activity" ([#1635](https://github.com/hcengineering/platform/issues/1635)) · Issue filters - main functionality ([#1640](https://github.com/hcengineering/platform/issues/1640)) 

## [0.6.14] - 2022-04-26

* 🚀 FEATURES: · Add  action ([#1493](https://github.com/hcengineering/platform/issues/1493)) · Add list archive ([#1537](https://github.com/hcengineering/platform/issues/1537)) · Add right panel to the EditIssue dialog ([#1272](https://github.com/hcengineering/platform/issues/1272)) ([#1546](https://github.com/hcengineering/platform/issues/1546)) 
* 🐛 BUG FIXES: · Saved items header ([#1531](https://github.com/hcengineering/platform/issues/1531)) · Category styles ([#1475](https://github.com/hcengineering/platform/issues/1475)) 
* BOARD: · Add open card inline menu ([#1511](https://github.com/hcengineering/platform/issues/1511)) · Handle labels when move card to another board ([#1538](https://github.com/hcengineering/platform/issues/1538)) · Make context menu consistent ([#1542](https://github.com/hcengineering/platform/issues/1542)) 
* CHUNTER: · Avatars in dm header and highlight on first message ([#1499](https://github.com/hcengineering/platform/issues/1499)) · Saved attachments ([#1515](https://github.com/hcengineering/platform/issues/1515)) 
* TRACKER: · Add keyboard support for issues list ([#1539](https://github.com/hcengineering/platform/issues/1539)) 

## [0.6.13] - 2022-04-24

* 🚀 FEATURES: · Add EditMember popup ([#1448](https://github.com/hcengineering/platform/issues/1448)) · Add ArchiveCard action ([#1456](https://github.com/hcengineering/platform/issues/1456)) · Add AttachmentPresenter ([#1452](https://github.com/hcengineering/platform/issues/1452)) · Add ChannelsDropdown ([#1459](https://github.com/hcengineering/platform/issues/1459)) · Add WatchCard ([#1465](https://github.com/hcengineering/platform/issues/1465)) 
* 🐛 BUG FIXES: · UI bugs ([#1447](https://github.com/hcengineering/platform/issues/1447)) · Lint issues · Typo ([#1463](https://github.com/hcengineering/platform/issues/1463)) · AttachmentPresenter ([#1471](https://github.com/hcengineering/platform/issues/1471)) · Edit event members update ([#1495](https://github.com/hcengineering/platform/issues/1495)) · ModifiedOn collection inner tx ([#1504](https://github.com/hcengineering/platform/issues/1504)) · Linting conflicts ([#1506](https://github.com/hcengineering/platform/issues/1506)) 
* 🚜 REFACTOR: · UsersPopup ([#1428](https://github.com/hcengineering/platform/issues/1428)) 
* ⚡ PERFORMANCE: · Elastic rebuild & minor fix ([#1451](https://github.com/hcengineering/platform/issues/1451)) 
* ⚙️ MISCELLANEOUS TASKS: · ChannelsEditor, ChannelsPresenter. Fix Table. ([#1473](https://github.com/hcengineering/platform/issues/1473)) 
* BOARD: · Add create / edit card label popup · Fix lint issues · Update Date Presenter to reuse as presenter · Fix formatting · Use  /  for card labels update · Use  for join action · Add labels & members & date to Kanban Card ([#1462](https://github.com/hcengineering/platform/issues/1462)) · Fix popup alignments ([#1467](https://github.com/hcengineering/platform/issues/1467)) · Add attachment action ([#1474](https://github.com/hcengineering/platform/issues/1474)) · Extend popup positioning for Kanban card ([#1483](https://github.com/hcengineering/platform/issues/1483)) · Add kanban card edit mode ([#1484](https://github.com/hcengineering/platform/issues/1484)) 
* CHUNTER: · Saved messages ([#1466](https://github.com/hcengineering/platform/issues/1466)) · Direct messages ([#1472](https://github.com/hcengineering/platform/issues/1472)) · File browser ([#1407](https://github.com/hcengineering/platform/issues/1407)) ([#1488](https://github.com/hcengineering/platform/issues/1488)) 
* TRACKER: · View options - Grouping ([#1442](https://github.com/hcengineering/platform/issues/1442)) · Status should be positioned at same offset ([#1464](https://github.com/hcengineering/platform/issues/1464)) · View options - Completed issues period, empty groups display ([#1490](https://github.com/hcengineering/platform/issues/1490)) · Move "IssueStatus" enum into model ([#1449](https://github.com/hcengineering/platform/issues/1449)) 

## [0.6.12] - 2022-04-18

* 🚀 FEATURES: · Add MoveCard action ([#1375](https://github.com/hcengineering/platform/issues/1375)) 
* 🐛 BUG FIXES: · Date ([#1430](https://github.com/hcengineering/platform/issues/1430)) 
* ⚡ PERFORMANCE: · Assets build process ([#1435](https://github.com/hcengineering/platform/issues/1435)) 
* BOARD: · Create board labels ([#1426](https://github.com/hcengineering/platform/issues/1426)) · Add card labels picker popup ([#1434](https://github.com/hcengineering/platform/issues/1434)) 
* CHUNTER: · Archive channel ([#1416](https://github.com/hcengineering/platform/issues/1416)) 

## [0.6.11] - 2022-04-17

* 🚀 FEATURES: · Add additional panel display modes ([#1279](https://github.com/hcengineering/platform/issues/1279)) · Add ".nvmrc" ([#1276](https://github.com/hcengineering/platform/issues/1276)) · Add create new Kanban list panel ([#1299](https://github.com/hcengineering/platform/issues/1299)) · Add depend a bot ([#1326](https://github.com/hcengineering/platform/issues/1326)) · Add `AddMultipleCardsPopup` ([#1374](https://github.com/hcengineering/platform/issues/1374)) · Add attachments live updates · Add Date action ([#1418](https://github.com/hcengineering/platform/issues/1418)) · Add TagsDropdownEditor. Fix layout. ([#1422](https://github.com/hcengineering/platform/issues/1422)) 
* 🐛 BUG FIXES: · Kanban card design ([#1278](https://github.com/hcengineering/platform/issues/1278)) · Broken board ([#1317](https://github.com/hcengineering/platform/issues/1317)) · Colors and Panel layout. Update popups. ([#1346](https://github.com/hcengineering/platform/issues/1346)) · Total ([#1355](https://github.com/hcengineering/platform/issues/1355)) · SelectPopup ([#1400](https://github.com/hcengineering/platform/issues/1400)) · AddAttachment control · Lint formatting · AttachmentDroppable · Attachments spinner · Attachments spinner · Lint issues · Lint issues · Card & file drop issues · Card & file drop issues · Lint issues · Review issues: copyright & logging · Scss formatting · Merge conflicts ([#1409](https://github.com/hcengineering/platform/issues/1409)) 
* ⚙️ MISCELLANEOUS TASKS: · DataPicker layout ([#1309](https://github.com/hcengineering/platform/issues/1309)) · New issue dialog ([#1310](https://github.com/hcengineering/platform/issues/1310)) · DatePicker ([#1337](https://github.com/hcengineering/platform/issues/1337)) · Actions/upload-artifact from 2 to 3 ([#1338](https://github.com/hcengineering/platform/issues/1338)) · Paambaati/codeclimate-action from 2.7.5 to 3.0.0 ([#1339](https://github.com/hcengineering/platform/issues/1339)) · Actions/cache from 2 to 3 ([#1340](https://github.com/hcengineering/platform/issues/1340)) · Supercharge/mongodb-github-action from 1.3.0 to 1.7.0 ([#1341](https://github.com/hcengineering/platform/issues/1341)) · Actions/checkout from 2 to 3 ([#1342](https://github.com/hcengineering/platform/issues/1342)) · UserBox and Button layouts ([#1343](https://github.com/hcengineering/platform/issues/1343)) · Dialogs layout ([#1385](https://github.com/hcengineering/platform/issues/1385)) · Paddings from card-container ([#1386](https://github.com/hcengineering/platform/issues/1386)) · UserBoxList layout. Fix AccountPopup. ([#1397](https://github.com/hcengineering/platform/issues/1397)) · Paddings from card-container · Paddings from card-container · Creations ([#1414](https://github.com/hcengineering/platform/issues/1414)) · White theme ([#1419](https://github.com/hcengineering/platform/issues/1419)) · TagEditor layout ([#1420](https://github.com/hcengineering/platform/issues/1420)) 
* BOARD: · Design card editor (initial) ([#1292](https://github.com/hcengineering/platform/issues/1292)) · 1265: Make Card Actions extensible ([#1319](https://github.com/hcengineering/platform/issues/1319)) · Update board card model ([#1329](https://github.com/hcengineering/platform/issues/1329)) · Add new card actions + Join Card Action example ([#1335](https://github.com/hcengineering/platform/issues/1335)) · Add card details (members, labels, date) ([#1376](https://github.com/hcengineering/platform/issues/1376)) · Add button shape and title props ([#1381](https://github.com/hcengineering/platform/issues/1381)) · Fix card live updates ([#1403](https://github.com/hcengineering/platform/issues/1403)) · Add attachments support · Fix labels model ([#1405](https://github.com/hcengineering/platform/issues/1405)) · Fix infinite loop in Activity component for space update ([#1417](https://github.com/hcengineering/platform/issues/1417)) 
* CHUNTER: · Channel attributes ([#1334](https://github.com/hcengineering/platform/issues/1334)) · Delete message ([#1336](https://github.com/hcengineering/platform/issues/1336)) · Update channel last message and close thread on deletion from other user ([#1389](https://github.com/hcengineering/platform/issues/1389)) · Pin messages ([#1396](https://github.com/hcengineering/platform/issues/1396)) · Attachments table in channel description ([#1402](https://github.com/hcengineering/platform/issues/1402)) · Attachments and format updates ([#1410](https://github.com/hcengineering/platform/issues/1410)) · Show "edited" label and cancel button ([#1411](https://github.com/hcengineering/platform/issues/1411)) 
* TRACKER: · Board view ([#1325](https://github.com/hcengineering/platform/issues/1325)) · Issues list view ([#1313](https://github.com/hcengineering/platform/issues/1313)) · Issue List – Priority presenter ([#1382](https://github.com/hcengineering/platform/issues/1382)) · Improve CheckBox ([#1356](https://github.com/hcengineering/platform/issues/1356)) · Issue List – Status presenter ([#1383](https://github.com/hcengineering/platform/issues/1383)) · Issue List – Assignee presenter ([#1384](https://github.com/hcengineering/platform/issues/1384)) · Issue List - DueDate presenter ([#1393](https://github.com/hcengineering/platform/issues/1393)) 

## [0.6.10] - 2022-04-01

* 🚀 FEATURES: · To find without done state ([#1215](https://github.com/hcengineering/platform/issues/1215)) 
* 🐛 BUG FIXES: · LQ callback when unsubscibe ([#1214](https://github.com/hcengineering/platform/issues/1214)) · Status view and calendar ([#1239](https://github.com/hcengineering/platform/issues/1239)) 
* ⚙️ MISCELLANEOUS TASKS: · Attached docs without collections ([#1209](https://github.com/hcengineering/platform/issues/1209)) · Table view from Applications ([#1216](https://github.com/hcengineering/platform/issues/1216)) · Extra files ([#1217](https://github.com/hcengineering/platform/issues/1217)) · DatePicker, DatePresenter. ([#1221](https://github.com/hcengineering/platform/issues/1221)) · Outdated migrations ([#1236](https://github.com/hcengineering/platform/issues/1236)) 

## [0.6.9] - 2022-03-26

* 🚀 FEATURES: · Elastic query syntax ([#1202](https://github.com/hcengineering/platform/issues/1202)) 
* 🐛 BUG FIXES: · Issue with mention list wrong content ([#1183](https://github.com/hcengineering/platform/issues/1183)) · #1188 Card width ([#1190](https://github.com/hcengineering/platform/issues/1190)) · Exception in #1186 ([#1191](https://github.com/hcengineering/platform/issues/1191)) 

## [0.6.8] - 2022-03-19

* 🐛 BUG FIXES: · Bundle.js wrong caching ([#1137](https://github.com/hcengineering/platform/issues/1137)) · Mis-matching dependencies ([#1152](https://github.com/hcengineering/platform/issues/1152)) · Create review ([#1171](https://github.com/hcengineering/platform/issues/1171)) 
* ⚙️ MISCELLANEOUS TASKS: · The labels of the create button ([#1138](https://github.com/hcengineering/platform/issues/1138)) · DatePicker. Add and update presenters. Fix Activity layout. ([#1162](https://github.com/hcengineering/platform/issues/1162)) 
* UPD: · DataPicker with region selection. Presenters. ([#1153](https://github.com/hcengineering/platform/issues/1153)) 

## [0.6.7] - 2022-03-12

* 🐛 BUG FIXES: · Model version on release ([#1102](https://github.com/hcengineering/platform/issues/1102)) · Login issue ([#1112](https://github.com/hcengineering/platform/issues/1112)) · TxView collections ([#1111](https://github.com/hcengineering/platform/issues/1111)) · Activity for attached documents ([#1115](https://github.com/hcengineering/platform/issues/1115)) · Tooltip. Update PDFViewer layout. ([#1131](https://github.com/hcengineering/platform/issues/1131)) 
* ⚙️ MISCELLANEOUS TASKS: · Comment attachments ([#1106](https://github.com/hcengineering/platform/issues/1106)) 

## [0.6.6] - 2022-03-04

* 🚀 FEATURES: · Collection change display in activity ([#1068](https://github.com/hcengineering/platform/issues/1068)) · To upgrade all workspaces ([#1073](https://github.com/hcengineering/platform/issues/1073)) · To select workspace ([#1094](https://github.com/hcengineering/platform/issues/1094)) 
* 🐛 BUG FIXES: · Rush docker:push ([#1063](https://github.com/hcengineering/platform/issues/1063)) · $lookup mixins ([#1085](https://github.com/hcengineering/platform/issues/1085)) · Svelte icon and title ([#1086](https://github.com/hcengineering/platform/issues/1086)) · Contact info ([#1087](https://github.com/hcengineering/platform/issues/1087)) · Navigator spaces display in case of multiple contributions ([#1097](https://github.com/hcengineering/platform/issues/1097)) 
* ⚙️ MISCELLANEOUS TASKS: · Applications/candidate ([#1074](https://github.com/hcengineering/platform/issues/1074)) · Table layout, combine check and notify cells. Optimize CSS. ([#1075](https://github.com/hcengineering/platform/issues/1075)) 

## [0.6.5] - 2022-02-25

* 🚀 FEATURES: · Hardcoreeng docker hub ([#1048](https://github.com/hcengineering/platform/issues/1048)) 
* 🐛 BUG FIXES: · Elastic restore ([#1038](https://github.com/hcengineering/platform/issues/1038)) · Dev tool container run.sh ([#1051](https://github.com/hcengineering/platform/issues/1051)) · Impossible change person name ([#1053](https://github.com/hcengineering/platform/issues/1053)) · Server secret specification ([#1054](https://github.com/hcengineering/platform/issues/1054)) 
* ⚙️ MISCELLANEOUS TASKS: · Scroller: detect Table. Replace ScrollBox -> Scroller. Replace icon. ([#1047](https://github.com/hcengineering/platform/issues/1047)) · Extra lookup value ([#1058](https://github.com/hcengineering/platform/issues/1058)) 

## [0.6.4] - 2022-02-21

* 🚀 FEATURES: · Change done state ([#888](https://github.com/hcengineering/platform/issues/888)) · To open candidate from vacancy candidate card ([#943](https://github.com/hcengineering/platform/issues/943)) · Add front server bodyparser ([#971](https://github.com/hcengineering/platform/issues/971)) · Linting build phase ([#966](https://github.com/hcengineering/platform/issues/966)) 
* 🐛 BUG FIXES: · Version to be proper value ([#891](https://github.com/hcengineering/platform/issues/891)) · Mixin sorting ([#905](https://github.com/hcengineering/platform/issues/905)) · Facebook placeholder ([#920](https://github.com/hcengineering/platform/issues/920)) · Rekoni url ([#921](https://github.com/hcengineering/platform/issues/921)) · User model updates ([#924](https://github.com/hcengineering/platform/issues/924)) · 900 ([#925](https://github.com/hcengineering/platform/issues/925)) · Current space selection on page load ([#927](https://github.com/hcengineering/platform/issues/927)) · UI. CSS optimization. ([#932](https://github.com/hcengineering/platform/issues/932)) · Close panel on empty fragment ([#938](https://github.com/hcengineering/platform/issues/938)) · Panel hide on escape with popup ([#941](https://github.com/hcengineering/platform/issues/941)) · PDF viewer close with Cross mark ([#942](https://github.com/hcengineering/platform/issues/942)) · #890 ([#948](https://github.com/hcengineering/platform/issues/948)) · Contact info label missing ([#961](https://github.com/hcengineering/platform/issues/961)) · Recruit activity labels ([#962](https://github.com/hcengineering/platform/issues/962)) · Warnings. Update Scroller. ([#965](https://github.com/hcengineering/platform/issues/965)) · Space on app change ([#970](https://github.com/hcengineering/platform/issues/970)) · Collection editors in Safari ([#973](https://github.com/hcengineering/platform/issues/973)) · Back to candidate with history ([#975](https://github.com/hcengineering/platform/issues/975)) · States search ([#978](https://github.com/hcengineering/platform/issues/978)) · Archive special component ([#979](https://github.com/hcengineering/platform/issues/979)) · No collection editor case ([#980](https://github.com/hcengineering/platform/issues/980)) · Navigator extra space issue ([#981](https://github.com/hcengineering/platform/issues/981)) · Webpack build conflicts ([#985](https://github.com/hcengineering/platform/issues/985)) · UI. ([#986](https://github.com/hcengineering/platform/issues/986)) · Resolves · Lint · Query update when refresh ([#1006](https://github.com/hcengineering/platform/issues/1006)) · Time tooltip ([#1016](https://github.com/hcengineering/platform/issues/1016)) · Images display ([#1019](https://github.com/hcengineering/platform/issues/1019)) · LastView tx space ([#1029](https://github.com/hcengineering/platform/issues/1029)) · Build with skillset ([#1037](https://github.com/hcengineering/platform/issues/1037)) 
* ⚡ PERFORMANCE: · Components, dialogs. Fix issues. Update Scroller. ([#945](https://github.com/hcengineering/platform/issues/945)) 
* ⚙️ MISCELLANEOUS TASKS: · MentionList size and position. Added inline display. ([#886](https://github.com/hcengineering/platform/issues/886)) · Setting layouts, popup, icons. ([#897](https://github.com/hcengineering/platform/issues/897)) · Components layout, DoneStatesPopup ([#906](https://github.com/hcengineering/platform/issues/906)) · Layouts, icons. CSS optimize ([#926](https://github.com/hcengineering/platform/issues/926)) · Extra lookups ([#963](https://github.com/hcengineering/platform/issues/963)) · StatesBar layout. Fix StyledTextBox. ([#994](https://github.com/hcengineering/platform/issues/994)) · StatesBar (Safari fix) · Scroller ([#1018](https://github.com/hcengineering/platform/issues/1018)) 

## [0.6.3] - 2022-01-27

* 🚀 FEATURES: · To perform heft --clean on build ([#768](https://github.com/hcengineering/platform/issues/768)) · Add language selector ([#769](https://github.com/hcengineering/platform/issues/769)) · Elastic rebuild ([#804](https://github.com/hcengineering/platform/issues/804)) · TxOperations API ([#809](https://github.com/hcengineering/platform/issues/809)) · To create vacancy for any person ([#815](https://github.com/hcengineering/platform/issues/815)) · Add svelte-check in setting. Fix errors. ([#821](https://github.com/hcengineering/platform/issues/821)) · Add Done state to applications popup 
* 🐛 BUG FIXES: · #758 ([#762](https://github.com/hcengineering/platform/issues/762)) · EditApplication layout for Safari ([#766](https://github.com/hcengineering/platform/issues/766)) · Activity icons ([#788](https://github.com/hcengineering/platform/issues/788)) · Extra transactions during workspace upgrace ([#792](https://github.com/hcengineering/platform/issues/792)) · ([#799](https://github.com/hcengineering/platform/issues/799)) · Errors ([#803](https://github.com/hcengineering/platform/issues/803)) · Query/predicate circular deps ([#811](https://github.com/hcengineering/platform/issues/811)) · Candidate attachedToClass migration and add DoneState to Applicants ([#817](https://github.com/hcengineering/platform/issues/817)) · Lookup options ([#830](https://github.com/hcengineering/platform/issues/830)) · Full text search control behaviour ([#838](https://github.com/hcengineering/platform/issues/838)) · Height statusbar ([#840](https://github.com/hcengineering/platform/issues/840)) · Errors in Task. EditBox placeholder to IntlString. ([#839](https://github.com/hcengineering/platform/issues/839)) · Popup Esc handling ([#855](https://github.com/hcengineering/platform/issues/855)) · Model versioning · Workspace upgrade in restore 
* ⚙️ MISCELLANEOUS TASKS: · EditStatuses layout ([#755](https://github.com/hcengineering/platform/issues/755)) · Scale for Icons ([#757](https://github.com/hcengineering/platform/issues/757)) · Notifications from left navigation menu ([#767](https://github.com/hcengineering/platform/issues/767)) · Flags in language selector ([#774](https://github.com/hcengineering/platform/issues/774)) · Circular dep ([#790](https://github.com/hcengineering/platform/issues/790)) · Docker-compose.yaml ([#791](https://github.com/hcengineering/platform/issues/791)) · And clean icons ([#787](https://github.com/hcengineering/platform/issues/787)) · Previous avatar on uploading new one ([#822](https://github.com/hcengineering/platform/issues/822)) · And combine popup layout for select. Add svelte-check in presentation. ([#845](https://github.com/hcengineering/platform/issues/845)) · Navigator layout. Add Scroller. ([#850](https://github.com/hcengineering/platform/issues/850)) · Mention popup. Add svelte-check. Fix warnings. ([#854](https://github.com/hcengineering/platform/issues/854)) · Panel layout for AttributeBarEditor · 'secret' token usage 

## [0.6.2] - 2021-12-28

* 🚀 FEATURES: · Add columns ([#655](https://github.com/hcengineering/platform/issues/655)) · Add strings in @anticrm/presentation. DoneState centered ([#668](https://github.com/hcengineering/platform/issues/668)) · Add h3 node ([#673](https://github.com/hcengineering/platform/issues/673)) · Add StatusesBar ([#691](https://github.com/hcengineering/platform/issues/691)) · Add hidden property to UXObject ([#731](https://github.com/hcengineering/platform/issues/731)) 
* 🐛 BUG FIXES: · Won/lost state migration ([#633](https://github.com/hcengineering/platform/issues/633)) · Migration ([#650](https://github.com/hcengineering/platform/issues/650)) · Svelte-check in ui ([#663](https://github.com/hcengineering/platform/issues/663)) · Applications display error ([#662](https://github.com/hcengineering/platform/issues/662)) · Header in tables ([#657](https://github.com/hcengineering/platform/issues/657)) · Applicant card open Candidate ([#676](https://github.com/hcengineering/platform/issues/676)) · Lead opening issue ([#685](https://github.com/hcengineering/platform/issues/685)) · Archive table ([#698](https://github.com/hcengineering/platform/issues/698)) · Rebuild-elastic ([#704](https://github.com/hcengineering/platform/issues/704)) · Deps creation in dev env ([#711](https://github.com/hcengineering/platform/issues/711)) · Try to match $search key ([#716](https://github.com/hcengineering/platform/issues/716)) · Actions ([#727](https://github.com/hcengineering/platform/issues/727)) · TooltipInstance horizontal position and other little fixes ([#729](https://github.com/hcengineering/platform/issues/729)) · Chrome Kanban ([#732](https://github.com/hcengineering/platform/issues/732)) · #735 ([#736](https://github.com/hcengineering/platform/issues/736)) 
* ⚙️ MISCELLANEOUS TASKS: · DoneStates of existing kanban cards ([#625](https://github.com/hcengineering/platform/issues/625)) · Cards and dialogs UI. ([#627](https://github.com/hcengineering/platform/issues/627)) · Kanban and Setting layouts ([#651](https://github.com/hcengineering/platform/issues/651)) · Kanban cards layout ([#684](https://github.com/hcengineering/platform/issues/684)) · StatusesBar · Archive icon. Add margins. Update space menu. ([#700](https://github.com/hcengineering/platform/issues/700)) · Dropdown, popups and icons ([#713](https://github.com/hcengineering/platform/issues/713)) · Application layout ([#738](https://github.com/hcengineering/platform/issues/738)) 

## [0.6.1] - 2021-12-14

* 🚀 FEATURES: · Add candidate create presenter ([#340](https://github.com/hcengineering/platform/issues/340)) · To dump workspace ([#403](https://github.com/hcengineering/platform/issues/403)) · Add GitHub channel provider ([#424](https://github.com/hcengineering/platform/issues/424)) · Add Applications and update layout ([#427](https://github.com/hcengineering/platform/issues/427)) · Add attachment strings ([#429](https://github.com/hcengineering/platform/issues/429)) · Add ShowMore ([#445](https://github.com/hcengineering/platform/issues/445)) · ESLint/prettier ([#389](https://github.com/hcengineering/platform/issues/389)) · Add integration disconnect handler ([#460](https://github.com/hcengineering/platform/issues/460)) · Add tg contact if it is required ([#436](https://github.com/hcengineering/platform/issues/436)) · Add clear-telegram-history command ([#497](https://github.com/hcengineering/platform/issues/497)) · Add Task Kanban and States · Add Create application icon, Panel header update ([#504](https://github.com/hcengineering/platform/issues/504)) · Unassign ([#511](https://github.com/hcengineering/platform/issues/511)) · Use client from client-resources from NodeJS ([#545](https://github.com/hcengineering/platform/issues/545)) · Model upgrades ([#561](https://github.com/hcengineering/platform/issues/561)) · Add Move icon ([#620](https://github.com/hcengineering/platform/issues/620)) 
* 🐛 BUG FIXES: · Activity layout ([#351](https://github.com/hcengineering/platform/issues/351)) · Webpack build ([#354](https://github.com/hcengineering/platform/issues/354)) · Activity layout ([#351](https://github.com/hcengineering/platform/issues/351)) ([#352](https://github.com/hcengineering/platform/issues/352)) · Query transactions handling ([#372](https://github.com/hcengineering/platform/issues/372)) · Webpack build · Webpack build client · Few recruiting strings · Channels on:click handler ([#412](https://github.com/hcengineering/platform/issues/412)) · Missing return statement ([#406](https://github.com/hcengineering/platform/issues/406)) · #395 ([#416](https://github.com/hcengineering/platform/issues/416)) · Workspace upgrade ([#426](https://github.com/hcengineering/platform/issues/426)) · Use model.json ([#432](https://github.com/hcengineering/platform/issues/432)) · Devmodel plugin Live Query functionality ([#441](https://github.com/hcengineering/platform/issues/441)) · ShowMore and paddings in Comments ([#461](https://github.com/hcengineering/platform/issues/461)) · Background ShowMore ([#464](https://github.com/hcengineering/platform/issues/464)) · CommentPresenter ([#474](https://github.com/hcengineering/platform/issues/474)) · Hierarchy is extends is not working second time · Workspace create · Kanban display none in rare casers ([#540](https://github.com/hcengineering/platform/issues/540)) · Person presenter in case of unset value ([#548](https://github.com/hcengineering/platform/issues/548)) · Model ([#546](https://github.com/hcengineering/platform/issues/546)) · Crash server on client requests ([#542](https://github.com/hcengineering/platform/issues/542)) · Chunter attachments ([#553](https://github.com/hcengineering/platform/issues/553)) · Task kanban ([#549](https://github.com/hcengineering/platform/issues/549)) · EditCandidate ([#560](https://github.com/hcengineering/platform/issues/560)) · EditBox keep same width if control is reused with different props ([#578](https://github.com/hcengineering/platform/issues/578)) · Proper workspace dump of attachments ([#577](https://github.com/hcengineering/platform/issues/577)) · #575 ([#576](https://github.com/hcengineering/platform/issues/576)) · Preview attachment ([#584](https://github.com/hcengineering/platform/issues/584)) · Tooltip ([#600](https://github.com/hcengineering/platform/issues/600)) · Layouts ([#606](https://github.com/hcengineering/platform/issues/606)) · #608 · Activity layout ([#610](https://github.com/hcengineering/platform/issues/610)) 
* ⚙️ MISCELLANEOUS TASKS: · Channels, Tooltip, CircleButton ([#363](https://github.com/hcengineering/platform/issues/363)) · Bottom border in tables. Clean warinings. ([#379](https://github.com/hcengineering/platform/issues/379)) · Activity layout ([#430](https://github.com/hcengineering/platform/issues/430)) · ShowMore ([#467](https://github.com/hcengineering/platform/issues/467)) · Layout for comments in tooltip ([#471](https://github.com/hcengineering/platform/issues/471)) · StatesPopup layout, fix AttributeBarEditor ([#476](https://github.com/hcengineering/platform/issues/476)) · StatePresenetr ([#475](https://github.com/hcengineering/platform/issues/475)) · Telegram sharing UI as designed ([#503](https://github.com/hcengineering/platform/issues/503)) · EditWithIcon, add clear ([#537](https://github.com/hcengineering/platform/issues/537)) · Telegram, Panel, top bars layouts. Fix vacancy cards and components ([#534](https://github.com/hcengineering/platform/issues/534)) · Doc on state color change ([#558](https://github.com/hcengineering/platform/issues/558)) · Tooltip UI ([#551](https://github.com/hcengineering/platform/issues/551)) · UI, light theme. ([#564](https://github.com/hcengineering/platform/issues/564)) · Chunter:class:Attachment ([#597](https://github.com/hcengineering/platform/issues/597)) · Unused workspace package ([#566](https://github.com/hcengineering/platform/issues/566)) · Upload package ([#565](https://github.com/hcengineering/platform/issues/565)) 

## [0.6.0] - 2021-11-22

* 🚀 FEATURES: · Add Popup component ([#32](https://github.com/hcengineering/platform/issues/32)) · Add ImageButton for upload resume ([#66](https://github.com/hcengineering/platform/issues/66)) · Add CircleButton. New layout for DialogHeader. ([#77](https://github.com/hcengineering/platform/issues/77)) · Add AvatarEditor ([#84](https://github.com/hcengineering/platform/issues/84)) · Add inline component Link ([#98](https://github.com/hcengineering/platform/issues/98)) · Add backgrounds ([#99](https://github.com/hcengineering/platform/issues/99)) · Add mixed backgrounds ([#101](https://github.com/hcengineering/platform/issues/101)) · Add SocialEditor ([#113](https://github.com/hcengineering/platform/issues/113)) · Add maxWidth in EditBox ([#117](https://github.com/hcengineering/platform/issues/117)) · Add social icons ([#120](https://github.com/hcengineering/platform/issues/120)) · Add hovers on social links ([#127](https://github.com/hcengineering/platform/issues/127)) · Add Card component. Fix Popup. ([#135](https://github.com/hcengineering/platform/issues/135)) · Add KanbanView. Move icons. ([#143](https://github.com/hcengineering/platform/issues/143)) · Add dialog PDFViewer ([#156](https://github.com/hcengineering/platform/issues/156)) · Add Panel · Add Search ([#190](https://github.com/hcengineering/platform/issues/190)) · Add YesNo, changed Create Candidate ([#211](https://github.com/hcengineering/platform/issues/211)) · Add AttributesBar, YesNoPresenter ([#230](https://github.com/hcengineering/platform/issues/230)) · Add AttributeEditor ([#231](https://github.com/hcengineering/platform/issues/231)) · Add icons ([#224](https://github.com/hcengineering/platform/issues/224)) · Add scroll in Popups ([#233](https://github.com/hcengineering/platform/issues/233)) · Add arrow for sort. Modify Popup locations. ([#235](https://github.com/hcengineering/platform/issues/235)) · Add ColorsPopup ([#247](https://github.com/hcengineering/platform/issues/247)) · Add MessageBox, fix UsersPopup ([#258](https://github.com/hcengineering/platform/issues/258)) · Add Table ([#282](https://github.com/hcengineering/platform/issues/282)) · Add StatusesPopup ([#288](https://github.com/hcengineering/platform/issues/288)) · Add Candidate and Vacancy cards ([#287](https://github.com/hcengineering/platform/issues/287)) · Add EditCandidates, EditVacancy and SpacePanel ([#293](https://github.com/hcengineering/platform/issues/293)) · Add ActivityMsg ([#310](https://github.com/hcengineering/platform/issues/310)) · Add AccountPopup · Add PluginCard · Add icons · Add TelegramPopup and PinPad 
* 🐛 BUG FIXES: · Minmodel · Triggers · Status bar color ([#7](https://github.com/hcengineering/platform/issues/7)) · Webpack · Server · `model-core` and some tests · Client · Storages and domains · Chunter domains · Lambda CORS · Server url · Dialog (form) submit behaviour on Enter · Icon sizes and status icon ([#16](https://github.com/hcengineering/platform/issues/16)) · Border EditBox and calculate width ([#17](https://github.com/hcengineering/platform/issues/17)) · Build · `Component` import · Client usage in chunter · Icon Info ([#35](https://github.com/hcengineering/platform/issues/35)) · Dialog width ([#36](https://github.com/hcengineering/platform/issues/36)) · Font-size in Status Bar ([#47](https://github.com/hcengineering/platform/issues/47)) · Platfrom tests · `Activity` and `ScrollBox` components. Gap in `Dialog` footer. ([#57](https://github.com/hcengineering/platform/issues/57)) · Popup Position on default ([#89](https://github.com/hcengineering/platform/issues/89)) · Nottom Dialog ([#90](https://github.com/hcengineering/platform/issues/90)) · Attachments · Backgrounds ([#100](https://github.com/hcengineering/platform/issues/100)) · Warnings ([#102](https://github.com/hcengineering/platform/issues/102)) · Z-index on popup stack · Social icons ([#122](https://github.com/hcengineering/platform/issues/122)) · Popup result · Mongodb lookup · Click area · Create application · Mongo driver and kanban view · Shadow and blur in KanbanCard ([#146](https://github.com/hcengineering/platform/issues/146)) · Navigator ([#176](https://github.com/hcengineering/platform/issues/176)) · Current space in navigator · `Card` footer ([#178](https://github.com/hcengineering/platform/issues/178)) · Prod · Svelte checks for `ui` · `core` test and add to build pipeline · Predicate and attachments · Title in EditCandidate ([#185](https://github.com/hcengineering/platform/issues/185)) · Flex-grow ([#187](https://github.com/hcengineering/platform/issues/187)) · Subtitle in EditCandidate ([#188](https://github.com/hcengineering/platform/issues/188)) · Panel and Channels ([#189](https://github.com/hcengineering/platform/issues/189)) · Header size ([#191](https://github.com/hcengineering/platform/issues/191)) · Link and Attachments. Add FileGroup. Correct hover on Channels. ([#194](https://github.com/hcengineering/platform/issues/194)) · Elastic deployment · Scroll in Panel. Add sizes in Spinner. ([#195](https://github.com/hcengineering/platform/issues/195)) · Header in TableView ([#199](https://github.com/hcengineering/platform/issues/199)) · Popup, click on UserBox anywhere ([#204](https://github.com/hcengineering/platform/issues/204)) · Popup position ([#210](https://github.com/hcengineering/platform/issues/210)) · Popup for TableView ([#214](https://github.com/hcengineering/platform/issues/214)) · ApplicationsPresenter ([#216](https://github.com/hcengineering/platform/issues/216)) · `Tooltip` · KanbanCard background · Backgrounds in Kanban Card ([#223](https://github.com/hcengineering/platform/issues/223)) · `mongo` $inc operator · Channels, CircleButton. Update icons for social. ([#232](https://github.com/hcengineering/platform/issues/232)) · Colors in transparent Button ([#234](https://github.com/hcengineering/platform/issues/234)) · Scrolling in EditStatuses ([#253](https://github.com/hcengineering/platform/issues/253)) · Status grow ([#271](https://github.com/hcengineering/platform/issues/271)) · KanbanCard ([#275](https://github.com/hcengineering/platform/issues/275)) · YesNo ([#276](https://github.com/hcengineering/platform/issues/276)) · ApplicationPresenter ([#279](https://github.com/hcengineering/platform/issues/279)) · All Yes/No components ([#278](https://github.com/hcengineering/platform/issues/278)) · Build · Table layout ([#286](https://github.com/hcengineering/platform/issues/286)) · CreateCandidate: attachments no longer an object · Content-type · Fulltext mapping issue · Fulltext update · Layout for CreateCandidate ([#289](https://github.com/hcengineering/platform/issues/289)) · CreateCandidate · CircleButton ([#290](https://github.com/hcengineering/platform/issues/290)) · EditCandidate · Tooltip hover ([#295](https://github.com/hcengineering/platform/issues/295)) · Dropdown and forms ([#296](https://github.com/hcengineering/platform/issues/296)) · Avatars ([#302](https://github.com/hcengineering/platform/issues/302)) · Avatar, add button ([#305](https://github.com/hcengineering/platform/issues/305)) · Colors in dialogs ([#306](https://github.com/hcengineering/platform/issues/306)) · ActivityMsg · Eslint working in VSCode ([#314](https://github.com/hcengineering/platform/issues/314)) · CreateApplication double close ([#313](https://github.com/hcengineering/platform/issues/313)) · Collection operations · Duplicate activity · Application kanban card · KanbanPanel ([#331](https://github.com/hcengineering/platform/issues/331)) · Activity view · Comment panning in Activity 
* ⚙️ MISCELLANEOUS TASKS: · Wrap ([#68](https://github.com/hcengineering/platform/issues/68)) · Button ([#76](https://github.com/hcengineering/platform/issues/76)) · ApplicationsPopup layout ([#228](https://github.com/hcengineering/platform/issues/228)) · Card layout ([#257](https://github.com/hcengineering/platform/issues/257)) · FindNode from TableView ([#281](https://github.com/hcengineering/platform/issues/281)) · Checking from Table ([#285](https://github.com/hcengineering/platform/issues/285)) · README.md · README.md · README.md · CreateVacancy & CreateCandidates layouts. Add Dropdown. ([#292](https://github.com/hcengineering/platform/issues/292)) · Avatar ([#301](https://github.com/hcengineering/platform/issues/301)) · README.md · README.md 
* CLEAN: · Package.json 

<!-- generated by git-cliff -->
