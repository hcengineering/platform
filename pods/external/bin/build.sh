set -e

registry=hardcoreeng
tag=latest

find services.d/ -type f -name "*.service" ! -name "-*" | sort | while read -r file; do
    extern=$(cat $file | grep -v -e '^[[:space:]]*$' -e '^#' | head -n 1 | tr -d '[:space:]')

    if [ ! -z $extern ]; then
        repo=$(echo $extern | cut -d'/' -f2 | cut -d':' -f1)
        pulled=$(docker pull --quiet $extern)
        local=$registry/$repo:$tag

        docker tag $extern $local

        echo "Pull&Tag: $pulled -> $local"
    fi
done

exit 0