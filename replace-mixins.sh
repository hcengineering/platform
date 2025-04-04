#!/bin/bash

# Скрипт для замены миксинов full-width и fit-width на соответствующие переменные

# Директория с файлами стилей
STYLES_DIR="packages/theme/styles"

# Заменяем миксин full-width
echo "Заменяем @include full-width на прямое использование переменных"
find $STYLES_DIR -type f -name "*.scss" -exec sed -i '' 's/@include full-width;/width: $full-width; min-width: 0;/g' {} \;
find $STYLES_DIR -type f -name "*.scss" -exec sed -i '' 's/{ @include full-width; /{ width: $full-width; min-width: 0; /g' {} \;
find $STYLES_DIR -type f -name "*.scss" -exec sed -i '' 's/button.type-link { @include full-width; }/button.type-link { width: $full-width; min-width: 0; }/g' {} \;

# Заменяем миксин fit-width
echo "Заменяем @include fit-width на прямое использование переменных"
find $STYLES_DIR -type f -name "*.scss" -exec sed -i '' 's/@include fit-width;/width: $fit-width; min-width: 0;/g' {} \;
find $STYLES_DIR -type f -name "*.scss" -exec sed -i '' 's/{ @include fit-width; /{ width: $fit-width; min-width: 0; /g' {} \;

echo "Замена миксинов завершена. Проверьте результаты и запустите проект для проверки работоспособности." 