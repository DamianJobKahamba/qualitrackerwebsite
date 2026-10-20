#!/usr/bin/env bash
# READ-ONLY inventory of the Contabo server (5.189.158.117). Changes nothing.
# Prints NO secrets: it never prints the contents of .env/config files, only variable NAMES,
# and it masks values in cron lines and credentials inside git URLs.
# Run:  sudo bash contabo-inventory.sh > inventory.txt 2>&1     then send inventory.txt to the team.
# Review inventory.txt before sharing; if anything looks sensitive, delete that line.
set -u
section() { printf '\n===== %s =====\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

section "host"; hostname; uname -srm; { . /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; } || true; uptime
section "disk and memory"; df -h / /var /home 2>/dev/null | sort -u; free -m
section "listening ports"; ss -tlnp 2>/dev/null | awk 'NR==1 || /LISTEN/' || true
section "running services"; systemctl list-units --type=service --state=running --no-pager 2>/dev/null | head -40 || true
section "containers"
if have docker; then docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'; docker volume ls 2>/dev/null; else echo "docker: not installed"; fi
section "node / pm2 / other app processes"
have node && echo "node $(node -v)"; have npm && echo "npm $(npm -v)"
if have pm2; then pm2 list 2>/dev/null | head -30; fi
ps -eo pid,user,etime,cmd 2>/dev/null | grep -E 'node|npm|pm2|gunicorn|uvicorn|php-fpm|python|java' | grep -v grep | cut -c1-170 || true
section "nginx sites (server_name / listen / root / proxy_pass only)"
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  [ -f "$f" ] || continue
  echo "--- $f"; grep -E '^\s*(server_name|listen|root|proxy_pass|location|client_max_body_size)' "$f" | sed 's/^\s*//'
done
section "tls certificates (names and expiry)"
if have certbot; then certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'; else ls /etc/letsencrypt/live 2>/dev/null || echo "no certbot / letsencrypt directory"; fi
section "databases (services and database files; never contents)"
for s in postgresql mysql mariadb mongod redis-server redis; do systemctl is-active --quiet "$s" 2>/dev/null && echo "service running: $s"; done
find / -xdev \( -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' \) \
  -not -path '*/node_modules/*' -not -path '/proc/*' -not -path '/usr/*' -not -path '/var/lib/dpkg/*' \
  -not -path '/snap/*' -not -path '/var/cache/*' 2>/dev/null | head -20 | while read -r f; do echo "$f  $(du -h "$f" | cut -f1)"; done
section "application folders (names and sizes only)"
for d in /var/www /srv /opt /home/*; do [ -d "$d" ] && du -sh "$d"/* 2>/dev/null | head -15; done
section "git repositories on the server (remote URLs, credentials masked)"
find /var/www /srv /opt /home -maxdepth 4 -name .git -type d 2>/dev/null | while read -r g; do
  r=$(dirname "$g"); echo "$r  ->  $(git -C "$r" remote get-url origin 2>/dev/null | sed -E 's#//[^@/]+@#//<hidden>@#')  [branch: $(git -C "$r" rev-parse --abbrev-ref HEAD 2>/dev/null), last commit: $(git -C "$r" log -1 --format=%cd --date=short 2>/dev/null)]"
done
section ".env style files: PATH and variable NAMES only (values never printed)"
find /var/www /srv /opt /home -maxdepth 4 \( -name '.env' -o -name '.env.*' -o -name 'config.json' \) -not -path '*/node_modules/*' 2>/dev/null | while read -r f; do
  echo "--- $f ($(stat -c '%a %U' "$f" 2>/dev/null))"; case "$f" in *.json) echo "(json: keys not listed)";; *) grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$f" | cut -d= -f1 | sed 's/^/   /';; esac
done
section "scheduled jobs (values masked)"
{ crontab -l 2>/dev/null; sudo -n crontab -l 2>/dev/null; cat /etc/cron.d/* 2>/dev/null; } | grep -vE '^\s*#|^\s*$' | sed -E 's/([A-Za-z_]+=)[^ ]+/\1<hidden>/g' | cut -c1-170 || true
systemctl list-timers --no-pager 2>/dev/null | head -12 || true
section "mail / firewall"
for s in postfix exim4 sendmail; do systemctl is-active --quiet "$s" 2>/dev/null && echo "mail service running: $s"; done
have ufw && ufw status 2>/dev/null | head -12
section "who can log in"; awk -F: '$7 !~ /(nologin|false)$/ {print $1" "$7}' /etc/passwd
echo; echo "===== done: $(date -u +%FT%TZ) ====="
