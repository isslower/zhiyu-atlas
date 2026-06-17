#!/bin/sh
set -eu

cat > /usr/share/nginx/html/config.json <<EOF
{
  "amapKey": "${AMAP_KEY}",
  "amapSecurityCode": "${AMAP_SECURITY_CODE}"
}
EOF
