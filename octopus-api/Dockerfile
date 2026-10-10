# Forwarder only. octopus-api lives in its own repository
# (github.com/iamkn1ght/octopus-api) and runs at
# https://octopus-api-production.up.railway.app. This service keeps the
# previous address working by passing every request through unchanged.
FROM caddy:2.8.4-alpine
COPY Caddyfile /etc/caddy/Caddyfile
