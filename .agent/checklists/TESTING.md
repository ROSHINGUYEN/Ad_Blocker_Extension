# Testing Checklist

Mục không áp dụng phải ghi lý do trong báo cáo (không được bỏ trống).

- [ ] Baseline đã chạy **trước** khi sửa; lỗi có sẵn đã ghi
- [ ] Happy path
- [ ] Invalid/malformed input
- [ ] Missing/null/empty values
- [ ] Minimum và maximum boundaries
- [ ] Unauthorized user
- [ ] Forbidden role/action
- [ ] Network/API timeout hoặc failure
- [ ] Database failure/transaction behavior
- [ ] Duplicate request/retry behavior
- [ ] Concurrent requests (khi liên quan)
- [ ] Regression của hành vi đang chạy đúng
- [ ] Bug fix: test tái hiện fail trước khi sửa, pass sau khi sửa
- [ ] Logs không lộ secret
- [ ] Trạng thái UI: loading, empty, success, error
- [ ] Test lặp lại được, không phụ thuộc trạng thái cục bộ ẩn
- [ ] Test viết để kiểm **yêu cầu gốc**, không chỉ để khớp implementation hiện tại
- [ ] Không test nào bị sửa/skip/xfail/nới để cho qua
- [ ] Flaky: chạy lại ≤ 2 lần để phân loại; không chạy đến khi xanh
- [ ] Mọi lệnh + kết quả thật đã ghi vào báo cáo
