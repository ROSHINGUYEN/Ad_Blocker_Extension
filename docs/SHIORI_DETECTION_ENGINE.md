# SHIORI Detection Engine

Đặc tả nguyên lý hoạt động của trung tâm phân tích Shiori Intelligence Engine.

## Confidence Matrix & Action Policy
- **Confidence >= 0.85 (High):** Áp dụng hành động dứt khoát theo policy (`BLOCK` hoặc `HIDE`).
- **0.50 <= Confidence < 0.85 (Medium):** Áp dụng biện pháp ít xâm lấn, ghi nhận log và chờ bổ sung tín hiệu (`WARN` / `REVIEW`).
- **Confidence < 0.50 (Low):** Giữ nguyên nội dung (`ALLOW`), không tự tiện xóa DOM.

## Multi-Signal Correlation
Không kết luận một phần tử là quảng cáo chỉ dựa trên một CSS class hoặc một thuộc tính duy nhất.
Tối thiểu phải kết hợp ít nhất 2 nguồn bằng chứng:
1. Nguồn Network hoặc URL.
2. Cấu trúc DOM hoặc hành vi hiển thị (kích thước, position overlay, tỷ lệ khung hình).
