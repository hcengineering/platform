#!/bin/bash

# en.json dosyalarının listesi (es.json dosyalarını bulmak için kullanacağız)
en_json_files=(
  /home/dxdiagyldz/platform/services/github/github-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/calendar-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/uploader-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/diffview-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/notification-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/guest-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/tracker-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/time-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/card-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/recruit-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/bitrix-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/mail-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/setting-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/love-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/lead-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/hr-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/desktop-preferences-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/recorder-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/controlled-documents-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/tags-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/workbench-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/request-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/analytics-collector-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/gmail-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/board-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/text-editor-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/contact-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/preference-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/test-management-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/print-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/task-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/support-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/chunter-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/drive-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/templates-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/products-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/telegram-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/training-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/attachment-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/my-space-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/login-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/document-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/activity-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/questions-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/view-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/inventory-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/survey-assets/lang/en.json
  /home/dxdiagyldz/platform/plugins/onboard-assets/lang/en.json
  /home/dxdiagyldz/platform/packages/platform/lang/en.json
  /home/dxdiagyldz/platform/packages/platform/src/__tests__/lang/en.json
  /home/dxdiagyldz/platform/packages/ui/lang/en.json
  /home/dxdiagyldz/platform/packages/presentation/lang/en.json
  /home/dxdiagyldz/platform/packages/core/lang/en.json
  /home/dxdiagyldz/platform/server/account/lang/en.json
)

# Her bir en.json dosyası için döngü
for en_file in "${en_json_files[@]}"; do
  # es.json dosya adını oluştur
  es_file="${en_file/en.json/es.json}"

  # grep komutu ile "huly" stringini ara (büyük/küçük harf duyarsız) ve sonuçları yazdır
  # -i : büyük/küçük harf duyarsız (case-insensitive) arama
  # -n : satır numarasını göster
  # -F : stringi sabit metin olarak ara (regex yorumlama yapma)
  # -H : dosya adını her eşleşmede göster
  grep -i -n -F "huly" "$es_file"
done