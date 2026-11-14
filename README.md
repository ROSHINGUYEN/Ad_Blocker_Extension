# 🛡️ Ad Blocker Extension

<div align="center">
  <img src="docs/images/logo.png" width="128" height="128" alt="Ad Blocker Extension Logo" style="border-radius: 16px; filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.5));" />
  <br/>
  <h3>Trình Chặn Quảng Cáo Thông Minh, Bảo Vệ Trình Duyệt & Tối Ưu Bộ Nhớ RAM</h3>
  <p><strong>Duyệt web sạch • Tự động bỏ qua quảng cáo YouTube • Bảo vệ quyền riêng tư tuyệt đối</strong></p>
  <br/>
  <img src="docs/demo_popup.png" width="340" alt="Giao diện bảng điều khiển Ad Blocker Extension" style="border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
</div>

---

## 🌟 Giới Thiệu Tổng Quan

**Ad Blocker Extension** là tiện ích mở rộng bảo vệ trình duyệt thế hệ mới dành cho Google Chrome và các trình duyệt nền tảng Chromium (Edge, Brave, Cốc Cốc, Opera).

Tiện ích được thiết kế theo triết lý **Zero-Trust & Local-first Privacy**: toàn bộ việc lọc quảng cáo, phân tích mã độc và tối ưu tài nguyên đều được xử lý trực tiếp ngay trên máy tính của bạn mà không gửi bất kỳ dữ liệu cá nhân hay lịch sử duyệt web nào ra bên ngoài.

---

## 🚀 Công Dụng & Tính Năng Nổi Bật

### 1. 🛡️ Chặn Triệt Để Tab Nhảy & Pop-under (0ms Latency)
- Loại bỏ hoàn toàn tình trạng vừa click chuột vào trang web thì bị nhảy ra hàng loạt tab quảng cáo, trang game bài, cá cược (`haywin`, `gemwin`, `uk88`, `tic88`).
- Cơ chế bảo vệ sớm ngăn chặn mở tab lạ ngay khi ngón tay vừa chạm chuột, bảo vệ máy tính khỏi nguy cơ dính mã độc và virus.

### 2. ▶️ Tự Động Bỏ Qua Quảng Cáo YouTube Thông Minh
- Tự động tắt tiếng các đoạn video quảng cáo phiền toái.
- Nhận diện và tự động click ngay nút **"Bỏ qua quảng cáo" (Skip Ad)** ngay khi nút vừa xuất hiện.
- **Bảo toàn video chính:** Tuyệt đối không tua nhầm, không gây mất đoạn video bạn đang xem.

### 3. 🧹 Quét Sạch Banner Quảng Cáo & Khung Trống (Auto-Clean)
- Dọn dẹp sạch sẽ các banner nổi (`catfish`), banner dính đáy màn hình, banner che video trên các trang web xem phim, đọc truyện, tin tức.
- Tự động dọn dẹp các khung đen thừa thãi, trả lại giao diện web nguyên bản, thoáng đãng.

### 4. ⚡ Giải Phóng Bộ Nhớ RAM & Dọn Cache Trình Duyệt
- Tích hợp nút bấm **"⚡ Giải phóng RAM"**: tự động đưa các tab nhàn rỗi đang chạy ngầm vào chế độ ngủ (`tabs.discard()`), giảm tải áp lực bộ nhớ cho trình duyệt.
- Tự động đóng các tab trống hoặc tab lỗi mạng bị bỏ quên, giải phóng bộ nhớ đệm tạm thời HTTP Cache.

### 5. 🚫 Lá Chắn Bảo Vệ Toàn Diện (Cờ bạc, Mã độc & Web 18+)
- Tự động chặn đứng các đường link chuyển hướng đến trang web cá cược lừa đảo, trang web người lớn không lành mạnh.
- Hoạt động ổn định trên cả **Chế độ duyệt web thông thường** lẫn **Chế độ ẩn danh (Incognito)**.

---

## 📖 Hướng Dẫn Cài Đặt & Sử Dụng (Dùng Được Cho Mọi Trình Duyệt)

Tiện ích hoạt động mượt mà trên **tất cả trình duyệt nền tảng Chromium**: Google Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera, Vivaldi, Kiwi Browser (Android)...

### Cách 1: Sử Dụng Gói Đóng Gói Sẵn (.ZIP) — Dễ nhất

1. File đóng gói sẵn có tại:
   ```text
   apps/extension/ad-blocker-extension-ready.zip
   ```
2. **Giải nén** file `ad-blocker-extension-ready.zip` ra một thư mục bất kỳ trên máy bạn.
3. Mở trang quản lý Extension trên trình duyệt:
   - **Google Chrome / Cốc Cốc**: `chrome://extensions/`
   - **Microsoft Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
   - **Opera**: `opera://extensions/`
4. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên.
5. Bấm vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ➜ Chọn thư mục bạn vừa giải nén.
6. Tiện ích **Ad Blocker Extension** sẽ lập tức hoạt động trên trình duyệt!

### Cách 2: Tải Trực Tiếp Từ Thư Mục Mã Nguồn

Nếu bạn đang mở source code của dự án:
1. Mở trang Extension trên trình duyệt (`chrome://extensions/` hoặc `edge://extensions/`).
2. Bật **Developer mode**.
3. Bấm **Load unpacked** ➜ Chọn trực tiếp thư mục:
   ```text
   E:\Shiori_ad_cleaner\apps\extension
   ```

---

## 🎮 Cách Sử Dụng Tiện Ích Hằng Ngày

1. **Ghim tiện ích lên thanh công cụ:**
   - Bấm vào biểu tượng mảnh ghép (Extensions) ở góc trên bên phải trình duyệt -> Bấm biểu tượng chiếc ghim bên cạnh **Ad Blocker Extension**.
2. **Xem trạng thái bảo vệ:**
   - Bấm vào biểu tượng chiếc khiên trên thanh công cụ để mở giao diện quản lý:
     - Xem số lượng tab nhảy, banner và request độc hại đã được lọc.
     - Sử dụng công tắc chính để Bật / Tắt tiện ích linh hoạt.
3. **Giải phóng RAM:**
   - Khi mở quá nhiều tab, mở giao diện tiện ích và bấm nút **"⚡ Giải phóng RAM"** để đưa các tab nhàn rỗi vào chế độ ngủ ngay tức thì.

---

## 🔒 Cam Kết Quyền Riêng Tư (Privacy First)

- **100% Xử lý nội bộ (Local-first):** Tiện ích không thu thập, không lưu trữ và không gửi bất kỳ dữ liệu cá nhân hay lịch sử duyệt web nào ra Internet.
- **Không tiêu tốn tài nguyên:** Không chạy các tác vụ phân tích nặng nề khi không cần thiết, giúp trình duyệt chạy nhanh hơn rõ rệt.
