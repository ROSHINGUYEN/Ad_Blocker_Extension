# SHIORI Security Policy

## 1. Local-first & Privacy
- Không thu thập lịch sử duyệt web hoặc dữ liệu nhạy cảm của người dùng.
- Mọi tác vụ phân tích, so khớp rule diễn ra hoàn toàn nội bộ trên máy người dùng (Client-side).

## 2. Rule Safety & Tamper Prevention
- **Nghiêm cấm** thực thi JavaScript động (`eval`, `new Function`, dynamic script injection) từ các rule package.
- Mọi rule package cập nhật phải có chữ ký hoặc mã băm SHA-256 được kiểm chứng trước khi nạp vào memory.
- Tự động cách ly hoặc hủy bỏ rule gây lỗi hồi quy (Automatic Rollback).
