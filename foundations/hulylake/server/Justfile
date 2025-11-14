workspace := "4cd5a9d5-7c74-47b1-ac93-265f0bcc73af"
key := "abcd"
headers := '-H "Content-Type:" -H "huly-header-x-test: test" -H "huly-meta-x-test: test"'
token := `cat _hidden/token.txt`


put:    
    curl -X PUT -i -H "Authorization: Bearer {{token}}" -H @_hidden/headers.txt --data-binary @_hidden/data_large.bin http://localhost:8096/api/{{workspace}}/{{key}}

get:
    curl -X GET -s -D - -H "Authorization: Bearer {{token}}" -H @_hidden/headers.txt -o _hidden/data_output.bin http://localhost:8096/api/{{workspace}}/{{key}} 
