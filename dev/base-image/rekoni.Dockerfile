FROM hardcoreeng/base

RUN apt-get install -y \
  coreutils \
  antiword \
  poppler-utils \
  html2text \
  unrtf
RUN npm install --ignore-scripts=false --verbose sharp@v0.30.2 pdfjs-dist@v2.12.313 --unsafe-perm