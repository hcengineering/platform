echo "Start profiling on server"
token=$(./tool.sh generate-token --admin anticrm@hc.engineering sanity-ws)
curl -X PUT "http://huly.local:3334/api/v1/manage?token=${token}&operation=profile-start"
