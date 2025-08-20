workspace := "4cd5a9d5-7c74-47b1-ac93-265f0bcc73af"


put:    
    curl -X PUT -H "Authorization: Bearer $(cat _hidden/token.txt)" --data @_hidden/data.bin http://localhost:8096/api/{{workspace}}/abcd
