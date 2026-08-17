# opshub.it — sito pubblicitario (GitHub Pages)

Questo repository contiene **solo** il sito marketing statico di OpsHub.

Il sistema operativo (login, dashboard, API, cantieri) resta su **https://bot.ops-on.site** e **non** è in questo repo.

## Rigenerare lo snapshot

Dal repository SaaS locale (`bot2`):

```
python scripts/export_marketing_site.py
```

Poi, in questa cartella:

```
git add -A
git commit -m "Update marketing snapshot"
git push origin main
```

## DNS Cloudflare (zona opshub.it)

1. Togliere `opshub.it` / `www` dal tunnel `cloudflared` (restano su tunnel solo `bot.ops-on.site` e MinIO).
2. Record GitHub Pages per apex:
   - `A` @ → `185.199.108.153` `185.199.109.153` `185.199.110.153` `185.199.111.153`
   - `CNAME` www → `opshub.it`
3. In GitHub: Settings → Pages → Custom domain `opshub.it` → Enforce HTTPS.
4. Accedi e i form lead puntano a `https://bot.ops-on.site`.
