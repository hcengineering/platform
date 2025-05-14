set -e

registry=hardcoreeng
tag=$(git describe --tags --abbrev=0)

find services.d/ -type f -name "*.service" ! -name "-*" | sort | while read -r file; do
    extern=$(cat $file | grep -v -e '^[[:space:]]*$' -e '^#' | head -n 1 | tr -d '[:space:]')

    if [ ! -z $extern ]; then
        repo=$(echo $extern | cut -d'/' -f2 | cut -d':' -f1)
        local=$registry/$repo:$tag
        docker buildx imagetools create --tag $local $extern

        echo "Copy: $extern -> $local"
    fi
done

exit 0