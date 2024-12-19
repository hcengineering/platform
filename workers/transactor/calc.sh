#!/bin/bash
files=$(cat ./dist/index.js|grep node_modules | grep //)

declare -a file_info

# Iterate over each line in $files
while IFS= read -r line; do
    file=${line##*//}
    size=$(ls -l $file 2>/dev/null | awk '{print $5}')     
    # echo "Processing: $file $size"
    
    if [ ! -z "$size" ]; then
        # Store size and path together
        file_info+=("$size:$file")
    fi
done <<< "$files"

# Sort the array by size (numerically, in descending order) and print
printf '%s\n' "${file_info[@]}" | sort -t: -k1,1nr | while IFS=: read -r size path; do
    echo "Size: $(($size/1024)) KB - $path"
done