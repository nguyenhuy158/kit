# Brand prompts: favicon capybara (v2)

Prompt cho Codex CLI (có `image_generation`), Gemini CLI hoặc Claude Code để mọi app dùng chung capybara trong
[BRAND.md](BRAND.md). Style mặc định là **doodle**; luôn đính kèm ảnh mẫu của style để giữ cùng một con.

## A. Gắn favicon cho một repo (agent)

Chạy trong repo cần icon:

```
Gắn favicon cho repo này theo brand v2 capybara của nguyenhuy158.
1. Đọc nguyenhuy158/kit: docs/BRAND.md, docs/BRAND-PROMPTS.md, brand/reference/ (clone ~/Documents/personal-projects/kit, git pull trước).
2. Lấy dòng của app trong bảng app (nền, màu nhấn, đồ trên đầu). App chưa có: thêm dòng mới bằng PR riêng vào kit.
3. Tạo ảnh bằng prompt B (style mặc định doodle, trừ khi bảng ghi khác), đính kèm brand/reference/capybara-doodle.png.
4. Hậu kỳ: cắt vuông, góc ngoài ô bo tròn trong suốt, xuất icon-512.png, apple-touch-icon.png (180), favicon-32.png, favicon.ico (16+32).
5. Copy vào thư mục public/static, xoá icon kiểu cũ, thêm <link> như BRAND.md; manifest dùng icon-512.png.
6. Mở ảnh ở 32px, kiểm tra còn nhận ra capybara và món đồ; smoke GET /favicon-32.png = 200; chụp màn hình tab trình duyệt.
7. Worktree + PR, PR body ghi style, màu, đồ vật và ảnh kết quả.
Không sao chép logo hay nhân vật của người khác.
```

## B. Prompt tạo ảnh

Lệnh Codex (đính kèm ảnh mẫu để giữ cùng một con):

```
codex exec --skip-git-repo-check -s workspace-write \
  -i <kit>/brand/reference/capybara-<style>.png \
  "Generate ONE image with your image generation tool and save it as ./icon-source.png. <PROMPT>"
```

`<PROMPT>` = phần chung + một dòng style. Thay `<BG>`, `<ACCENT>`, `<PROP>` bằng giá trị trong bảng app.

Phần chung:

```
App icon, 1:1 square, rounded-square tile filling the canvas with pastel <BG> background (no black or transparent corners).
Subject: the same original cute capybara as the attached reference image (generic animal, not any existing character),
front view, chunky round body, small round ears, dark eyes with a highlight, pink blush, darker snout, sitting with front paws.
On its head sits a small <PROP> in <ACCENT>. Centered, generous padding, simple shapes that stay readable at 32x32 px.
No text, no letters, no numbers, no watermark.
```

Style (chọn một):

| Style | Dòng thêm vào prompt |
| --- | --- |
| **doodle (mặc định)** | `Style: hand-drawn doodle, wobbly ink line art with flat pastel fill, slightly imperfect, notebook-sketch charm.` |
| flat | `Style: flat vector sticker, bold clean shapes, thick dark outline #2b2140, no gradients, no texture, like a modern emoji sticker set.` |
| clay | `Style: soft 3D claymorphism render, matte clay material, gentle studio lighting and soft shadows, toy-like, rounded.` |
| riso | `Style: risograph print, two-tone overprint, visible grain and slight misregistration, retro zine look.` |
| lowpoly | `Style: low-poly geometric, faceted triangles with flat shading, crisp edges, modern minimal.` |
| line | `Style: minimal monoline icon, single consistent stroke weight in dark #2b2140 on the pastel tile, almost no fill, very clean.` |
| pixel | `Style: 16-bit pixel art, crisp hard-edged pixels on a visible grid, no anti-aliasing, no gradients.` |

Ở 32px: doodle, flat, clay, pixel còn rõ; riso, lowpoly, line dễ nhoè, chỉ hợp ảnh lớn (OG, splash).

## Kiểm tra trước khi merge

- Màu nền chưa trùng app khác; đồ vật đúng bảng app.
- Cùng một con capybara với ảnh mẫu (dáng, tai, mõm, má).
- Ở 32px vẫn nhận ra; không chữ trong ảnh.
- Không còn icon kiểu cũ trong repo.
