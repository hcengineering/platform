$MODEL_VERSION = node ../common/scripts/show_version.js | Out-String
$MODEL_VERSION = $MODEL_VERSION.Trim()

$VERSION = node ../common/scripts/show_tag.js | Out-String
$VERSION = $VERSION.Trim()

$env:NODE_ENV = "development"

electron --no-sandbox ./
