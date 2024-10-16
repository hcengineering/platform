# Create init workspace
./tool-local.sh  create-workspace init-ws-qms -w InitTest
./tool-local.sh  configure init-ws-qms --enable=*
./tool-local.sh  configure init-ws-qms --list

# Create workspace record in accounts
./tool-local.sh create-workspace sanity-ws-qms -w SanityTest
# Create user record in accounts
./tool-local.sh create-account user1 -f John -l Appleseed -p 1234
./tool-local.sh confirm-email user1
# Create second user record in accounts
./tool-local.sh create-account user2 -f Kainin -l Dirak -p 1234
./tool-local.sh confirm-email user2
# Create third user record in accounts
./tool-local.sh create-account user3 -f Cain -l Velasquez -p 1234
./tool-local.sh confirm-email user3
# Create fourth user record in accounts
./tool-local.sh create-account user4 -f Armin -l Karmin -p 1234
./tool-local.sh confirm-email user4

./tool-local.sh create-account user_qara -f Qara -l Admin -p 1234
./tool-local.sh confirm-email user_qara