# Changelog

Changelog.

## [0.6.280] - 2024-08-11

* UBERF-7836: Fix github integeration (#6313)
* UBERF-7865: Fix wrong access to not created collection (#6315)
* UBERF-7856: Fix desktop publishing CI (#6308)

## [0.6.279] - 2024-08-09

* QFIX: Fix duplicates in inbox from multiple accounts (#6306)
* UBERF-7790: Fix connection timeout issue (#6301)
* UBERF-7854: Fix live query $lookup update (#6304)

## [0.6.277] - 2024-08-08

* UBERF-7604: Telegram notifications service (#6182)
* EZQMS-1029: Fix permissions check for creating project doc from context menu (#6282)
* EZQMS-1160: Fix slice type (#6280)

## [0.6.276] - 2024-08-07

* 🐛 BUG FIXES: Rekoni service build (#6255)
* UBERF-7604: Preparation for telegram notifications (#6123)
* UBERF-7717: Reduce finds on members changed (#6219)
* UBERF-7753: Change auth approach for providers (#6234)
* UBERF-7817: Fix tag element query (#6267)
* UBERF-7765: Retry config load desktop (#6272)* UBERF-7765: Only retry network errors when loading config for desktop app (#6274)

## [0.6.274] - 2024-08-05

* 🐛 BUG FIXES: Properly update uppy state (#6252)* 🐛 BUG FIXES: Remove provider from preview config (#6253)
* UBERF-7794: Restore related issues control (#6244)
* UBERF-7796: Rework index creation logic (#6246)
* UBERF-7800: Space improvements (#6250)
* UBERF-7764: Improve space permissions query (#6236)

## [0.6.271] - 2024-08-02

* UBERF-7776: Get rid of blobs in UI (#6226)

## [0.6.271rc1] - 2024-08-01

* 🐛 BUG FIXES: Drive UX fixes (#6213)
* ⚙️ MISCELLANEOUS TASKS: Cross-platform docker build (#6198)* ⚙️ MISCELLANEOUS TASKS: Update hocuspocus version (#6207)
* EZQMS-1145: Fixes doc import tool (#6204)
* UBERF-7016: Hide channels without any activity long time (#6176)
* UBERF-7721: Fixed event display (#6175)
* UBERF-7734: Fix total with find with limit === 1 (#6187)
* UBERF-7743: Make check-clean non blocking (#6195)
* UBERF-7749: Use MONGO_OPTIONS properly (#6200)
* UBERF-7755: Fix image toolbar visibility (#6208)

## [0.6.270] - 2024-07-30

* UBERF-7016: Hide channels without any activity long time (#6176)
* UBERF-7721: Fixed event display (#6175)
* UBERF-7734: Fix total with find with limit === 1 (#6187)

## [0.6.269] - 2024-07-30

* 🐛 BUG FIXES: Add github to server pipeline (#6170)
* UBERF-7016: Hide channels without any activity long time (#6176)
* UBERF-7721: Fixed event display (#6175)* UBERF-7721: Fixed event display (#6175)

## [0.6.268] - 2024-07-29

* UBERF-7698: Fix backup* UBERF-7698: Fix backup (#6168)
* UBERF-7705: Maitenance warning for every transactor (#6169)

## [0.6.267] - 2024-07-29

* EZQMS-1069: Fix request model (#6131)* EZQMS-1069: Fix request model (#6131)
* UBERF-7543: Add low level groupBy api and improve security space lookup (#6126)* UBERF-7543: Add low level groupBy api and improve security space lookup (#6126)
* UBERF-7579: Text editor actions (#6103)
* UBERF-7665: Fix OOM on partial data (#6134)* UBERF-7665: Fix OOM in sharp (#6138)* UBERF-7665: Fix OOM in sharp (#6138)
* UBERF-7675: Remove heading text action from compact editors (#6143)* UBERF-7675: Remove heading text action from compact editors (#6143)
* UBERF-7682: Fix mongo cursor on backup (#6145)* UBERF-7682: Fix mongo cursor on backup (#6145)
* UBERF-7692: Move FindAll slow print into mongo adapter (#6152)* UBERF-7692: Move FindAll slow print into mongo adapter (#6152)

## [0.6.266] - 2024-07-24

* EZQMS-1109: Add signature details for reviews/approvals (#6111)
* EZQMS-1140: Controlled doc content display improvements (#6110)
* QFIX: Qms signature dialog login info in tests (#6100)
* UBERF-7603: Fix connect with timeout (#6101)
* UBERF-7638: Add scroll to latest message button (#6119)
* EZQMS-1004: Fix typo (#6114)
* EZQMS-1121: Fix deleted doc states (#6112)

## [0.6.265] - 2024-07-19

* 🐛 BUG FIXES: Hide wiki history sidebar tab (#6064)
* UBERF-7595: Do not use /api/v1/version on connect (#6075)
* UBERF-7597: Get rid of formats in preview.ts (#6077)
* UBERF-7600: Reduce number of $in operators and fix account service is… (#6080)
* UBERF-7603: Support multiple transactors (#6086)
* UBERF-7620: Send broadcast on delay with combine (#6094)

## [0.6.264] - 2024-07-12

* UBERF-7495: Global editor kit extensions (#6057)
* UBERF-7513: Improve notifications model to allow external notifications channels (#6037)
* UBERF-7519: Rework backup service (#6050)
* UBERF-7583: Fix workspace upgrade (#6062)

## [0.6.263] - 2024-07-10

* UBERF-7543: Fix memory usage (#6044)

## [0.6.262] - 2024-07-10

* 🐛 BUG FIXES: Track applied transactions in session op context (#6029)

## [0.6.261] - 2024-07-09

* 🐛 BUG FIXES: Handle readonly in number presenter (#6026)
* UBERF-7510: Add logging and catch errors on cleanup (#6003)
* UBERF-7520: Use Bulk for index query updates (#6012)
* UBERF-7532: Bulk operations for triggers (#6023)

## [0.6.260] - 2024-07-04

* QFIX: Revert missing pipeline configuration (#5987)
* QFIX: Use http for local and test brandings (#5980)
* UBERF-7465: Move pipeline into separate plugin (#5978)
* UBERF-7474: Some logging and reduce calls for query refresh (#5973)
* UBERF-7489: Fix various performance issues (#5983)* UBERF-7489: Some more chat optimizations (#5999)
* UBERF-7501: Copy few blobs in parallel (#5995)
* EZQMS-1057: Fix images in branded workspaces (#5979)
* UBERF-7434: Show dowload progress (#5944)

## [0.6.259] - 2024-06-28

* UBERF-7428: Fix memory issues (#5940)
* UBERF-7389: Instant transactions (#5941)

## [0.6.258] - 2024-06-27

* 🚀 FEATURES: Add shortcut to create todo in documents (#5827)
* UBERF-7411: Allow to backup blobs with wrong size (#5926)
* UBERF-7419: Fix various sentry errors (#5931)
* UBERF-7422: Fix blob/stora (#5933)
* UBERF-7425: Fix some CF caching issues (#5936)

## [0.6.257] - 2024-06-25

* 🐛 BUG FIXES: *(ui)* Allow input month with keystrokes (#5785)
* UBERF-5564: Rework groupping and support PersonAccount  (#5525)
* UBERF-7165: Storage + Backup improvements (#5913)
* UBERF-7330: Improve text editor UX (#5909)
* UBERF-7362: Do not cache branding served from front (#5889)
* EZQMS-1028: Fix actions in tree element (#5887)
* UBERF-7350: Add more oauth logs (#5879)

## [0.6.256] - 2024-06-20

* 🐛 BUG FIXES: Extra logging in documents content migration (#5868)
* EZQMS-951: Server branding (#5858)
* UBERF-7327: Chinese language selector (#5862)
* UBERF-7342: Add french lang selector (#5873)

## [0.6.255] - 2024-06-18

* UBERF-7126: Content type based storage configuration (#5781)
* UBERF-7239: Support short/custom links in inbox/chat/planner (#5815)
* UBERF-7286: Backup retry (#5830)
* UBERF-7297: Allow to backup-restore from v0.6.239 (#5837)* UBERF-7297: One more fix to backup-restore (#5841)
* UBERF-7308: Upgrade model improvements (#5847)
* UBERF-7312: Memory improvements (#5849)
* EZQMS-1004: Fix questions wording (#5820)
* EZQMS-1023: Remove old migrations from qms (#5823)
* EZQMS-966: Notifications fixes (#5819)

## [0.6.254] - 2024-06-14

* UBERF-7266: Fix workspace rate limit (#5812)

## [0.6.253] - 2024-06-13

* UBERF-7247: Fix queryFind for mixins on server (#5803)
* EZQMS-972: Fix custom space types for documents and products (#5801)
* EZQMS-974: Fix space type selector in document and product spaces (#5802)

## [0.6.252] - 2024-06-12

* EZQMS-1008: Disable archived product editing (#5794)
* EZQMS-976: Exclude other types mixins (#5795)
* EZQMS-981: Adjust doc library wording (#5791)
* UBERF-7206: Adjustments and resources to support desktop screenshare (#5790)

## [0.6.251] - 2024-06-11

* 🐛 BUG FIXES: Disable guest link action for selection (#5776)
* ⚙️ MISCELLANEOUS TASKS: Update preview.ts (#5765)
* UBERF-7197: Fix high cpu load (#5761)

## [0.6.250] - 2024-06-07

* UBERF-7077: Fixed Separator (#5743)
* UBERF-7181: Fix GH PR statuses (#5749)

## [0.6.249] - 2024-06-05

* UBERF-7090: Add QMS common components (#5711)* UBERF-7090: Add QMS plugins (#5716)* UBERF-7090: Add Office plugins (#5725)
* UBERF-7126: Fix blob previews (#5723)* UBERF-7126: Support rich editor blob resolve (#5727)
* EZQMS-910: Fix workspace roles editing (#5726)

## [0.6.248] - 2024-05-31

* UBERF-7114: Fix workspace from clone (#5703)
* UBERF-7118: Fix upgrade/refresh on reconnect (#5704)

## [0.6.247] - 2024-05-30

* 🐛 BUG FIXES: Use concatLink for transactor URL (#5659)* 🐛 BUG FIXES: Migrate content for documents only (#5699)
* QFIX: Remove hardcoded platform url (#5692)
* UBERF-6984: Host-based branding (#5657)
* UBERF-7011: Switch to Ref<Blob> (#5661)
* UBERF-7062: Fix backup memory usage and support missing blobs (#5665)
* UBERF-7067: Make chat group labels translations reactive (#5688)
* UBERF-7105: Use status colour when projectState is undefined (#5697)
* UBERF-6639: Fix create issue default status (#5685)
* UBERF-7084: Fix add new status to task type (#5684)
* UBERF-7090: Request enhancements (#5695)

## [0.6.246] - 2024-05-23

* 🐛 BUG FIXES: Proper drive space header button logic (#5642)* 🐛 BUG FIXES: Download drive files via temporary link (#5644)
* UBERF-7018: Fix vacancies (#5647)

## [0.6.245] - 2024-05-22

* UBERF-6365: Blob mongo storage initial support (#5474)
* UBERF-6638: Fix colours for statuses (#5620)
* UBERF-6854: S3 provider (#5611)
* UBERF-6893: Move index build into workspace usage. (#5586)
* UBERF-6949: Fix kanban options (#5593)

## [0.6.243] - 2024-05-13

* 🐛 BUG FIXES: Hide actions for archived teamspaces (#5580)
* UBERF-6829: Group messages of the same type and user (#5569)
* EZQMS-876: Adjust role assignment editor (#5583)
* EZQMS-883: Allow email notifications for requests (#5582)
* EZQMS-896: Fix owners assignment for default spaces (#5585)

## [0.6.242] - 2024-05-10

* 🐛 BUG FIXES: Add missing productId to getAccountInfo (#5540)
* UBERF-6870: Speedup server broadcast of derived transactions (#5553)
* UBERF-6888: Async triggers (#5565)

## [0.6.241] - 2024-05-08

* UBERF-6802: Improve create chat message performance (#5530)
* UBERF-6807: Fix empty objects channels in chat (#5533)

## [0.6.240] - 2024-05-06

* 🐛 BUG FIXES: Move to well known parent when no parent selected (#5516)
* EZQMS-729: Restrict spaces operations (#5500)
* QFIX: Connection should restore boolean query fields (#5508)
* UBERF-6576: Move default space/project/task types into static model (#5423)
* UBERF-6778: Add Support to uWebSocket.js library (#5503)
* EZQMS-730: Better check for roles when changing members (#5527)
* EZQMS-798: Fix role name update (#5514)
* EZQMS-834: Fix roles ids and names (#5520)

## [0.6.239] - 2024-05-03

* 🐛 BUG FIXES: Show max width button in documents (#5476)
* EZQMS-762: Improve printing layout (#5486)
* QFIX: Elastic adapter index not found exception (#5482)
* UBERF-6756: Tracker performance fixes (#5488)
* EZQMS-762: Extract base content from toc popup (#5489)

## [0.6.238] - 2024-04-26

* UBERF-6676: Chat local state (#5461)
* UBERF-6677: Add user online/offline status (#5438)
* UBERF-6712: Rework connection logic (#5455)
* UBERF-6726: Fix clone for huge files (#5470)
* UBERF-6708: Composite elastic doc key (#5457)

## [0.6.237] - 2024-04-23

* EZQMS-748: Hide left menu by default, ensure placement, improve show/hide logic (#5429)

## [0.6.236] - 2024-04-23

* UBERF-6653: Fix minor issue and add force-close (#5418)

## [0.6.235a] - 2024-04-20

* UBERF-6636: Fix todos auto expand if collapsed (#5406)
* UBERF-6643: Fix few connection related exceptions (#5412)* UBERF-6643: A bit more logging (#5413)

## [0.6.235] - 2024-04-19

* UBERF-6626: More detailed info about maintenance (#5400)
* UBERF-6633: Fix model enabled tracking (#5404)

## [0.6.234] - 2024-04-18

* UBERF-5527: Add context menu for activity and inbox (#5373)
* UBERF-6205: Add real archive for notifications (#5385)
* UBERF-6490: Rework backup tool (#5386)
* UBERF-6598: Perform upgrade all workspaces to new versions (#5392)

## [0.6.233] - 2024-04-16

* QFIX: Always recreate space types (#5371)
* UBERF-6464: Update activity mentions display (#5339)
* UBERF-6577: Fix invite link with null mask (#5372)

## [0.6.232] - 2024-04-16

* 🐛 BUG FIXES: Workspace creation issues (#5362)
* UBERF-5686: Fix copy link (#5368)
* UBERF-5964: Insert items menu in editor (#5341)
* UBERF-6330: Fix race conditions in UI (#5184)
* UBERF-6557: Clean old domains during clone of workspace to new place (#5361)
* EZQMS-724: Make roles related code more robust (#5363)
* UBERF-6537: Fix teamspace creation (#5354)

## [0.6.231] - 2024-04-13

* EZQMS-689: Slightly improved typings for notification presenters (#5312)
* UBERF-6469: Fix slow index creation (#5324)
* UBERF-6478: Make icons more clear (#5320)
* UBERF-6508: Add user to doc collaborators on mention (#5340)
* UBERF-6509: Fix reading mention notifications (#5323)
* UBERF-6523: Allow to use zstd (#5333)
* UBERF-6540: Fix isIndexable and clean wrong indexed documents (#5347)

## [0.6.230] - 2024-04-10

* SILENT: False for notifications (#5284)
* UBERF-6469: Rework workspace creation to more informative (#5291)

## [0.6.229] - 2024-04-10

* 🚀 FEATURES: *(help)* Added find bug button for easy navigation (#5214)
* QFIX: Center media, improve matching (#5267)
* UBERF-6353: Extensible preview (#5264)

## [0.6.228a] - 2024-04-09

* UBERF-6426: Fix stuck backup (#5258)
* UBERF-6433: Fix workspace creation from demo workspaces (#5255)

## [0.6.228] - 2024-04-08

* TSK-1682: Introduced reusable `SectionEmpty` for numerous existing and upcoming cases (#5220)
* UBERF-6313: Improve backup/restore (#5241)

## [0.6.227] - 2024-04-08

* EZQMS-663: Add permissions util (#5189)
* QFIX: Restore ats task types tool (#5185)
* TSK-1682: Slightly reorganized recruit files for future changes (#5196)
* UBERF-6374: Improve server logging and improve startup performance (#5210)
* UBERF-6393: Work on elastic fast backup/restore (#5235)

## [0.6.226] - 2024-04-04

* UBERF-6313: Improve upgrade of workspace (#5178)
* UBERF-6314: Provide space if all of the items have same space (#5171)
* UBERF-6318: Fix server drop connection on connect (#5174)

## [0.6.225] - 2024-04-03

* UBERF-6296: Fix elastic queries (#5155)
* UBERF-6300: Not cache for index.html's (#5159)
* UBERF-6310: Fix context passing (#5167)
* UBERF-6255: Minor guest and pdf viewer adjustments (#5164)

## [0.6.224] - 2024-04-02

* QFIX: Wrong minio config parameter (#5151)

## [0.6.223] - 2024-04-02

* UBERF-6161: Storage configuration (#5109)
* UBERF-6263: Fix mongo client unexpected close (#5129)
* UBERF-6265: Fix account creation from account service (#5132)
* UBERF-6267: Fix few platform troubles (#5142)

## [0.6.222] - 2024-04-01

* 🚀 FEATURES: Preview media attachments (#5102)
* UBERF-6226: Updated LOVE layout, VideoPopup. (#5100)
* UBERF-6242: More proper manage mongo connections (#5118)

## [0.6.221] - 2024-03-29

* QFIX: Consistent space/project/task type mixi ids (#5089)
* EZQMS-663: Add more info to permissions store, fix tree element actions (#5090)
* UBERF-6224: Restore missing task types (#5094)

## [0.6.220] - 2024-03-28

* QFIX: Invert delete object permission (#5085)

## [0.6.219] - 2024-03-28

* EZQMS-612: Quick fix to let `TypedSpace` instances have non-configured roles (`undefined`) (#5083)
* EZQMS-665: Minor inbox styles fix (#5065)
* UBERF-6001: Roles management (#4994)
* UBERF-6202: Use only one mongo pull per configuration (#5073)
* UBERF-6209: Add reactivity (#5078)

## [0.6.218] - 2024-03-27

* 🚀 FEATURES: *(test)* Updated Due date filter test (#5057)
* UBERF-6094: Preparing bot (#5061)
* UBERF-6180: Fix account issues (#5063)
* UBERF-6194: CLI for rename account (#5067)

## [0.6.216] - 2024-03-25

* 🚀 FEATURES: *(planner)* Drag-n-drop (#5031)* 🚀 FEATURES: *(planner)* Save accordion state (#5042)* 🚀 FEATURES: *(planner)* Remove large view mode (#5043)
* 🐛 BUG FIXES: `Panel` glitches on opening (#5033)
* QFIX: Few check from sentry and disable due date test (#5050)
* UBERF-6124: Rework inbox view (#5046)
* UBERF-6126: Storage adapter (#5035)
* UBERF-6150: Improve backup logic (#5041)

## [0.6.215] - 2024-03-21

* EZQMS-602: Moved `Rank` type to core (utilities stay in its own package) (#5019)
* UBERF-6121: Fix front service caching (#5029)

## [0.6.214] - 2024-03-19

* 🚀 FEATURES: *(planner)* Add action for toggle button (#4986)* 🚀 FEATURES: *(test)* Working on the migration planner tests (#5002)* 🚀 FEATURES: *(planner)* Some ui improvements (#4992)* 🚀 FEATURES: *(planner)* New layout for attached todos (#4995)* 🚀 FEATURES: *(planner)* New slots, fixes and improvements (#4961)
* EZQMS-642: Extended `navigate()` signature to support History replacement (#4979)
* UBERF-6053: Do not crash on isDerived (#4998)
* UBERF-6058: Fix cache control for front service (#5000)
* UBERF-6066: Fix component manager state (#5009)

## [0.6.213] - 2024-03-15

* 🐛 BUG FIXES: Default project icon (#4984)
* UBERF-6042: Fix front service (#4991)

## [0.6.212] - 2024-03-15

* 🚀 FEATURES: *(test)* Updated Document public link revoke test (#4955)
* 🐛 BUG FIXES: Missed invite icon (#4962)
* UBERF-5933: Add 404 handling in case of resource direct requests (#4983)
* UBERF-5986: Upgrade fixes (#4957)
* UBERF-6000: Fix statuses filtering and icons (#4966)
* UBERF-6014: Fix $faset usage (#4971)

## [0.6.211] - 2024-03-13

* UBERF-5982: Fix tracker select all action (#4950)

## [0.6.210a] - 2024-03-13

* 🐛 BUG FIXES: *(planner)* Frozen slots when switching between todos (#4944)
* TESTS-221: Feat(tests): done Document public link revoke test (#4940)

## [0.6.210] - 2024-03-13

* 🚀 FEATURES: *(planner)* New priority layout, update item layout (#4896)* 🚀 FEATURES: *(test)* Updated Due Date test (#4925)
* EZQMS-459: Hoisted `showNotify` calculation to `ActivityNotificationPresenter` (#4937)
* EZQMS-649: Moved some common utilities from Uberflow to Platform (#4927)
* TESTS-102: Feat(tests): done Label filter test (#4885)
* TESTS-216: Feat(tests): done Public link generate test (#4915)
* TESTS-217: Feat(test): done Public link Revoke test (#4926)
* TESTS-236: Feat(tests): done Create workspace with LastToken in the localStorage test (#4939)
* TESTS-94: Feat(tests): done Due date filter test  (#4891)
* UBERF-5825: Fix github issues (#4924)
* UBERF-5932: Fix account upgrade (#4912)

## [0.6.209] - 2024-03-08

* 🚀 FEATURES: *(planner)* Improve and reuse `Chip` (#4854)
* 🐛 BUG FIXES: *(todo)* Checkbox focus and spinner (#4890)* 🐛 BUG FIXES: *(todo)* Broken context actions (#4889)
* EZQMS-377: Add file attachments extension to text editor (#4284)
* EZQMS-562: Introduced reusable `NotificationToast` component (#4873)
* EZQMS-602: Moved Rank to its own package (#4845)
* TESTS-100: Feat(tests): done Milestone filter test  (#4872)
* TESTS-101: Feat(tests): done Modified by filter test  (#4871)
* TESTS-103: Feat(tests): done Title filter test (#4863)
* UBERF-5811: Rework backlinks (#4887)
* UBERF-5827: Add collaborative description for companies (#4851)
* UBERF-5886: Fix todo reorder on click (#4904)

## [0.6.208] - 2024-03-04

* 🚀 FEATURES: New todo checkbox (#4841)* 🚀 FEATURES: *(tests)* TESTS-93 updated Created date filter test (#4862)* 🚀 FEATURES: *(tests)* Updated Created date filter test (#4868)
* 🐛 BUG FIXES: Create event popup improvements (#4850)
* TESTS-212: Feat(tests): done Add comment by popup test (#4817)
* UBERF-5870: Fix cache control and some minor enhancements (#4869)

## [0.6.207] - 2024-03-01

* UBERF-5812: Fix allow to delete based on all my accounts (#4823)

## [0.6.206] - 2024-03-01

* 🚀 FEATURES: *(tests)* Added documents tests (#4843)
* UBERF-5712: Fix jumping when scroll in bottom and add auto scroll to new content (#4830)

## [0.6.205] - 2024-02-29

* 🚀 FEATURES: *(tests)* Added execute deploy in any status (#4767)
* TESTS-196: Feat(test): done Remove relation be editing issue details test  (#4755)
* UBER-1239: Fix missing notifications for mentions from doc (#4820)
* UBERF-5394: Create component for new search input (#4777)
* UBERF-5604: Avoid extra calls on read notifications (#4781)
* UBERF-5621: Add full date tooltip (#4783)
* UBERF-5626: Set autofocus end on message edit (#4784)
* UBERF-5630: Fix inactive employee status in activity (#4782)
* UBERF-5650: Do not send mention notification if user already notified (#4821)
* UBERF-5675: Fix activity and notifications for colelction update (#4819)
* UBERF-5718: Allow to find one from existing queries (#4776)
* UBERF-5733: Remove invalid lookup update (#4779)
* UBERF-5734: Fix guest mode display of server generated links (#4790)
* UBERF-5744: Fix exception on server (#4787)
* UBERF-5795: Improve logging capabilities (#4813)

## [0.6.204] - 2024-02-26

* TESTS-193: TESTS-194: feat(tests): working on the tests  (#4739)

## [0.6.203] - 2024-02-25

* UBERF-5511: Fix query and include ibm plex mono (#4764)

## [0.6.202] - 2024-02-23

* 🚀 FEATURES: *(tests)* TESTS-47 done Mark as blocked by test (#4737)
* UBER-958: Fix query updates (#4742)
* UBERF-5594: Render mentions before object is loaded (#4738)
* UBERF-5595: Hide link preview for chat (#4752)* UBERF-5595: Set up attachments sizes (#4746)
* UBERF-5628: Fix unexpected Reference object in Activity on mentions in description (#4753)
* UBERF-5673: Esbuild transpile (#4748)
* UBERF-5694: Attempt to fix build cache (#4757)

## [0.6.201] - 2024-02-20

* TESTS-182: Feat(tests): done Create sub-issue from template test  (#4711)
* UBER-1227: Fix members duplicates (#4721)

## [0.6.200] - 2024-02-19

* TESTS-192: Feat(tests): done Add comment with image attachment test (#4687)
* UBER-708: Github related fixes (#4704)
* UBERF-5472: Add pagination for channels/direct (#4706)
* UBERF-5586: Improve loading of reactions and saved messages (#4694)

## [0.6.198] - 2024-02-16

* 🚀 FEATURES: *(tests)* Updated reports and prepare server step (#4659)
* QFIX: Create project type (#4685)
* UBERF-5548: Use esbuild with webpack (#4657)
* UBERF-5570: Fix avatars (#4679)
* UBERF-5575: Fix workspace join (#4684)
* UBERF-5551: Configurable click propagation from edit box (#4674)

## [0.6.197] - 2024-02-15

* UBERF-5526: Fix scroll to new messages (#4651)
* UBERF-5532: Fix recruit comments typo (#4648)
* UBERF-5538: Fix server queryFind with mixins (#4653)

## [0.6.196] - 2024-02-14

* EZQMS-563: Moved `ActionWithAvailability` helper type and functions from `questions` to `view` (#4611)
* UBERF-4319: Fix performance issues (#4631)
* UBERF-5467: Remove hidden notifications and use Lazy on inbox  (#4632)
* UBERF-5476: Fix archive in inbox (#4618)
* UBERF-5485: Fix versions in bundled resources (#4625)
* UBERF-5495: Load all messages for inbox with one query (#4628)

## [0.6.195] - 2024-02-13

* TESTS-167: Feat(tests): done Check that the issue backlink test (#4596)
* TESTS-179: Feat(tests): done Check the changed description activity test  (#4598)
* UBEF-4319: Few more performance fixes (#4613)
* UBERF-4319: Fix create issue performance (#4608)
* UBERF-5323: Fix new messages marker (#4614)
* UBERF-5324: Allow cmd-k for editable content (#4601)
* UBERF-5438: Fix edit issue attributes keys (#4602)

## [0.6.194] - 2024-02-09

* 🚀 FEATURES: *(tests)* TESTS-166 done Check Contact activity backlink test (#4585)
* UBERF-5408: Fix inline images in comments (#4591)
* UBERF-5418: Fix status editing (#4590)

## [0.6.193] - 2024-02-08

* 🚀 FEATURES: *(test)* Updated Move to project test (#4582)
* TESTS-164: Feat(tests): done mentioned in the issue test (#4575)
* UBERF-4867: Fix issues mentions display (#4580)
* UBERF-5325: Disable send message during attachment upload (#4583)
* UBERF-5326: Fix extra scroll and higlight when thread opened (#4579)
* UBERF-5382: Allow to disable component edit for some cases (#4574)
* UBERF-5393: Fix backlink for thread (#4578)

## [0.6.192] - 2024-02-07

* 🚀 FEATURES: *(tests)* Updated Create duplicate issues test (#4542)* 🚀 FEATURES: *(tests)* Updated close issue selector (#4551)* 🚀 FEATURES: *(tests)* TESTS-171 done Check validation steps test (#4558)
* 🐛 BUG FIXES: Tags view action button layout (#4514)
* EZQMS-531: Prop to disable Save As and Save buttons in `FilterBar` (#4560)
* TESTS-169: Feat(tests): done Create a workspace with a custom name test (#4541)
* UBERF-4319: Trigger Server queries (#4550)
* UBERF-5289: Fix getting parent doc for some cases for indexing (#4549)
* UBERF-5315: Update chat  (#4572)
* UBERF-5321: Fix workspace CLI upgrade (#4534)
* UBERF-5348: Fix new status creation (#4567)
* UBERF-5350: Fix workspace name create issue (#4555)
* UBERF-5364: Fix targeted broadcast on server (#4565)

## [0.6.191] - 2024-02-05

* 🐛 BUG FIXES: Broken checkbox behavior (#4509)* 🐛 BUG FIXES: Popup glitches caused by long calculations (#4511)
* UBERF-5017: Show correct collaborators diff and dont send notification for collaborators changer (#4529)
* UBERF-5304: Fix init workspace (#4524)

## [0.6.190] - 2024-02-03

* UBERF-5280: Fix backup service (#4506)

## [0.6.188] - 2024-02-02

* 🚀 FEATURES: *(tests)* Updated filter between tests (#4488)
* EZQMS-467: Fixed group for `Open in new tab` action (#4481)
* UBER-1160: Open vacancy panel when it’s opened from applicant (#4473)
* UBER-944: Action for opening in new tab (#4447)
* UBERF-4319: Performance changes (#4474)* UBERF-4319: Improve performance (#4501)
* UBERF-4983: Update chat ui (#4483)
* UBERF-5020: Fix reply to thread (#4502)
* UBERF-5140: Any workspace names (#4489)
* UBERF-5232: Fix wrong activity message title (#4498)
* UBERF-5243: Add default size, make icons size consistent (#4494)
* UBERF-5265: Fix workspace creation (#4499)
* UBERF-5275: Fix collaborator editing (#4505)

## [0.6.187] - 2024-01-30

* TESTS-159: Feat(tests): done Create issue with several attachment tests (#4464)
* UBER-1005: Array<Ref<T>> support as custom attribute (#4471)
* UBER-1198: Upgrade to mongo 7 (#4472)
* UBERF-4631: Fix issue when link preview in activity displayed as #undefined (#4435)
* EZQMS-537: Make thread header hidable (#4458)

## [0.6.186] - 2024-01-25

* 🚀 FEATURES: *(tests)* Updated duplicate issues test  (#4450)
* EZQMS-461: Add generics for `ModeSelector` and `SpecialView` (#4437)* EZQMS-461: Better typings for `ModeSelector` (#4451)
* UBERF-4970: Fix component update (#4455)
* UBERF-5083: Fix project delete (#4446)

## [0.6.185] - 2024-01-25

* EZQMS-538: Allow command contributions to dev tool (#4440)

## [0.6.184] - 2024-01-24

* 🚀 FEATURES: *(tests)* Skipped Set parent issue test (#4427)
* EZQMS-527: Introduced `ActionButton` component (#4412)* EZQMS-527: Consistent defaults for `ActionButton` (#4421)

## [0.6.183] - 2024-01-23

* UBERF-5018: Search improvements/Indexing fix (#4403)
* UBERF-5024: Add reactions control to inbox (#4414)
* UBERF-5042: Fix exception in list view (#4419)

## [0.6.182] - 2024-01-22

* EZQMS-527: Expose `EmployeeArrayEditor` from `contact-resources` (#4411)
* UBERF-5012: Remove extra key (avoid reloading after notifications deleting) (#4399)* UBERF-5012: Use flat message view if doc has only one notification (#4410)
* UBERF-5023: Make flat view default (#4409)

## [0.6.181a] - 2024-01-20

* 🚀 FEATURES: *(test)* Updated flaky tests (#4393)
* QFIX: Remove unused deps (#4394)

## [0.6.181] - 2024-01-19

* EZQMS-457: Added optional ModeSelector to SpecialView (#4381)
* EZQMS-529: Added support for primary/positive/negative kinds for CheckBox and RadioButton (#4384)* EZQMS-529: Added support for `grow` and new `align` display options in `Table` (#4389)
* UBERF-5000: Handle derived tx for security context update (#4391)

## [0.6.180] - 2024-01-18

* QFIX: Return ActivityMessageHeader, since it is used by github (#4377)
* UBERF-4361: Update inbox ui (#4376)

## [0.6.179] - 2024-01-17

* 🚀 FEATURES: *(tests)* Updated flaky tests (#4367)
* EZQMS-470: Add server side tiptap extension for node uuid (#4358)
* UBER-1188: Fix exception during login/logout (#4364)
* UBERF-4957: Fix status colors (#4369)

## [0.6.178] - 2024-01-16

* 🚀 FEATURES: *(tests)* Update Merge contacts test (#4339)
* 🐛 BUG FIXES: *(tests)* Disabled failed tests (#4331)
* QFIX: Change activity onhover (#4336)
* UBER-1187: AnyType field support (#4343)
* UBERF-4360: Rewrite chat  (#4265)
* UBERF-4868: Disable draft saving for comment editing (#4332)
* UBERF-4928: Indexing fixes (#4357)

## [0.6.177] - 2024-01-08

* UBER-1185: Fix TT migration issues (#4320)
* UBERF-4870: Fixed attribute creation (#4325)

## [0.6.175] - 2024-01-05

* 🚀 FEATURES: *(tests)* Updated tests (#4296)

## [0.6.174a] - 2023-12-29

* UBERF-4799: Fix migration tasktype doubling (#4289)

## [0.6.173] - 2023-12-28

* 🚀 FEATURES: *(tests)* TESTS-15 done Create a new Company test (#4242)* 🚀 FEATURES: *(tests)* Updated flaky tests (#4244)* 🚀 FEATURES: *(tests)* TESTS-21 done Match to vacancy test (#4268)
* EZQMS-430: Update change document owner popup (#4278)
* TESTS-16: Feat(tests): done Edit a Company test (#4243)
* TESTS-17: Feat(tests): done Delete a Company test (#4252)
* TESTS-20: Feat(tests): done Archive a Vacancy test  (#4254)
* TESTS-23: Feat(tests): done Export vacancies tests (#4253)
* TESTS-51: Feat(tests): done Delete a component test (#4234)
* TSK-1668: Side changes from Surveys (#4271)
* UBER-1178: Rework indexing fields (#4261)
* UBERF-4716: Activity info message (#4241)
* UBERF-4729: Fix front service (#4260)
* UBERF-4738: Fix attachments preview (#4259)
* EZQMS-449: Wrap initial collaborator content loading with try-catch (#4256)
* EZQMS-452: Fix issue presenter (#4263)

## [0.6.172] - 2023-12-21

* 🚀 FEATURES: *(tests)* TESTS-48 done Create duplicate issues test (#4225)* 🚀 FEATURES: *(tests)* TESTS-40 done Delete an issue test (#4233)
* TESTS-50: Feat(tests): done Edit a component test (#4232)
* UBERF-4692: Remove activity messages on doc remove (#4227)
* UBERF-4707: Fix activity messages updating (#4238)
* QFIX: Update DropdownLabels for showing dropdown icon (#4230)

## [0.6.171] - 2023-12-20

* 🚀 FEATURES: *(tests)* TESTS-54 done Edit a Milestone test (#4175)* 🚀 FEATURES: *(tests)* TESTS-55 done Delete a Milestone test (#4184)* 🚀 FEATURES: *(tests)* Updated tests (#4185)* 🚀 FEATURES: *(tests)* Updated sanity-ws dump and tests (#4202)* 🚀 FEATURES: *(tests)* TESTS-45 done Move to project test (#4203)* 🚀 FEATURES: *(tests)* Updated tests (#4209)* 🚀 FEATURES: *(tests)* Updated Edit a sub-issue test  (#4210)* 🚀 FEATURES: *(tests)* Updated move to project tests  (#4214)* 🚀 FEATURES: *(tests)* TESTS-81 done Comment stored test (#4216)* 🚀 FEATURES: *(tests)* Updated flaky tests (#4218)* 🚀 FEATURES: *(tests)* TESTS-106 (#4217)* 🚀 FEATURES: *(tests)* TESTS-41 done Delete a sub-issue test (#4223)* 🚀 FEATURES: *(tests)* Updated tests (#4224)
* EZQMS-440: Fix quality events (#4183)
* TESTS-42: Feat(tests): done Edit Sub-Issue test (#4191)
* TESTS-44: Feat(tests): the Set parent issue test (#4158)
* TESTS-46: Feat(tests): done New related issue test (#4192)
* TESTS-59: Feat(tests): done Create an Issue from template test  (#4212)
* TESTS-98: Feat(tests): done Created by filter test (#4161)
* TESTS-99: Feat(tests): done Component filter test  (#4162)
* TSK-1668: Survey plugin (#4174)
* UBER-1179: Fix comments saving (#4205)
* UBER-1182: Fix github task types support (#4215)* UBER-1182: Fix task type categories (#4222)
* UBERF-4248: Task type (#4042)
* UBERF-4432: Better notifications for Chunter (#4165)
* UBERF-4610: Fix checkbox behaviour (#4173)
* UBERF-4620: Fix show less triangle (#4182)
* UBERF-4632: Refactor activity classes structure (#4190)
* UBERF-4649: Fix query projection/cache issue (#4200)

## [0.6.170] - 2023-12-07

* TESTS-26: Feat(tests): done Archive Project tests  (#4157)
* TESTS-97: Feat(tests): done the Priority filter test (#4156)
* UBERF-4451: Fixed how resolved default location is applied on initial routing (#4159)
* UBERF-4526: Elastic bulk error on re-indexing (#4155)

## [0.6.169] - 2023-12-06

* 🚀 FEATURES: *(tests)* Updated sanity-ws dump (#4149)* 🚀 FEATURES: *(tests)* TESTS-95 done Status filter test (#4150)
* TESTS-25: Feat(tests): done Edit project tests (#4138)
* UBERF-4477: Fixed positioning of `AddSavedView` popup (#4148)
* UBERF-4560: Filter out spaces that are archived for kanban (#4147)

## [0.6.168] - 2023-12-05

* UBERF-4555: Fix elastic backup/restore (#4144)

## [0.6.167] - 2023-12-05

* 🚀 FEATURES: *(tests)* Updated issues.spec.ts test (#4136)
* TESTS-24: Feat(tests): done Create project test (#4126)
* UBER-1144: Fixed estimation time representation used when creating issue and issue template (#4139)
* UBERF-4470: Make SetLabels action available on a single focused issue (#4140)

## [0.6.166] - 2023-12-04

* EZQMS-394: Update diff viewer lint button colors (#4115)
* UBERF-4527: Extra logging for client (#4133)

## [0.6.165] - 2023-12-02

* 🚀 FEATURES: *(tests)* TESTS-58 dont test delete template (#4125)
* UBER-1086: Fixed Elastic scroll contexts overflow issue, added tests for Elastic (#4124)
* UBERF-4514: Option for order of activity, pinned first in CommentPopup (#4122)

## [0.6.164] - 2023-12-01

* 🚀 FEATURES: *(tests)* Done TESTS-93 (#4110)
* EZQMS-403: Displatch value update from EditBox (#4114)
* EZQMS-407: Add Panel post utils slot (#4116)
* UBER-1083: Use hours and minutes to present less than a day durations (#4111)
* UBERF-4493: Mentions. When there is a lot of Applicants it's really difficult to mention employee (#4119)

## [0.6.163] - 2023-11-29

* TESTS: Feat(tests): updated flaky tests (#4106)
* UBER-1006: Support Ref for Vacancies (#4104)
* UBERF-4405: Empty Vacancies' members (#4105)
* UBERF-4478: Set modifiedOn on server for collections tx (#4103)
* UBERF-4486: Fix mention and spotlight categories (#4108)

## [0.6.162] - 2023-11-29

* 🚀 FEATURES: *(tests)* Updated create-vacancy test (#4091)
* EZQMS-398: Fix StringDiffViewer (#4089)
* TESTS-92: Feat(tests): done Tracker filters tests - Modified date (#4094)
* UBERF-4238: Fix calendar utils (#4092)
* UBERF-4428: Add option to disable indexing for a class (#4090)
* UBERF-4446: Move search from text editor (#4093)

## [0.6.161] - 2023-11-28

* EZQMS-398: Update CollaborationDiffViewer (#4075)* EZQMS-398: Add StringDiffViewer (#4085)
* QFIX: Fix asterisk usage in forms (#4080)
* TESTS-56: Feat(tests): done Create a Template test (#4063)
* TESTS-57: Feat(tests): done Edit a Template test (#4079)
* TESTS-88: Feat(tests): done Add comment from several users test (#4054)
* UBERF-4165: Add search to actions popup (#4057)
* UBERF-4413: Kanban with huge data sets (#4076)
* UBERF-4420: Bump fieldStateId (#4071)

## [0.6.160] - 2023-11-27

* EZQMS-393: Add CollaboratorEditor prop to hide popups (#4051)
* TESTS-89: Feat(tests): working on First user change assignee, second user should see assigned issue test  (#4046)

## [0.6.159] - 2023-11-24

* UBER-945: Pinning for comments (#4050)
* UBERF-4384: Update space from attributes (#4049)
* UBERF-4388: Few performance related fixes (#4053)

## [0.6.158] - 2023-11-23

* EZQMS-368: Fix exit text editor node uuid extension node (#4044)
* TESTS-85: Feat(tests): added issues.spec.ts test (#4025)
* TESTS-87: Feat(tests): done Issues status can be changed by another users test (#4036)
* UBER-1167: Revert All/Active/Backlog for issues (#4047)
* UBER-636: Fix from&to for NewMessage (#4043)
* UBERF-4302: Added footer to Calendar (#4033)
* UBERF-4325: Boost titles (#4023)

## [0.6.157] - 2023-11-21

* EZQMS-342: Add text editor configurable active highlighted node  (#4019)
* TESTS-71: Feat(tests): updated allure parent suite (#4010)
* UBER-1074: Svelte 4 (#4014)
* UBER-911: Mentions without second input and tabs (#3798)
* UBERF-4229: Fix createAttachments runtime error (#3960)
* UBERF-4324: While indexing is still in progress we see undefined (#4017)
* UBERF-4348: Mentions. Fix render props types and component props types (#4022)

## [0.6.156] - 2023-11-15

* 🚀 FEATURES: *(tests)* Updated tracker.loading.spec.ts test (#3989)
* QFIX: Swapping actions between buttons (#3990)
* UBER-1164: Clickable panel on the desktop app (#3988)
* UBERF-4216: Fix query for cases with mixins (#3981)
* UBERF-4287: Fix Indexer peak memory usage (#3993)
* UBERF-4289: Allow to configure user agent (#3995)

## [0.6.155a] - 2023-11-14

* 🚀 FEATURES: *(ci)* Updated Deploy report to Github Pages flow step (#3984)
* UBERF-4267: Fix mergeQuery, provide a test case for it (#3985)

## [0.6.155] - 2023-11-14

* 🚀 FEATURES: *(tests)* Added allure report for tests (#3944)
* UBERF-4161: Few inbox fixes (#3976)
* UBERF-4205: Updated Panel header layout, custom aside (#3974)
* UBERF-4263: Restore Back and Close button, fixed selectedAside (#3983)

## [0.6.154a] - 2023-11-10

* UBER-942: Few skill fixes (#3971)

## [0.6.154] - 2023-11-10

* EZQMS-360: Platform changes for document comments highlight sync (#3965)
* UBERF-4136: Fix global actions (#3961)
* UBERF-4195: Fix query after applying viewOptions (#3942)

## [0.6.153] - 2023-11-08

* UBERF-4136: New issues from command palette (#3956)

## [0.6.152] - 2023-11-07

* UBER-1127: Updated status bar layout (#3940)
* UBER-1141: Fixed Comments popup layout (#3946)
* UBER-1159: Fixed horizontal scrolling in Scroller (#3945)
* UBER-1161: Remove async to correctly handle query change (#3951)
* UBER-942: Rework skill optimization (#3941)

## [0.6.151] - 2023-11-03

* EZQMS-350: Fix reactions in threads (#3935)
* UBER-1143: Additional skill parsing, increase timeout for filter (#3933)
* UBER-1157: Some dependant fixes (#3936)

## [0.6.150] - 2023-11-01

* 🚀 FEATURES: *(tests)* TESTS-39 done edit issue test (#3918)
* QMS: Fix collaborator editor loading (#3920)
* UBER-1116: Saving sidebar changes (#3919)
* UBER-1137: Prevent changes of spaces while kanban drag-and-drop (#3928)
* UBER-1143: Setting for skill import, redirect to talents from skillsView (#3925)
* UBER-1149: Events in team planing fixes (#3922)
* UBERF-18: Add reactions for comments (#3899)
* UBERF-4132: Fix unexpected delete of documents in query (#3921)
* EZQMS-334: More configurations for radio button and radio group (#3917)

## [0.6.149] - 2023-10-30

* 🚀 FEATURES: *(tests)* TESTS-43 added the Create an issue with all params test (#3905)
* 🐛 BUG FIXES: *(tests)* Updated the today selector for calendar (#3908)* 🐛 BUG FIXES: *(tests)* Updated the today selector for issues page (#3911)
* EZQMS-327: Move inline comments to platform popups (#3909)
* EZQMS-333: Customizable RadioButton label (#3900)
* TESTS-18: Feat(tests): added edit vacancy test (#3901)
* UBER-1101: Updated Separator (Float mode), fixed Scroller visibility (#3902)
* UBER-1146: Fix scrolling in emojis popup (#3912)

## [0.6.148] - 2023-10-26

* UBER-1027: Don't update issue space in kanban view (#3895)
* UBER-634: Focus on SelectPopup (#3897)
* UBER-898: Assignee rules and general rules fix (#3894)

## [0.6.147] - 2023-10-26

* 🚀 FEATURES: *(tests)* Added Change & Save all States test (#3863)* 🚀 FEATURES: *(tests)* TESTS-10 added the Delete the Talent test (#3883)
* EZQMS-306: Add extensions for chunter message version (#3882)
* TESTS-22: Feat(tests): done test Merge Contacts  (#3891)
* TESTS-9: Feat(tests): added edit Talent test (#3871)
* UBER-1088: ListItem fix. (#3872)
* UBER-1097: Remove second status editor amd fix done state selection in new Applicant popup (#3869)
* UBER-1099,-1100: Milestone fixes. (#3873)
* UBER-1106,-1108: Update navigator and button layout (#3870)
* UBER-1128: Fix to many requests from query (#3888)
* UBER-1129: Fix list support attached documents properly (#3889)
* UBER-937: Extensibility changes (#3874)
* UBER-942: Fix-skills script (#3876)
* EZQMS-331: Fix disabled button icon style (#3881)

## [0.6.146] - 2023-10-23

* 🚀 FEATURES: *(tests)* Added delete application test (#3859)

## [0.6.145] - 2023-10-19

* 🚀 FEATURES: *(tests)* Added page-object model example. Refactor login test to page-object model. Added a new test channel.spec.ts (#3847)* 🚀 FEATURES: *(recruiting)* Working on update recruit tests and adding Edit Application test (#3851)
* EZQMS-278: Update comments popups (#3849)* EZQMS-278: Adjust view inline comments UI (#3855)
* EZQMS-291: Fix documents node selections issues (#3845)
* UBER-1085: Improve upgrade tool (#3852)
* UBER-1091: Fix attach button (#3854)
* UBER-921: Improve full text search (#3848)
* UBERF-31: Fix comment edit (#3853)

## [0.6.144] - 2023-10-16

* TEXTEDITOR: Refactor attachments (#3833)
* UBER-1052: Fix remainings (#3844)

## [0.6.142] - 2023-10-13

* UBER-1039: Codeblock style fixes. (#3829)
* UBERF-3997: Fix Tab navigation in text editors (#3832)

## [0.6.141] - 2023-10-11

* UBER-1038: Fix flicking during issue creation (#3826)
* UBER-953: Fix related issues (#3821)

## [0.6.140] - 2023-10-10

* QMS: Update inline comments extensions (#3814)
* UBER-984: UI fixes, Panel auto resize (#3818)

## [0.6.139a] - 2023-10-09

* UBER-955: Added Separator component (#3804)

## [0.6.138] - 2023-10-06

* QFIX: Child info could be empty (#3785)
* UBER-987: Fix emojis in the middle of something (URLs) (#3790)

## [0.6.137] - 2023-10-03

* EZQMS-279: Remove .ProseMirror global css (#3772)
* UBER-974: Fix saved views and mode in filters (#3780)
* UBER-977: A remaining time (#3783)

## [0.6.136] - 2023-10-02

* UBER-963: Related issues (#3773)
* UBERF-17: Missing smiles auto-conversion in rich texts :) (#3771)

## [0.6.135] - 2023-10-01

* EZQMS-266: Commenting on document (#3759)
* UBER-920: Fixed drag and drop in Calendar (#3767)
* UBER-939: Speedup table/kanban (#3764)

## [0.6.134] - 2023-09-29

* CALENDAR: Resize and move event (#3750)
* UBER-845: Add NotificationPresenter to send rich text notifications (#3729)
* UBER-924: Fix file upload progress (#3757)

## [0.6.133] - 2023-09-27

* UBER-902: Fix transactions (#3748)
* UBER-914: Map to mixin after findAll (#3745)
* UBER-916: Navigation from issue to mentioned issue break description (#3746)
* UBER-923: Fix milestone category selector (#3747)

## [0.6.132] - 2023-09-26

* QFIX: Migration (#3734)
* UBER-888: Fixed dragging of the WorkItem (#3735)

## [0.6.131] - 2023-09-22

* UBER-486: Updated people avatars. (#3720)* UBER-486: Replaced avatar colors (#3724)
* UBER-799: Allow extensions to tracker for github (#3727)
* UBER-888: Fixed dragging of the WorkItem (#3730)

## [0.6.130] - 2023-09-20

* UBER-881: Fix labels list view numbers (#3721)

## [0.6.129] - 2023-09-20

* UBER-885: Value filter fix (#3719)

## [0.6.128] - 2023-09-19

* UBER-885: Fix Object filter (#3716)

## [0.6.127] - 2023-09-19

* UBER-882: Fixed popup (#3713)

## [0.6.126] - 2023-09-18

* UBER-784: Updated WorkItemPresenter (#3710)
* UBER-796: Fixed AttachmentActions (#3709)
* UBER-834: Improve list speed (#3692)
* UBER-839: Request the category if it's not in lookup (#3679)
* UBER-841: Allowed to position work item to half hour (#3707)
* UBER-851: Fix titles in ListView (#3678)
* UBER-852: Owner should only see a list of spaces (#3677)
* UBER-854: More proper upgrade notification (#3694)
* UBER-863: Fix employee filter (#3682)
* UBER-869: Fixed mentions in Activity. Fixed messages in Inbox. (#3695)
* UBER-871: Allow to hide/show archived and done in vacancies list (#3701)
* UBER-872: StyleTextEditor: No update when change text in another text (#3698)
* UBERF-81: Replacing the label (#3708)

## [0.6.125] - 2023-09-11

* UBER-828: Fix slow value filter (#3676)

## [0.6.124] - 2023-09-08

* 🐛 BUG FIXES: Trim cookie string before extracting values (#3652)
* ACTIVITY: Remove inline from presenters. DoneStatesPopup fix. (#3664)
* UBER-564: Add sound notification and settings (#3655)
* UBER-674: The calendar starts from the current time. Calendar fixes. (#3671)
* UBER-795: Updated layout of pop-ups. There is always a Back in the Panel. (#3644)* UBER-795: Replacing the Panel with a Dialog, fix circle button in Kanban. (#3659)
* UBER-807: Multiple github repositories fixes (#3646)* UBER-807: Allow to customize create issue dialog (#3669)
* UBER-832: Fixed DatePresenter (#3653)
* UBER-838: Signout button for inactive accounts (#3662)
* UBERF-55: Change editor toolbar behavior and update icons (#3645)
* UBERF-60: Update styles and presenters. (#3651)* UBERF-60: Updated Rich editor and Activity styles. (#3661)* UBERF-60: Updated inline presenters. (#3663)

## [0.6.123] - 2023-08-30

* UBER-675: Updated layout of Radio and Circle button (#3638)
* UBER-816: Fix mentions (#3641)

## [0.6.122] - 2023-08-25

* EZQMS-106: Add elastic search by refs support (#3629)
* UBER-675: Updated pop-ups and components layout (#3631)
* UBER-770: Add custom enum and ref attributes for grouping (#3622)
* UBER-797: Fix popup menu runtime error (#3627)
* UBER-802: Support underline formatting (#3636)
* UBER-803: Fix slow filter (#3634)
* UBER-805: Remove location from grouping (#3635)

## [0.6.121] - 2023-08-24

* UBER-667: UI fixes, displaying All day, time editor. (#3619)
* UBER-762: Fix editor popup menu behavior (#3617)
* UBER-772: Require having employee mixin to allow Staff mixin (#3618)

## [0.6.120a] - 2023-08-22

* 🐛 BUG FIXES: Telegram window not opening (#3615)

## [0.6.120] - 2023-08-22

* UBER-773: Fix List search anv Vacancy view (#3614)

## [0.6.119] - 2023-08-19

* UBER-600: Fix label, fix colours for boolean presenter (#3608)
* UBER-726: Ask to update if manual update is required (#3602)
* UBER-749: Fix no label for unassigned (#3603)
* UBER-771: Use cookie instead of token for images (#3607)

## [0.6.118] - 2023-08-17

* TEAM: Planning UI fixes (#3599)
* UBER-479: Add List view for Vacancies (#3595)
* UBER-500: Confusing Show More button in table (#3590)
* UBER-743: Provide person instead of id as prop (#3592)
* UBER-747: Fix readonly field (#3593)
* UBER-759: Prevent mutations of original object (#3596)

## [0.6.117] - 2023-08-14

* EZQMS-236: QE templates >> Have the ability to make a section mandatory (#3581)

## [0.6.116] - 2023-08-10

* EZQMS-152: Some object selector dropdown items are cut (#3558)
* FIX: Grammatical and stylistic errors (#3552)
* UBER-720: Rework list view to multiple requests (#3578)
* EZQMS-245: Allow configurable languages per deployments (#3579)

## [0.6.115] - 2023-08-08

* UBER-653: Open template folder that is enabled (#3573)
* UBER-710: Fix preference notifications (#3574)

## [0.6.114] - 2023-08-07

* UBER-619: StatusPopup for creating/renaming (#3536)
* UBER-665: Rename EmployeeAccount->PersonAccount (#3550)

## [0.6.113] - 2023-08-03

* UBER-532: Copy issue URL works wrong (#3529)
* UBER-628: Allow reordering when sort is set to manual in the same group (#3553)
* UBER-648: Convert project identifier to upper case (#3546)
* UBER-677: Use State for Leads' status (like applicants do) (#3554)

## [0.6.112b] - 2023-08-01

* UBER-646: Clear the class when view is changed to prevent using old one (#3541)
* EZQMS-241: Account for parent classes configurations in list view (#3537)

## [0.6.112a] - 2023-07-31

* UBER-641: Fixed DatePopup. (#3535)

## [0.6.112] - 2023-07-29

* 🐛 BUG FIXES: Do not shrink expand/collapse icon in tree (#3517)
* ATS-13: Support multiple docs for copying (#3526)* ATS-13: Copy ID action (#3533)
* CALENDAR: Fixed the display of the past days (events) (#3527)
* QFIX: Translate ezqms email confirmation letter to english (#3532)
* TSK-1574: Accurate time reports count (#3509)
* UBER-427: Disable third-nested filters (#3502)
* UBER-550: Clean milestone when moving to another project (#3498)
* UBER-558: Filter out overrides for action popup (#3499)
* UBER-575: Allow per class list view (#3524)
* UBER-593: Hyperlink editor (#3506)
* UBER-601: Fixed accentuation of ObjectPresenter (#3507)
* UBER-609: Fix inbox notification/view for telegram and gmail messages (#3518)
* UBER-614: Fix submenu popups on scrolling (#3530)
* UBER-621: Display field validation rule hint (#3521)
* UBER-642: Use system theme as the default value for application theme (#3534)

## [0.6.111] - 2023-07-13

* ATS-9: Update states once template updates (#3496)
* TSK-336: Mobile UI adaptation (#3492)
* UBER-524: Cleaned CSS, UI fixes. (#3491)

## [0.6.110] - 2023-07-08

* UBER-142: Update buttons. Cleaning CSS. (#3482)
* UBER-298: Add readonly users option to the UserBoxItems component (#3481)
* UBER-413: Allow extensible navigator model (#3477)
* UBER-428: Displaying tooltips with a delay (#3442)
* UBER-462: Prevent creating existing enum value and disable the button in that case (#3465)
* UBER-472: Don't update when it's not needed (#3460)
* UBER-473: Show icon for department (#3472)
* UBER-477: Uberflow dependencies (#3440)
* UBER-498: Replace component shortcut (#3441)
* UBER-504: Correct display of optional presenters (#3452)* UBER-504: Fix presenters on ListItem. Add DeviceSizes. (#3463)
* UBER-505: Fix resolve errors in console (#3449)
* UBER-509: Do not update list of unread right after reading (#3461)
* UBER-513: Fix desktop app navigation (#3459)
* UBER-520: Fix images drag & drop (#3453)
* UBER-525: Fixed popup logic placement for top (#3448)
* UBER-528: Fix desktop navigation (#3450)
* UBER-536: Fix test stability (#3466)
* UBER-537: Review support in inbox (#3471)
* UBER-538: Update ListView layout. Subissues, related issues. (#3467)* UBER-538: Fixed ListView and KanbanView. (#3475)
* UBER-554: Show messages with error and allow resending (#3488)
* UBER-560: Filter out current transaction and get mixin (#3480)
* UBER-572: Fixed overflow for emoji. (#3485)
* UBER-573,-574: Updated button styles, fixed ListView (#3484)

## [0.6.109] - 2023-06-16

* UBER-424: Description not saving fix (#3434)
* UBER-450: Update MentionList. (#3431)
* UBER-480: Fix ValueFilter for space-like objects (#3428)
* UBER-482: Fix 'backspace' in inbox for some objects (#3437)
* UBER-485: Implement icons. (#3433)
* UBER-488: Update selected priority on issue switch (#3436)
* UBER-496: Fix few issues (#3439)

## [0.6.108] - 2023-06-12

* UBER-417: Replace AddSavedView with select popup, allow renaming (#3423)
* UBER-430: Remove old migrations (#3398)
* UBER-471: Fixed maintenance warining. (#3424)
* UBER-476: Duplicate comment fix (#3425)
* UBER-478: Fix issue presenter concurrency (#3426)

## [0.6.107] - 2023-06-09

* UBER-458: Fix submenu (#3416)
* UBER-459: Remove whereSelected line in dropdowns. (#3417)
* UBER-460: Fix admin view (#3420)

## [0.6.106] - 2023-06-08

* UBER-158: New popup dialog (#3409)
* UBER-425: Tooltup/popup fixes (#3404)
* UBER-433: Allow tabs within bullets. (#3399)
* UBER-438: Use tracker as default for new users/workspaces (#3403)
* UBER-439: Fix plurals in russian (#3412)
* UBER-440: Fix link error message (#3406)
* UBER-441,-443: Disable fade in Scroller, change color for link and bg for Diff (#3405)
* UBER-442,-452: Fixed login/signup layout, link, mention and backtick. (#3408)
* UBER-453: Update favicons. (#3414)

## [0.6.104] - 2023-06-07

* UBER-421: Fixed attachment/comment icons (#3392)

## [0.6.103] - 2023-06-07

* UBER-395: Allow to drop images into description (#3382)
* UBER-418: Fix object popup a bit (#3377)

## [0.6.102] - 2023-06-06

* UBER-252: Mode int URL in MyLeads/MyApplications (#3347)
* UBER-371: Retina images for login page (#3351)
* UBER-373: Fix blurry avatars and other images (#3353)
* UBER-377: Fix login (#3358)
* UBER-380: Change icon (#3364)
* UBER-383: Fix null/undefined for URI and numbers (#3359)
* UBER-394: Update tiptap plugins (#3368)
* UBER-397: Fix panel activity (#3370)

## [0.6.101] - 2023-06-05

* UBER-263: Use person after creation (#3304)
* UBER-276: New messages and Has messages option for filter (#3326)
* UBER-318: Allow to configure default language (#3342)
* UBER-358: Fix icons (#3338)
* UBER-364: Adapt updated UI (#3348)
* UBER-369: Do not show number of comments if 0 (#3349)

## [0.6.100] - 2023-06-02

* UBER-137: Fix application search (#3309)
* UBER-170: Navigation for contacts (#3323)
* UBER-172: Fill contact template fields if only one selected (#3299)
* UBER-304: Fixed Navigator (#3312)
* UBER-307,-308,-310,-311,-312: Fixed activity in Inbox (#3298)
* UBER-327: Sub issues/Related issues allow to create from category header (#3317)
* UBER-328: Fixed display in labels. Updated SelectWorkspaceMenu, AccountPopup. (#3314)
* UBER-331: Fix live query update (#3305)
* UBER-338: Added AppSwitcher popup. (#3329)
* UBER-345: Fixed Inbox. (#3325)

## [0.6.99] - 2023-05-30

* UBER-199,-217,-232: Fixed header in ListView, EditMember, ViewOptions (#3273)
* UBER-267: Fix created selection (#3269)
* UBER-270: Enable color more wide (#3279)
* UBER-271: Fix filters (#3293)
* UBER-274,-287,-288,-294: Fixed tooltip, ActionsPopup, ListHeader, activity. (#3282)
* UBER-278: Add Yes-No to popup, refactor (#3289)
* UBER-279: Total qfix (#3281)
* UBER-289: Prevent empty changes to go into transactions. (#3277)
* UBER-295: Fix blur'y popups (#3278)
* UBER-296: Fix create application color selector (#3280)
* UBER-317: Fix issue (#3285)
* UBER-319: Fix vacancy editing (#3290)
* UBER-320: Fix companies filter (#3292)

## [0.6.98a] - 2023-05-28

* UBER-268: List views (#3270)
* UBER-269: Fix mini toggle (#3271)

## [0.6.98] - 2023-05-27

* UBER-187: Inline attachments (#3264)
* UBER-218: Fix createOn -> createdOn (#3266)
* UBER-238: Colors should not use alpha channel (#3255)
* UBER-265: Updated application icons (#3263)
* UBER-266: Fix mongo exceptions (#3267)
* UBER-267: Fix Users popup (#3268)
* UBER-53: My Leads view (#3259)
* UBER-64,-231,-229: Updated CreateProject and SelectAvatar layouts, fixed bugs (#3253)

## [0.6.97] - 2023-05-24

* TSK-1523: Fixed IssuePreview (#3231)
* TSK-1525: Fixed VacancyPresenter (#3237)
* UBER-134: Back references (#3233)
* UBER-135/TSK-1430: Allow changing image in PDFViewer through arrow-keys (keyboard) (#3186)
* UBER-148: My Applications in recruit (#3235)
* UBER-159: Popup dialog for deleting with message if not enough permissions (#3224)
* UBER-182: Fix status object filter (#3250)
* UBER-194,-166,-185: Add application icons, fixed Inbox list and mobile layout (#3229)
* UBER-205: More info to Kanban card (due date, assignee, Lead number) (#3251)
* UBER-206: Redefined color palettes (#3243)
* UBER-219: Updated CreateIssue layout (#3244)
* UBER-47: Attributes for base class (ex. contacts in lead's customers) (#3241)
* UBER-49: Custom fields in CreateLead (#3249)
* UBER-50: Remove funnel browser (#3236)

## [0.6.96] - 2023-05-21

* TSK-1257: Split owner name to first and last name fields (#3156)
* TSK-1402: Fix default assignee when creating issues (#3159)
* TSK-1469,-1470: Added SelectAvatars, UserBoxItems components (#3176)
* TSK-1489: Fixed Components, Milestones, IssueTemplates layout (#3220)
* TSK-1500: Enable compression by default (#3177)
* TSK-760: Fix scroll issue for mac (#3173)
* UBER-122: Fix invalid time report shown (#3191)
* UBER-130: Fix expand/collapse on multiple levels (#3198)
* UBER-136: Fix Exception with custom attributes (#3195)
* UBER-144: Fixed showHeader (#3214)
* UBER-174: Introduce createOn every there (#3222)
* UBER-177: Fixed Filter pop-ups (#3225)
* UBER-48: Custom fields for organization in leads (#3203)
* UBER-54: Attempt to Expand/collapse issue fix (#3183)
* UBER-56: Check if title is hidden for Candidate (Talent) in Kanban and Application. Fix Talent card width in Application (#3196)
* UBER-62: Maintenance warnings (#3210)
* UBER-76: Trigger search after timeout (#3193)
* UBER-81: Fix move project (#3182)
* UBER-83: Add BrowserStack notice into readme (#3178)
* UBER-87: Add new icons (#3188)
* USER-145: Fixed FixedColumn (#3216)
* USER-79: Fixed the sidebar in the Panel. Update IssuePreview layout. (#3201)

## [0.6.95] - 2023-05-12

* TSK-1324: Update popups and colors (#3152)
* TSK-1387: Count cancelled sub-issues as completed (#3158)
* TSK-1418: Make issue notification width smaller (#3160)
* TSK-1429: Rework dueDate to ignore overdue in applicants, kanban and right panel (#3169)
* TSK-1432: Fix popup closing (#3170)
* TSK-1436: Change deleting spaces to removing, add action to move all non-valid requests to correct spaces (#3149)
* TSK-1451: Fix focus issues + jump workaround (#3167)
* TSK-1452: Revert sprint statistics display (#3142)
* TSK-1454: Added varieties to the TabList (#3161)
* TSK-1459: Update Panel layout (#3163)
* TSK-742: Use partial binary protocol with ability on/off (#3153)

## [0.6.94] - 2023-05-04

* TSK-1098: My issues list (#3137)
* TSK-1236: Trigger to remove members when deleting department. Fix for already broken departments (#3120)
* TSK-1257: Add sorting by create time (#3138)
* TSK-1409: Bump. client resources 0.6.16 (#3134)
* TSK-831: Edit issue fixes (#3140)

## [0.6.93] - 2023-05-04

* TSK-1251: My issues action. Hotkeys to lower case (#3122)
* TSK-1337: Ui fixes. (#3133)
* TSK-1394,-1407,-1412,-1417,-1422,-1423: Minor fixes. Fixed Scroller. (#3124)
* TSK-1400: Show 0 in total (time spend reports) (#3127)
* TSK-1414: Fix exceptions in Kanban (#3119)* TSK-1414: Fix exceptions in Kanban (#3119) (#3123)
* TSK-1419: Show greyed requests on holidays and weekends (#3121)
* TSK-1431,-1440: Update AttachmentPresenter. Replace colors, minor fixes. (#3131)

## [0.6.92] - 2023-05-02

* TSK-1166: Sprint editor action (#3110)
* TSK-1206: Drag-drop statuses between categories (#3112)
* TSK-1324: Update kanban layout (#3118)
* TSK-1339: Resize tooltip for dueDate and ignore overdue in done/cancelled (#3113)
* TSK-1393: Fix status findAll requests extra data (#3105)
* TSK-1405: Fix hover selection (#3109)
* TSK-1406: Correct Configuration defaults (#3107)
* TSK-1410,-1408,-1392,-1389,-1386,-1377: Minor fixes. Update IssueNotification layout. (#3117)

## [0.6.91a] - 2023-04-27

* TSK-1339: Show dueDate for cancelled/done issues (#3091)
* TSK-1378: Qfix for exception (#3097)
* TSK-1381: Show preview and Table mouse hover selection (#3098)

## [0.6.91] - 2023-04-27

* TSK-1009: Configurable platform (#3055)
* TSK-1066: Don't allow creating requests if already exists for set days (#3053)
* TSK-1068: Update department for Staff via side panel (#3073)
* TSK-1098: All issues related fixes (#3079)
* TSK-1113: Add issueUrl to notification for sub-issues (#3057)
* TSK-1114: Fix default issue status (#3044)
* TSK-1248: Revert changes and add check for unset field (#3054)
* TSK-1311: Add editors for String and Number (#3056)
* TSK-1312: Refit tooltip after loading components inside it (#3083)
* TSK-1314: Fix slow Kanban open (#3052)
* TSK-1323: Fix colors for list (#3069)
* TSK-1342: Reduce number of transfer data and improve Kanban initial render speed (#3078)
* TSK-1353: Update ListView headers. Replaced colors in settings. (#3086)
* TSK-1375: Sub issue selector icons (#3089)
* TSK-571: Fix keyboard list navigation (#3085)

## [0.6.90] - 2023-04-23

* TSK-1243: Add scroller to project's components list (#3045)

## [0.6.89] - 2023-04-21

* TSK-1047: Fix showing requests after moving staff to another department (#3029)
* TSK-1064: Fix export csv in hr (#3032)
* TSK-1237: Improve full text indexer (#3025)
* TSK-1274: Fix Kanban live updates (#3024)

## [0.6.88] - 2023-04-19

* TSK-1248: Sort null last for dates (#3021)
* TSK-1252: Dispatch update event for attribute bar (#3017)
* TSK-964: Fit popup when component is loaded. Redo cases when popup doesn't fit due to small window sizes (#3022)

## [0.6.87] - 2023-04-19

* TSK-1158: Remove component from sprint. Remove logic for changing component on sprint change (#2998)
* TSK-1248: Fix dueDate sorting order (#3013)
* TSK-808: Ignore initial validation when autofilled for login form (#3012)

## [0.6.86] - 2023-04-17

* TSK-1213: Allow to clean archived vacancies with content (#2999)
* TSK-1216: Fix bitrix import (#3005)
* TSK-753: Open user's department in schedule by default (#3001)

## [0.6.85] - 2023-04-17

* TSK-1032: Add confirmation dialog for projects, fix sprint deleting and allow deleting for Owner or creator only (#2964)
* TSK-1201: Fix bitrix migration and too to clean removed transactions (#2995)

## [0.6.84] - 2023-04-16

* TSK-1200: Fix Applications with wrong state (#2992)

## [0.6.83] - 2023-04-14

* TSK-1062: Work on Employee and EmployeeAccount migration (#2986)
* TSK-1189: Fix showing all available categories (#2987)
* TSK-1194: Fix filter (#2990)

## [0.6.82] - 2023-04-13

* TSK-1152: Fix connections mess (#2969)
* TSK-1153: Fix server model load exceptions (#2967)
* TSK-1154: Statuses table support (#2974)
* TSK-1170: Fix transactions retrieval to speedup of workspace open (#2976)

## [0.6.81] - 2023-04-12

* TSK-1012: Change text names for Organizations to Companies (#2963)
* TSK-1086: Fix merge (#2961)
* TSK-1141: Fix bitrix fields (#2956)
* TSK-1146: Support initial content text for collaborator doc (#2960)
* TSK-1148: Mixin button for Vacancy and NPE fixes (#2965)
* TSK-1150: Rollback svelte (#2966)

## [0.6.80a] - 2023-04-12

* TSK-1089: Proper Recruit Archive (#2952)

## [0.6.80] - 2023-04-11

* TSK-1040: Support editable for DraggableList (#2932)
* TSK-1072: Fix Created by (#2948)
* TSK-1092: Fix reconnect for Safari (#2929)
* TSK-1093: Fix Application doneState showing (#2927)
* TSK-1106: Update to latest packages (#2943)

## [0.6.79] - 2023-04-07

* TSK-1007: Add comments in talent editor (#2922)
* TSK-1013: Add position field to Employee (#2874)
* TSK-1015: Bitrix Create Vacancy/Application (#2913)
* TSK-1038: Fix comments presenter (#2896)
* TSK-1062: Fix merge properly (#2919)
* TSK-1065: Check model version (#2916)
* TSK-1088: Show Kanban counters (#2924)
* TSK-943: General Status support (#2842)
* TSK-990: Remove Back button in settings (#2875)
* TSK-1040: Support draft for DraggableList (#2898)

## [0.6.78] - 2023-04-03

* TSK-1010: Change color for New Customer button (#2870)
* TSK-950: Remove value from filter if the object doesn't exist (#2852)

## [0.6.77] - 2023-03-31

* TSK-839: Fix localization strings (#2833)
* TSK-903: Do not allow saving if set to private with no members (#2854)
* TSK-916: Fix attribute errors in console (#2839)
* TSK-942: Add hours to current time (#2837)
* TSK-955: Fix status display (#2840)
* TSK-960: Move for issues (#2846)
* TSK-963: Show avatar on comments (#2857)
* TSK-976: Hide preview action (#2847)
* TSK-983: Fix Cache control for index pages (#2850)
* TSK-987: Show filter with 0 value (#2855)
* TSK-988: Sticky first column in hr calendar (#2867)
* TSK-989: Transparent requests (PTO, extra, etc.) when not in department or it's descendants (#2861)
* TSK-992: Fix column name in Companies (#2860)

## [0.6.76a] - 2023-03-24

* TSK-897: Allow team-leads and managers to edit descendant departments (#2825)
* TSK-941: Fix incorrect rewriting space after selecting in SpaceSelect (#2827)

## [0.6.76] - 2023-03-24

* TSK-745: Do not allow changing previous months events (Requests and public holidays) (#2796)
* TSK-811: Fix for undefined when saving platform last location (#2790)
* TSK-813: Fix input width and remove divider for time report popup (#2794)
* TSK-825: Client proper reconnection (#2797)
* TSK-831: Edit Title and Description inline (#2788)
* TSK-858: Send picture without text as comment for issues (#2793)
* TSK-885: Fix invalid deps (#2777)
* TSK-912: Notifications on removing the request (#2806)
* TSK-915: Tracker status (#2802)
* TSK-920: Rename CreatedBy field (#2807)
* TSK-924: Follow proper order for Tracker Kanban (#2815)
* TSK-934: Redirect to last location on opening main page (#2817)
* TSK-937: Fix tooltip for employee (#2822)

## [0.6.75b] - 2023-03-21

* TSK-894: Fix template creation and apply (#2785)
* TSK-895: Allow to mention only active employees (#2786)

## [0.6.75a] - 2023-03-21

* TSK-877: Show only Candidates for Application creation dialog (#2784)
* TSK-889: Fix hang and displayName search for Employee (#2783)

## [0.6.75] - 2023-03-21

* TSK-811: Show last workspace location after switching/opening workspace (#2776)
* TSK-813: Remove WorkDayLength and change time reports to hours (#2763)
* TSK-859: Replacing icons. TSK-883: Pop-up for viewing images. (#2782)
* TSK-871: Fix overtime display (#2769)
* TSK-879: Fix empty assignee selection (#2774)
* TSK-890: Fix component icons (#2778)
* TSK-891: Fix UI Tests instability (#2780)

## [0.6.74] - 2023-03-17

* TSK-812: Opening images in the center. Minor design corrections. (#2755)
* TSK-857: Create company button (#2762)

## [0.6.73a] - 2023-03-16

* TSK-568: User-friendly message on join for expired links (#2752)
* TSK-802: Save token to array (#2754)
* TSK-807: Query only active Employees (#2753)
* TSK-849: Show labels in list (#2749)

## [0.6.73] - 2023-03-16

* TSK-791: Handle department's public holidays + add stats for it (#2735)
* TSK-827: Rename Process to Pattern (#2740)
* TSK-837: Fix backup OOM (#2732)
* TSK-838: Created by (#2742)
* TSK-842: Fix resume recognition functionality (#2736)
* TSL-840: Fixed the display of Filtered views (#2743)

## [0.6.72a] - 2023-03-13

* TSK-803: Fix load speed (#2728)

## [0.6.69b] - 2023-03-02

* TSK-761: Team default assignee (#2706)
* TSK-769: Fix channel editor (#2704)

## [0.6.69] - 2023-03-01

* TSK-517: Show 'Last Modified' instead of 'Date' for attachments (#2696)
* TSK-713: Notifications for DM (#2695)
* TSK-728: Server reconnect support (#2689)
* TSK-734: Fix Bitrix email import (#2700)

## [0.6.68] - 2023-02-22

* EZQ-49: Update collaborator (#2677)
* TSK-544: Search by issue number and description (#2675)

## [0.6.67] - 2023-02-20

* TSK-467: Throw error when used for AttachedDoc (#2649)
* TSK-637: Add login and recovery action (#2654)
* TSK-678: Update First/Last names (#2652)
* TSK-679: Add Whatsapp (#2651)
* TSK-685: Prioritise selection when focus exists (#2648)

## [0.6.65] - 2023-02-10

* TSK-651: Fix Team editing (#2611)

## [0.6.64] - 2023-02-08

* TSK-413: Implement scrum recording (#2550)
* TSK-570: Fix RelatedIssues (#2596)
* TSK-608: Move Vacancy support. (#2597)

## [0.6.61] - 2023-01-30

* TSK-476: Bitrix import fixes (#2548)
* TSK-569: Fix MarkupPresenter, ShowMore (#2553)

## [0.6.57] - 2023-01-24

* TSK-553: Fix padding in assignee popup (#2531)

## [0.6.55] - 2023-01-20

* TSK-360: Assignee selection enhancements (#2509)

## [0.6.53a] - 2022-12-30

* TSK-507: Assignee box Direction line is hidden to early (#2485)

## [0.6.52] - 2022-12-22

* TSK-485: Calendar Year/Month summary (#2465)

## [0.6.51] - 2022-12-21

* TSK-473: Added tracker layout sanity tests (#2452)

## [0.6.50] - 2022-12-16

* TSK-487: Resume draft stuck in Resume state (#2443)

## [0.6.49] - 2022-12-15

* TSK-344: Draft for new Candidate/Person etc (#2432)
* TSK-425: Supported team settings (#2406)
* TSK-461: Refactor Tracker/Remember Issues (#2425)

## [0.6.48] - 2022-12-07

* TSK-343: Remember unfinished comment per document (#2400)
* TSK-458: Create of sub-issue not show Issue created notification (#2419)

## [0.6.47] - 2022-12-02

* TSK-419: Update workspaces while open menu (#2413)

## [0.6.46] - 2022-11-29

* ACTIVITY: Filters (#2395)

## [0.6.45] - 2022-11-24

* TSK-397: Fixed time report round (#2389)
* TSK-418: Added working day option (#2393)
* TSK-421: Improve Core testing and coverage (#2387)
* TSK-435: Fix create issue edit focus lost. (#2396)

## [0.6.44] - 2022-11-22

* HR: Update Schedule layout. Fix tooltip and popup. (#2388)
* TSK-399: Allow to delete sprints (#2386)
* TSK-420: Fixed time report placeholders (#2390)

## [0.6.41] - 2022-11-12

* TSK-363: Fixed multiple no sprint category (#2352)
* TSK-364: Fixed filter updates for collapse issues state (#2355)

## [0.6.40] - 2022-11-02

* TSK-212: Add notification on issue created (#2325)
* TSK-342: Add resume issue function (#2332)

## [0.6.34] - 2022-08-25

* TRACKER: Enlarged headers (#2259)

## [0.6.33a] - 2022-08-22

* HR: When hovering over a cell, the day is highlighted. (#2253)

## [0.6.31] - 2022-07-19

* TSK-268: Supported expandable for issue list (#2222)

## [0.6.30c] - 2022-07-10

* TRACKER: Fix issue status colors in the kanban view (#2231)* TRACKER: Refactor ViewOptions (#2228)

## [0.6.30b] - 2022-07-07

* BOARD: Fix show popup actions (#2211)
* TRACKER: Fix colors for issue status icons (#2203)* TRACKER: Fix kanban query (#2204)* TRACKER: Updated status icons (#2215)* TRACKER: Labels on the card. (#2221)* TRACKER: Hide inbox / views (#2224)

## [0.6.30a] - 2022-07-04

* HR: Update schedule layout (#2202)
* USERBOX: Clean up selected for user box on value change (#2199)

## [0.6.30] - 2022-07-02

* AUTOMATION: Disable UI (#2158)
* BOARD: Remove server plugin (#2159)
* EDITBOX: Fixed size calculation (#2181)
* HR: Update values on blur (#2161)
* TRACKER: Fix extra refresh (#2160)* TRACKER: Add relation (#2174)* TRACKER: Workflow statuses (#2171)* TRACKER: Add issues up/down navigator (#2188)

## [0.6.29b] - 2022-06-27

* CHUNTER: Open message links without reload (#2124)

## [0.6.29a] - 2022-06-27

* TRACKER: Parent issues name (#2136)* TRACKER: Sync project with parent (#2137)

## [0.6.29] - 2022-06-25

* ACTIVITY: Fix comments display (#2143)
* AUTOMATION: Initial support (#2134)
* TRACKER: Issues search (#2129)* TRACKER: Introduce Roadmap (#2139)
* UI: Refactor (#2127)

## [0.6.28] - 2022-06-20

* BOARD: Fix header (#2098)
* CHUNTER: Copy link to message (#2078)
* TRACKER: Fix status editor (#2097)

## [0.6.27] - 2022-06-15

* CHUNTER: Add button for link formatting (#2063)
* TSK-112: Fix workbench switch (#2074)
* TSK-81: Disable State delete action (#2076)
* TAGS: Fix collection editor (#2080)* TAGS: Add inline editor (#2081)
* TRACKER: Add priority to sub-issues (#2054)

## [0.6.26] - 2022-06-10

* BOARD: Fix tags/labels for board table view (#2045)* BOARD: Fix attribute views for tags (#2046)* BOARD: Update popups style (#2043)* BOARD: Add labels view (#2047)

## [0.6.25] - 2022-06-08

* TRACKER: Added Projects to the card (#2023)* TRACKER: Updating cards in Kanban (#2032)* TRACKER: Add "Show Sub-issues" toggle into issue list (#2033)

## [0.6.24] - 2022-06-07

* PANEL: Remove full size. Fix popup. (#2007)
* TRACKER: Add project issue list view (#2012)

## [0.6.23] - 2022-06-03

* BOARD: Update server-plugin for task to subscribe to updates on create & update (#1925)
* FLITERBAR: Remove save button (#1937)
* SCROLLER: Added autohide. Fixed track height when displaying table and colors. (#1964)
* TRACKER: Change "Issue" type to "AttachedDoc" (#1875)* TRACKER: Add Sub-issues list (#1989)* TRACKER: Fix console errors in the Issue Editor (#2001)

## [0.6.22] - 2022-05-29

* BOARD: Update actions (#1859)* BOARD: Fix cover presenter (#1872)* BOARD: Checklist item dnd support (#1873)
* HR: Issue fixes (#1891)
* TRACKER: Add "Parent Issue" control to the "Edit Issue" dialog (#1857)

## [0.6.21] - 2022-05-24

* CONTACTS: Type Filter (#1855)

## [0.6.20] - 2022-05-23

* BOARD: Update card (#1826)

## [0.6.19] - 2022-05-22

* BOARD: Add TableView (#1760)* BOARD: Use Standard actions (#1766)* BOARD: Add checklists info (#1772)* BOARD: Add checklist assignee (#1778)* BOARD: Add convert checklist to card action (#1805)
* CHUNTER: Convert direct message to private channel (#1752)* CHUNTER: Open dm on creation if already exists (#1773)* CHUNTER: Formatting (#1804)
* EDITISSUE: Fix "Due date" button style. (#1824)
* HR: Fixes to Vacancy/Application creation (#1753)
* TELEGRAM: Latest messages below. Update AttachmentPreview layout. (#1768)
* TRACKER: Project - Project selector (#1740)* TRACKER: Split "edit issue" dialog to preview / edit (#1731)* TRACKER: Project - Editors (#1779)* TRACKER: Project - Project status buttons (#1793)* TRACKER: Add context menu to the "EditIssue" dialog (#1788)* TRACKER: "Edit Issue" dialog adjustments (#1810)

## [0.6.18] - 2022-05-15

* BOARD: Initial checklist support (#1672)* BOARD: Refactor AddPanel with TextAreaEditor (#1720)* BOARD: Fix copy from message* BOARD: Fix push/pull activity (#1718)
* CHUNTER: User status (#1608) (#1692)
* TRACKER: Issue filters - additional features (#1708)

## [0.6.15] - 2022-05-05

* BOARD: Remove stale left panel items (#1574)* BOARD: Fix card members update (#1620)* BOARD: Checklists model adjustments (#1633)
* CHUNTER: File browser additional fixes (#1547)* CHUNTER: Download file action (#1570)* CHUNTER: FileBrowser - add grid view (#1571)* CHUNTER: FileBrowser - replace px with rem (#1582)* CHUNTER: Remove attachments only for creator (#1552)* CHUNTER: Private channel & add channel members ui (#1524) (#1589)
* EDITISSUE: Add due date to the right panel (#1272) (#1642)
* TRACKER: Fix IssuesList selection (#1578)* TRACKER: Rewrite AssigneePresenter (#1568)* TRACKER: Fix issue status view for "Activity" (#1632)* TRACKER: Fix issue priority view for "Activity" (#1635)* TRACKER: Issue filters - main functionality (#1640)

## [0.6.14] - 2022-04-26

* BOARD: Add open card inline menu (#1511)* BOARD: Handle labels when move card to another board (#1538)* BOARD: Make context menu consistent (#1542)
* CHUNTER: Avatars in dm header and highlight on first message (#1499)* CHUNTER: Saved attachments (#1515)
* TRACKER: Add keyboard support for issues list (#1539)

## [0.6.13] - 2022-04-24

* BOARD: Add create / edit card label popup* BOARD: Fix lint issues* BOARD: Update Date Presenter to reuse as presenter* BOARD: Fix formatting* BOARD: Use  /  for card labels update* BOARD: Use  for join action* BOARD: Add labels & members & date to Kanban Card (#1462)* BOARD: Fix popup alignments (#1467)* BOARD: Add attachment action (#1474)* BOARD: Extend popup positioning for Kanban card (#1483)* BOARD: Add kanban card edit mode (#1484)
* CHUNTER: Saved messages (#1466)* CHUNTER: Direct messages (#1472)* CHUNTER: File browser (#1407) (#1488)
* TRACKER: View options - Grouping (#1442)* TRACKER: Status should be positioned at same offset (#1464)* TRACKER: View options - Completed issues period, empty groups display (#1490)* TRACKER: Move "IssueStatus" enum into model (#1449)

## [0.6.12] - 2022-04-18

* BOARD: Create board labels (#1426)* BOARD: Add card labels picker popup (#1434)
* CHUNTER: Archive channel (#1416)

## [0.6.11] - 2022-04-17

* BOARD: Design card editor (initial) (#1292)* BOARD: 1265: Make Card Actions extensible (#1319)* BOARD: Update board card model (#1329)* BOARD: Add new card actions + Join Card Action example (#1335)* BOARD: Add card details (members, labels, date) (#1376)* BOARD: Add button shape and title props (#1381)* BOARD: Fix card live updates (#1403)* BOARD: Add attachments support* BOARD: Fix labels model (#1405)* BOARD: Fix infinite loop in Activity component for space update (#1417)
* CHUNTER: Channel attributes (#1334)* CHUNTER: Delete message (#1336)* CHUNTER: Update channel last message and close thread on deletion from other user (#1389)* CHUNTER: Pin messages (#1396)* CHUNTER: Attachments table in channel description (#1402)* CHUNTER: Attachments and format updates (#1410)* CHUNTER: Show "edited" label and cancel button (#1411)
* TRACKER: Board view (#1325)* TRACKER: Issues list view (#1313)* TRACKER: Issue List – Priority presenter (#1382)* TRACKER: Improve CheckBox (#1356)* TRACKER: Issue List – Status presenter (#1383)* TRACKER: Issue List – Assignee presenter (#1384)* TRACKER: Issue List - DueDate presenter (#1393)

## [0.6.8] - 2022-03-19

* UPD: DataPicker with region selection. Presenters. (#1153)

## [0.6.0] - 2021-11-22

* CLEAN: Package.json

<!-- generated by git-cliff -->
