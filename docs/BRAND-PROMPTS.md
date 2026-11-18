# Brand prompts: favicon và ảnh minh hoạ

Prompt dán vào Codex CLI, Gemini CLI hoặc Claude Code để mọi app dùng chung style "mochi kawaii" trong
[BRAND.md](BRAND.md). Favicon luôn đi qua `brand/generate.mjs`; mô hình tạo ảnh chỉ dùng cho ảnh minh hoạ lớn.

## A. Gắn favicon cho một repo (agent)

Chạy trong repo cần icon:

```
Gắn favicon cho repo này theo chuẩn brand "mochi kawaii" của nguyenhuy158.
1. Đọc nguyenhuy158/kit: docs/BRAND.md và brand/generate.mjs (clone ~/Documents/personal-projects/kit, git pull trước).
2. Nếu repo chưa có trong APPS: thêm 1 dòng { bg: <màu pastel chưa app nào dùng>, badge: <1-2 ký tự nhận diện app> } — mở PR riêng vào kit. Không đổi logoSvg, không vẽ tay.
3. Chạy: node brand/generate.mjs <app>  (cần rsvg-convert).
4. Copy favicon.svg, favicon-32.png, apple-touch-icon.png, icon-512.png vào thư mục public/static của repo; xoá favicon cũ khác style.
5. Thêm vào <head>: <link rel="icon" type="image/svg+xml" href="/favicon.svg"> và <link rel="apple-touch-icon" href="/apple-touch-icon.png">; manifest dùng icon-512.png. Logo header/login dùng lại favicon.svg.
6. Smoke test: GET /favicon.svg trả 200. Chụp màn hình tab trình duyệt có favicon.
7. Làm trong worktree + PR, PR body ghi màu + badge đã chọn.
Không dùng mô hình tạo ảnh cho favicon. Không sao chép logo của người khác.
```

## B. Ảnh minh hoạ (OG image, splash) bằng mô hình tạo ảnh

Thay `<BG_HEX>` và `<BADGE>` bằng giá trị của app trong `APPS`. Không dùng kết quả làm favicon.

```
Flat vector illustration, kawaii "mochi" mascot: a soft white rice-cake blob with two oval dark eyes
(small white highlight), pink blush ovals, tiny "ω" mouth. Thick rounded outline in #3d2b4f, no gradients,
no shadows, no texture. Square card with large rounded corners filled with pastel <BG_HEX>.
Top-right: white circle badge with bold rounded text "<BADGE>" in #3d2b4f. Top-left: small white
four-point sparkle with the same outline. Centered, generous padding, readable at 32px.
Style: minimal, clean, consistent sticker set. No other text, no letters except the badge,
no realistic rendering, no copying existing logos or characters.
```

## Kiểm tra trước khi merge

- Màu nền chưa trùng app khác trong `APPS`.
- Badge 1–2 ký tự, đọc được ở 32px.
- Không còn favicon kiểu cũ trong repo.
