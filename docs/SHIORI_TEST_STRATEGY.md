# SHIORI Test Strategy

Chiến lược kiểm thử chất lượng production:

## 1. Unit Tests (Vitest)
- Độ phủ code tối thiểu > 90% cho các module tính toán, Trie matcher, Rule parser, Decision logic.
- Thời gian chạy < 5 giây để tích hợp trơn tru vào git commit hook.

## 2. Integration Tests
- Mô phỏng vòng đời gửi nhận message giữa Content Scripts, Background Worker và Decision Engine.

## 3. E2E & Regression Tests (Playwright)
- Kiểm thử hiển thị trên các mẫu website tĩnh và động.
- Kiểm thử trình phát video YouTube để xác minh tính ổn định của player sau khi áp dụng filter.

## 4. Performance Gates
- Rule matching latency: < 0.5ms.
- DOM observer overhead: < 2% CPU usage.
- Maximum RAM footprint per active tab: < 15MB.
