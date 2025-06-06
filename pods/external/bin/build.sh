set -e

registry=hardcoreeng
tag=latest

find services.d/ -type f -name "*.service" ! -name "-*" | sort | while read -r file; do
    line=$(cat $file | grep -v -e '^[[:space:]]*$' -e '^#' | head -n 1)

    target_repo=$(echo $line | cut -d ' ' -f1 | tr -d '[:space:]')
    source=$(echo $line | cut -d ' ' -f2 | tr -d '[:space:]') 

    if [ ! -z $target_repo ] && [ ! -z $source ]; then
        target=$registry/$target_repo:$tag

        docker pull --quiet $source > /dev/null
        docker tag $source $target

        echo "Pull&Tag: $source -> $target"
    fi
done

exit 0