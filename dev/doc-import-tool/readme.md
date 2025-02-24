_Note: if vscode fails to resolve docx4js.d.ts types the following fragment need to be added to compilerOptions in tsconfig.json_

```
    "typeRoots": [
      "./src/type",
      "./node_modules/@types"
    ],
```