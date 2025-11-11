res=''
port=$1
echo "Warning Elastic to up and running with attachment processor... ${port}"
for i in `seq 1 30`;
do
  res=$(curl -s http://localhost:${port}/_cluster/health )
  echo "$res"
  if [[ $res = *"yellow"* ]]; then
    echo "Elastic up and running..."
    exit 0
  fi
  if [[ $res = *"green"* ]]; then
    echo "Elastic up and running..."
    exit 0
  fi
  sleep 1
done