echo "Downloading profile"
token=$(./tool.sh generate-token --admin anticrm@hc.engineering sanity-ws)
current=$(date +%Y%m%d%H%M%S)
mkdir -p ./profiles
curl -X PUT "http://localhost:3334/api/v1/manage?token=${token}&operation=profile-stop" -o "./profiles/profile-${current}".cpuprofile
