# Brand: logo + favicon

Moi project ca nhan dung chung mot phong cach "mochi kawaii". Nguon duy nhat:
`brand/generate.mjs`. Khong ve tay logo rieng cho tung app.

## Quy tac

1. Khung: o vuong bo tron (rx 128/512), net vien `#3d2b4f` day 16.
2. Nen: 1 mau pastel rieng cho moi app (bang `APPS` trong `generate.mjs`), khong trung app khac.
3. Linh vat: banh mochi trang, mat cham co diem sang, ma hong, mieng "ω". Giong nhau o moi app.
4. Huy hieu goc phai tren: 1–2 ky tu nhan dien app (CK, N, $...). Day la phan duy nhat khac nhau ngoai mau.
5. Ngoi sao lap lanh goc trai tren.
6. Khong dung, khong sao chep, khong lam mau dau vao tu logo cua nguoi khac (vi du KawaiiLogos cua Sawaratsuki: license cam dung cho AI). Chi lay cam hung chung "kawaii": bo tron, pastel, mat cute.

## File moi app phai co

| File | Dung cho |
| --- | --- |
| `favicon.svg` | `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` |
| `favicon-32.png` | fallback trinh duyet cu |
| `apple-touch-icon.png` (180) | `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` |
| `icon-512.png` | PWA manifest, og/logo trong app |

Logo trong giao dien (header, trang login) dung lai `favicon.svg`.

## Them app moi

1. Them 1 dong vao `APPS` trong `brand/generate.mjs` (mau pastel moi + ky tu).
2. `node brand/generate.mjs <app>` → `brand/out/<app>/`.
3. Copy 4 file vao thu muc public cua app, them 2 the `<link>` o tren.
4. Smoke `readonly-smoke` cua app kiem tra `GET /favicon.svg` = 200.
