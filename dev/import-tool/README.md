## How to Import Documents from Notion

To import Notion documents:

1. Export documents from Notion as *Markdown & CSV*
2. Extract the exported archive
3. 1. If you want your docs to be imported along with Notion teamspaces, use this command:


```
rushx run-local import-notion-with-teamspaces ${dir} \
--user ${user} \
--password ${password} \
--workspace ${workspace}
```

3.  2. If you want the docs to be imported to a new teamspace, use this command:

```
rushx run-local import-notion-to-teamspace {dir} \
--user ${user} \
--password ${password} \
--workspace ${workspace} \
--teamspace ${teamspace}
```

* *dir* - path to the root of the extracted archive
* *user* - your username or email
* *password* - password
* *workspace* - workspace name where the documents should be imported to
* *teamspace* - teamspace to be created for newly imported docs


### Examples

#### For local run:
When importing Notion workspace with teamspaces
```
rushx run-local import-notion-with-teamspaces /home/john/extracted-notion-docs \
--user john.doe@gmail.com \  
--password qwe1234 \       
--workspace ws1
```
When importing Notion workspace without teamspaces or a page with subpages
```
rushx run-local import-notion-to-teamspace /home/john/extracted-notion-docs \
--user john.doe@gmail.com \
--password qwe1234 \
--workspace ws1 \
--teamspace imported
```

#### For cloud deployment:
##### Here is an example for those who's using huly.app cloud:
1. Go to the root folder of the extracted archive with exported data.
2. Run import command as follow:

* To import Notion workspace with teamspaces
```
docker run \
  -e SERVER_SECRET="" \
  -e ACCOUNTS_URL="https://account.huly.app" \
  -e FRONT_URL="https://huly.app" \
  -v $(pwd):/data \
  hardcoreeng/tool:latest \
  -- bundle.js import-notion-with-teamspaces /data \
--user jane.doe@gmail.com \
--password 4321qwe \
--workspace ws1
```
* To import Notion workspace without teamspaces or a page with subpages.
```
docker run \
  -e SERVER_SECRET="" \
  -e ACCOUNTS_URL="https://account.huly.app" \
  -e FRONT_URL="https://huly.app" \
  -v $(pwd):/data \
  hardcoreeng/tool:latest \
  -- bundle.js import-notion-to-teamspace /data \
--user jane.doe@gmail.com \
--password 4321qwe \
--workspace ws1 \
--teamspace notion
```
