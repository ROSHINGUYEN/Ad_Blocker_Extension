# Safe Repository Cleanup Checklist

**Mặc định là ĐỀ XUẤT, không xóa.** Chỉ xóa mục *chắc chắn không dùng*, trong phạm vi đã duyệt (xóa hàng loạt luôn là T3).

Trước khi xóa file/thư mục/dependency:
- [ ] Xác nhận đường dẫn chính xác và chủ sở hữu.
- [ ] Tìm import và tham chiếu (tĩnh).
- [ ] Kiểm tra dynamic import, plugin/entry-point discovery, reflection.
- [ ] Kiểm tra script, build config, packaging, CI/CD.
- [ ] Kiểm tra test, fixture, migration, asset nạp lúc runtime.
- [ ] Kiểm tra tài liệu và tham chiếu deploy.
- [ ] Xác nhận không phải dữ liệu người dùng hoặc nguồn sự thật được sinh ra.
- [ ] Phân loại: chắc chắn không dùng / có thể không dùng / cần xác minh.
- [ ] Ghi lý do xóa an toàn (bằng chứng cho từng mục).
- [ ] `git status` đã được hiểu; không có thay đổi chưa commit của người dùng bị ảnh hưởng.
- [ ] Danh sách xóa đã được **người dùng duyệt** (trừ mục chắc chắn không dùng trong phạm vi duyệt sẵn).
- [ ] Xóa từng lô nhỏ; chạy test/build sau mỗi lô.
- [ ] Giữ đường rollback (commit/branch riêng cho từng lô).

Không bao giờ coi tuổi file, tên "cũ", vẻ trùng lặp hay không thấy import trực tiếp là bằng chứng duy nhất rằng file không dùng.
Không bao giờ xóa: dữ liệu người dùng, asset sinh ra, migration, lockfile, config chỉ vì trông thừa.
Sub-agent KHÔNG ĐƯỢC xóa; chỉ đề xuất.
