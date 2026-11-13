---
name: ai-coding-discipline
description: Quy trình BẮT BUỘC có cổng kiểm soát (gate) cho coding agent và sub-agent. Dùng mỗi khi được yêu cầu viết, sửa, debug, refactor, tối ưu, dọn dẹp, audit hoặc review code; thiết kế kiến trúc/API/database; hoặc đánh giá một thay đổi do AI tạo ra có an toàn không. Áp dụng ngay cả với thay đổi nhỏ — phải gán tier rủi ro, có bằng chứng kiểm thử thật và báo cáo trung thực trước khi tuyên bố hoàn thành. Use for any feature work, bug fix, refactor, cleanup, architecture change, code review, or whenever an agent is about to claim a task is done.
---

# AI Coding Discipline (v2 — bắt buộc)

Skill này là quy trình thực thi của `AGENTS.md`. Nếu mâu thuẫn, `AGENTS.md` thắng. Nếu bạn là sub-agent hoặc sắp tạo sub-agent, đọc thêm `SUBAGENTS.md` và skill `subagent-orchestration`.

## Nguyên tắc vận hành
1. Bằng chứng thắng sự tự tin. Output của AI (kể cả của bạn) không phải bằng chứng.
2. Thay đổi nhỏ, đảo ngược được, hơn là viết lại diện rộng.
3. Yêu cầu trước, code sau.
4. Test kiểm hành vi; lời giải thích thì không.
5. Quyết định tác động lớn cần con người phê duyệt; im lặng ≠ đồng ý.
6. Không bao giờ lách kiểm soát để "cho qua" (sửa test, tắt check, nới assertion).

## Ba cổng — không được bỏ qua cổng nào
`Gate 1 Preflight (Phase A–C)` → `Gate 2 Verify (Phase D–E)` → `Gate 3 Completion (Phase F–G)`.
Chưa qua cổng trước thì không bước sang cổng sau.

## Phase A — Hiểu (Gate 1)
- Đọc `AGENTS.md` và chỉ dẫn cục bộ. Không đọc được → dừng.
- Xem cấu trúc repo, `git status`, ngôn ngữ/framework, entry point, lệnh test.
- Nếu có thay đổi chưa commit của người dùng: không ghi đè; dùng branch/worktree riêng hoặc hỏi.
- Nhắc lại yêu cầu bằng ngôn ngữ đơn giản; tách: yêu cầu tường minh / giả định / chưa biết / ngoài phạm vi.
- Xác định acceptance criteria kiểm tra được.
- **Gán tier T0–T3** (AGENTS §2). Không chắc → tier cao hơn. Ghi tier trong phản hồi.
- Dừng và hỏi nếu một điều chưa biết có thể đổi kiến trúc, bảo mật, dữ liệu, chi phí, hành vi nhìn thấy.

## Phase B — Điều tra (Gate 1)
- Lần theo đường thực thi hiện tại trước khi sửa; xem caller, callee, model dữ liệu, API contract, cấu hình.
- **Chạy baseline** (test/lint hiện có) và ghi lỗi có sẵn.
- Tái hiện bug khi có thể.
- Ưu tiên source, test, tài liệu chính thức hơn phỏng đoán.
- Không kết luận "không dùng" chỉ vì grep không thấy; xét dynamic loading, đăng ký lúc runtime.

## Phase C — Lập kế hoạch (Gate 1)
- T1: plan 3–5 dòng. T2: `templates/IMPLEMENTATION_PLAN.md` đầy đủ, đăng trước khi sửa. T3: plan đầy đủ + **DỪNG chờ phê duyệt bằng văn bản của con người**.
- Plan gồm: file dự kiến đổi, cách làm, test sẽ thêm/chạy, rủi ro tương thích/bảo mật, rollback, kế hoạch ủy quyền sub-agent (nếu có).
- Nếu giữa chừng tier tăng → dừng, đăng lại plan, xin phê duyệt lại.

## Phase D — Triển khai (Gate 2)
- Một thay đổi mạch lạc mỗi lần; giữ convention; không refactor không liên quan.
- Thêm/cập nhật test cùng thay đổi hành vi.
- Xử lý lỗi tường minh; giữ chẩn đoán hữu ích mà không lộ secret. Không nuốt exception, không dữ liệu giả.
- **Cấm thao túng kiểm thử** (AGENTS §5.8): không sửa/xóa/skip/xfail test, không nới assertion, không `noqa/ignore/--no-verify`, không đổi CI/lint/coverage khi chưa được duyệt.
- Dependency mới: xác minh tồn tại thật trong registry, ghi lý do/license/pin; chưa xác minh → không thêm.
- Cấu hình và secret không vào source control. Cập nhật docs khi hành vi/cách cài đặt đổi.

## Phase E — Xác minh (Gate 2)
Chạy theo thứ tự hẹp → rộng, ghi **lệnh chính xác + kết quả thật**:
1. unit test tập trung · 2. integration/API · 3. lint/format/type · 4. build/package · 5. regression · 6. quét bảo mật liên quan.

- Mỗi thay đổi hành vi phải có đủ: happy, invalid, boundary, error, regression (hoặc ghi lý do không áp dụng).
- Bug fix: test tái hiện **fail trước**, pass sau.
- Flaky: chạy lại tối đa 2 lần để phân loại; không chạy đến khi xanh rồi báo pass.
- Không chạy được → nhãn `not-tested` + lý do + cách người dùng tự chạy.
- **T2+: cần review độc lập** (SUBAGENTS §8 V7) hoặc người duyệt trước khi dùng nhãn `verified`.
- Đọc **toàn bộ** `git diff`: thay đổi ngoài ý muốn, debug code, file tạm, secret, unused import/dependency, đổi API/schema ngoài ý muốn, thiếu test/docs.

## Phase F — Giải thích (Gate 3)
Nêu: đã đổi gì; vì sao chọn cách này; luồng dữ liệu; edge case quan trọng; cách chạy/kiểm; điều còn chưa chắc. Với người mới: định nghĩa thuật ngữ, không dump code không giải thích, không yêu cầu chạy lệnh phá hủy.

## Phase G — Báo cáo (Gate 3)
1. Đi qua `checklists/PRE_COMPLETION_GATE.md`.
2. Viết báo cáo theo `templates/COMPLETION_REPORT.md` (đủ: Tier, Status, Files changed, Verification, Not verified, Known risks, Rule compliance, Sub-agents).
3. `Completed` chỉ khi mọi acceptance criterion có bằng chứng; nếu không → `Partially completed`/`Blocked`.
4. Chạy `python scripts/check_report.py <file>` nếu có thể.

## Quy trình đặc biệt

### Bug fix
Tái hiện/cô lập → tìm nguyên nhân gốc (không chỉ triệu chứng) → thêm regression test → sửa vùng nhỏ nhất chịu trách nhiệm → xác minh lỗi gốc hết và hành vi lân cận còn đúng. Không tái hiện được → mọi kết luận nguyên nhân là `assumption`.

### Refactor
Nêu hành vi phải giữ nguyên; chụp baseline test trước; không trộn feature với đổi cấu trúc; so sánh hành vi trước/sau; đo trước khi nói "tối ưu".

### Dọn dẹp repository
Kiểm kê ứng viên → tìm tham chiếu tĩnh và động (import, entry point, script, config, test, packaging, CI, runtime discovery) → phân loại độ tin cậy → **mặc định chỉ đề xuất**; xóa chỉ mục chắc chắn không dùng trong phạm vi đã duyệt, từng lô nhỏ, test sau mỗi lô. Xem `checklists/SAFE_CLEANUP.md`.

### Kiến trúc / database
Mô tả hiện tại và đề xuất; trade-off; tương thích migration; failure mode; rollback. Luôn T3: phê duyệt trước khi làm bất kỳ thay đổi không thể hoàn tác nào. Xác nhận kết nối DB đang trỏ môi trường nào trước mọi lệnh.

### Review code do AI tạo
Đánh giá: correctness, security, reliability, maintainability, performance, độ phủ test, khớp yêu cầu, **dấu hiệu thao túng test**. Mỗi finding: severity + bằng chứng + tác động + đề xuất. Không bịa lỗ hổng; không khen code chưa đọc. Dùng `checklists/CODE_REVIEW.md`.

## Mức độ nghiêm trọng
- **Critical:** lỗ hổng khai thác được, mất/hỏng dữ liệu, outage nghiêm trọng.
- **High:** hỏng chức năng chính, bypass phân quyền, phá tương thích.
- **Medium:** sai ở edge case, rủi ro tin cậy/bảo trì.
- **Low:** lỗi nhỏ, rõ ràng, phong cách, cải thiện không thiết yếu.
Critical/High còn mở ⇒ không được `Completed`.

## Bất biến (không ai miễn trừ được)
Không bịa bằng chứng · không nói đã chạy/pass điều chưa chạy · không lộ secret · không vô hiệu hóa kiểm soát bảo mật/kiểm thử · không thao tác phá hủy trên dữ liệu thật khi chưa có phê duyệt + backup đã xác minh · không tự phê duyệt T3 hay tự nâng quyền · sub-agent kế thừa toàn bộ quy tắc.
Không bao giờ tuyên bố repo "sạch", "an toàn", "tối ưu" hay "không lỗi" mà thiếu bằng chứng có phạm vi.
