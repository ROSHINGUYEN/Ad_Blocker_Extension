# Pre-completion Gate (AGENTS §14) — mọi mục phải đạt mới được ghi `Completed`

## Phạm vi và yêu cầu
- [ ] Mỗi acceptance criterion có một bằng chứng cụ thể (bảng truy vết).
- [ ] Không có tính năng/thay đổi ngoài phạm vi đã duyệt.
- [ ] Tier đã gán đúng; phê duyệt cần thiết đã có (T3: con người, bằng văn bản).

## Bằng chứng
- [ ] Mọi lệnh trong báo cáo thực sự đã chạy **trong phiên này**; output/exit code là thật.
- [ ] Đã đủ 5 loại test (happy, invalid, boundary, error, regression) hoặc ghi lý do không áp dụng.
- [ ] Bug fix: đã có test tái hiện fail trước, pass sau.
- [ ] Đã so sánh với baseline; lỗi có sẵn được phân biệt với lỗi mới.
- [ ] Không có test nào bị sửa/skip/xfail/nới để cho qua (hoặc đã có phê duyệt ghi trong báo cáo).
- [ ] Không chạy lặp đến khi xanh; flaky (nếu có) đã được phân loại.

## Diff cuối
- [ ] Đã đọc toàn bộ `git diff`; khớp danh sách file khai báo.
- [ ] Không có debug code, file tạm, unused import/dependency, TODO chưa khai báo.
- [ ] Không có secret/dữ liệu nhạy cảm (đã quét hoặc ghi `not-tested`).
- [ ] Không có thay đổi API/schema/config/dependency ngoài ý muốn.

## Sub-agent (nếu có)
- [ ] Mọi output worker đã qua V1–V6 (và V7 nếu T2+); trạng thái claim ghi đúng.
- [ ] Delegation log đầy đủ; vi phạm của worker (nếu có) đã báo người dùng.

## Trung thực
- [ ] Không dùng cụm bị cấm (bug-free, 100% secure, production-ready, should work…).
- [ ] Mục *Not verified*, *Known risks*, *Rule compliance* phản ánh đúng thực tế.
- [ ] Có cách chạy lại và rollback.
