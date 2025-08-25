clear

#cd hulykvs_server && 

# docker buildx build --tag=hardcoreeng/hulykvs:latest --platform=linux/amd64 --load .


docker buildx build --tag=hardcoreeng/hulypulse:latest --platform=linux/amd64 .

# linux/arm64

# docker buildx build --tag=hardcoreeng/hulykvs:latest --platform=linux/amd64 .

# --load 
