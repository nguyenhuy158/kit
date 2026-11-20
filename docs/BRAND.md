# Brand: logo + favicon

## v2 (mặc định): capybara

Mọi app cá nhân dùng chung một linh vật: **capybara** nguyên bản (không phải nhân vật có sẵn của ai). Mỗi app
khác nhau ở **màu nền** và **món đồ trên đầu** capybara. Ảnh tạo bằng Codex CLI (`image_generation`), luôn kèm
ảnh mẫu `brand/reference/capybara-<style>.png` để giữ cùng một con. Prompt: [BRAND-PROMPTS.md](BRAND-PROMPTS.md).

### Quy tắc

1. Linh vật: capybara mập, nhìn thẳng, tai tròn nhỏ, mắt đen có điểm sáng, má hồng, mõm nâu đậm, ngồi có chân trước.
2. Style mặc định: **doodle** (nét mực vẽ tay hơi run, tô pastel phẳng). Style khác chỉ dùng khi app cần riêng:
   flat, clay, riso, lowpoly, line, pixel. Ảnh mẫu từng style trong `brand/reference/`.
3. Nền: ô vuông bo tròn, 1 màu pastel riêng cho mỗi app (bảng dưới), không trùng app khác.
4. Đồ trên đầu: 1 món nói lên app làm gì, màu nhấn của app. Không chữ, không số.
5. Phải đọc được ở 32px. Không sao chép, không lấy làm mẫu đầu vào logo hay nhân vật của người khác.

### Bảng app

| App | Nền | Màu nhấn | Đồ trên đầu |
| --- | --- | --- | --- |
| zalo | `#a2d2ff` | `#0068ff` | bong bóng chat 3 chấm |
| notes | `#cdeac0` | `#3f8f3a` | bút chì |
| cardstat | `#fde68a` | `#c98a00` | đồng xu |
| chia-keo | `#ffd6a5` | `#f08a24` | viên kẹo bọc giấy |
| monitor | `#bde0fe` | `#2f6fd6` | màn hình có nhịp tim |
| ai-english | `#ffc8dd` | `#d6336c` | cuốn sách nhỏ |
| share | `#e2cfff` | `#7b4dd6` | mũi tên tải lên |
| hooks | `#c7f0ee` | `#1f8a83` | lưỡi câu |
| games | `#ffb5a7` | `#d6452f` | tay cầm chơi game |
| huyabhome | `#d0f4de` | `#2c9a5c` | ngôi nhà nhỏ |
| resume | `#f1e3d3` | `#9a6b3f` | tờ giấy hồ sơ |
| vite-profile (portfolio) | `#f4f1bb` | `#3d5a80` | laptop nhỏ mở nắp |
| sso | `#d7d3ff` | `#5a4fcf` | chìa khoá |
| mailer | `#ffdfd3` | `#e0603a` | phong bì |
| ui-kit | `#e4c1f9` | `#9b4dca` | bảng màu vẽ |
| intake | `#dbe7a8` | `#7a8f1f` | khay hộp thư |
| tc-api-team | `#c7e8f3` | `#2b7fa0` | phích cắm điện |
| review | `#f6d6f0` | `#b8327e` | kính lúp |
| home (app desktop) | `#d9e4ec` | `#4a6fa5` | hộp đồ nghề |
| arch | `#f6e7c1` | `#c0392b` | biển ga tàu điện tròn |

App mới: thêm 1 dòng (màu nền pastel chưa dùng + màu nhấn + đồ vật) bằng PR vào repo này.

### File mỗi app phải có

| File | Dùng cho |
| --- | --- |
| `icon-512.png` | PWA manifest, og, logo trong app (ảnh gốc từ Codex, cắt vuông, góc trong suốt) |
| `apple-touch-icon.png` (180) | `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` |
| `favicon-32.png` | `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">` |
| `favicon.ico` (16+32) | trình duyệt cũ |

Logo trong giao diện (header, trang login) dùng lại `icon-512.png`. Smoke của app kiểm tra `GET /favicon-32.png` = 200.

Sinh bộ web: `uv run -q --with pillow python3 brand/make_icons.py <art.png> <out> --bg "#rrggbb"`.

### Icon app desktop (Tauri, Dock macOS)

Mọi app desktop cùng một cỡ trên Dock: tranh nằm trong ô bo góc 824×824 (bo 22.5%) giữa canvas 1024 trong suốt, có bóng nhẹ, giống icon hệ thống. Không dùng tranh tràn hết canvas: icon sẽ to hơn các app khác.

Sinh: `uv run -q --with pillow python3 brand/make_icons.py <art.png hoặc icon-512.png> src-tauri/icons --desktop` → `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png`, `icon.icns`, `app-icon-1024.png`. Icon iOS giữ tranh tràn khung (iOS tự bo góc), không dùng bộ này.

## v1 (cũ): mochi kawaii

`brand/generate.mjs` sinh logo mochi bằng SVG. Chỉ còn để app chưa chuyển sang v2 tiếp tục chạy; không dùng cho app mới.
