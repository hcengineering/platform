res=''
echo "Warting Elastic to up and running with attachment processor..."
while true
do
  res=$(curl -s -XPUT "localhost:9201/_ingest/pipeline/attachment?pretty" -H 'Content-Type: application/json' -d'
  {
    "description" : "Field for processing file attachments",
    "processors" : [
      {
        "attachment" : {
          "field" : "data"
        },
        "remove" : {
          "field" : "data"
        }
      }
    ]
  }
  ')
  if [[ $res = *"acknowledged"* ]]; then
    echo "Elastic processor is up and running..."
    exit 0
  fi
  sleep 1
done