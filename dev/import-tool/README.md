### Unified Huly Import Format

Please check out the example under [example](./example/) folder.

1. First level folders represents spaces in Huly. Space details are located in README.md inside the folder. Folders without README.md will be ignored.
2. Huly document will be created for every MD file inside the space folder.
3. Name of the MD file will be taken as an identifer for the created document.
4. Subdocuments are located in the folder with the corresponding name.  
(For example: *HULY-1* has subissues: *HULY-2, HULY-3, HULY-4, HULY-5*)
5. Each MD file contains a header with document details in YAML format and the document content in markdown format. The content should be separated from the header with one divider line.

#### Yaml Header Format:
1. Attribute **class** is required. Allowed values:
    * *document.class.Document* - for Wiki Documents
    * *tracker.class.Issue* - for Issues
2. Issue **status** should match with coresponding task type, defined in root README.md.  
Allowed **status** values for issues of Classic Project (default predefined project type in Huly):
    * *Backlog*
    * *Todo*
    * *In Progress*
    * *Done*
    * *Canceled*
3. Allowed issue **priority** values:
    * *Low*
    * *Medium*
    * *High*
    * *Urgent*

