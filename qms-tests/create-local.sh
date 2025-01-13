./tool-local.sh create-account user1 -f John -l Appleseed -p 1234
./tool-local.sh create-account user2 -f Kainin -l Dirak -p 1234
./tool-local.sh create-account user3 -f Cain -l Velasquez -p 1234
./tool-local.sh create-account user4 -f Armin -l Karmin -p 1234
./tool-local.sh create-account user_qara -f Qara -l Admin -p 1234

# Create init workspace
./tool-local.sh create-workspace init-ws-qms email:user1
./tool-local.sh configure init-ws-qms --enable=*
./tool-local.sh configure init-ws-qms --list

./tool-local.sh create-workspace sanity-ws-qms email:user1
