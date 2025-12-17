# set -e

# registry=hardcoreeng
# tag=latest

# # Create temp directory for tracking built images
# temp_dir=".build-cache"
# mkdir -p "$temp_dir"

# # Add to .gitignore if not already present
# if [ -f .gitignore ]; then
#     grep -qxF "$temp_dir" .gitignore || echo "$temp_dir" >> .gitignore
# else
#     echo "$temp_dir" > .gitignore
# fi

# find services.d/ -type f -name "*.service" ! -name "-*" | sort | while read -r file; do
#     line=$(cat $file | grep -v -e '^[[:space:]]*$' -e '^#' | head -n 1)

#     target_repo=$(echo $line | cut -d ' ' -f1 | tr -d '[:space:]')
#     source=$(echo $line | cut -d ' ' -f2 | tr -d '[:space:]') 

#     if [ ! -z $target_repo ] && [ ! -z $source ]; then
#         target=$registry/$target_repo:$tag

#         # Check if target image already exists locally
#         if docker image inspect "$target" > /dev/null 2>&1; then
#             echo "Exists (skipping): $target"
#             continue
#         fi

#         docker pull --quiet $source > /dev/null
#         docker tag $source $target

#         echo "Pull&Tag: $source -> $target"
#     fi
# done

# exit 0