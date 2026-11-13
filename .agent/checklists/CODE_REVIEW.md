# Code Review Checklist

> Reviewer ở T2+ PHẢI độc lập với người triển khai (SUBAGENTS S-5) và KHÔNG sửa code mình review.
> Mỗi finding: **severity, bằng chứng (file:dòng / lệnh), tác động, đề xuất sửa**. Không bịa lỗ hổng; không khen code chưa đọc.

## Requirement fit
- [ ] Thay đổi khớp yêu cầu tường minh.
- [ ] Không có feature creep chưa duyệt.
- [ ] Acceptance criteria kiểm tra được và đều có bằng chứng.

## Correctness
- [ ] Input được validate; output và state transition đúng.
- [ ] Null/empty/boundary được xử lý.
- [ ] Lỗi hiển thị rõ và hành động được; không nuốt exception, không fallback im lặng.
- [ ] Concurrency/ordering được xét khi liên quan.

## Security (chi tiết: `SECURITY.md`)
- [ ] Authentication và authorization kiểm tra riêng.
- [ ] Không có secret/dữ liệu nhạy cảm trong code hoặc log.
- [ ] Rủi ro injection/parsing không an toàn được xét.
- [ ] Least privilege; không có security check bị vô hiệu hóa.

## Maintainability
- [ ] Không trùng lặp/abstraction thừa; naming và ranh giới module rõ.
- [ ] Không dead/debug code; comment giải thích quyết định không hiển nhiên.

## Compatibility
- [ ] API contract giữ nguyên hoặc có migration ghi rõ.
- [ ] Thay đổi DB, config, môi trường, dependency được rà và có lý do.

## Chống thao túng kiểm thử (AGENTS §5.8)
- [ ] Không test bị sửa/xóa/skip/xfail; assertion không bị nới.
- [ ] Không `noqa/ignore/disable/--no-verify` mới; không đổi ngưỡng coverage hoặc cấu hình CI/lint.
- [ ] Không mock bất thường hoặc hardcode output theo test.

## Evidence
- [ ] Test liên quan thực sự đã chạy (reviewer tự chạy lại ít nhất bộ test chính).
- [ ] Thất bại được báo trung thực; diff cuối đã được đọc.

## Kết luận review
Severity cao nhất tìm thấy: {{Critical | High | Medium | Low | none}}.
**Critical/High còn mở ⇒ KHÔNG được ghi `Completed`.**
