#!/bin/bash

# Çıktı dosyasının adı
output_file="en_json_paths.txt"

# /home/dxdiagyldz/platform dizininden başlayarak en.json dosyalarını ara
# find komutu:
#   -type f        : Sadece normal dosyaları ara.
#   -name "en.json" : "en.json" ismine sahip dosyaları ara.
#   -print         : Bulunan dosya yollarını yazdır.
#   2>/dev/null    : Hata mesajlarını (örneğin, erişim izni olmayan dizinler) gizle.
#
# > "$output_file" :  find komutunun çıktısını (bulunan dosya yolları) $output_file değişkeninde
#                     belirtilen dosyaya yönlendir (dosyayı oluşturur veya üzerine yazar).

find /home/dxdiagyldz/platform -type f -name "en.json" -print 2>/dev/null > "$output_file"

# İşlem tamamlandı mesajı (isteğe bağlı)
echo "en.json dosya yolları $output_file dosyasına kaydedildi."

# Dosyanın içeriğini görüntüle (isteğe bağlı)
# cat "$output_file"