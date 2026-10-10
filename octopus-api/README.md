# octopus-api has its own repository

**https://github.com/iamkn1ght/octopus-api** · API: `https://octopus-api-production.up.railway.app`

This folder only holds a forwarder that keeps the previous address
(`klokd-production.up.railway.app`) working for older app builds and partner
webhooks. Delete it, and the Railway `klokd` service, once nothing calls the
old address.
