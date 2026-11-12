# AI Agent Trust & Verification Kit — v2.0

Bộ quy tắc **bắt buộc** cho coding agent **và sub-agent**, nhằm chặn việc agent tự suy diễn, sửa ngoài phạm vi, thao túng test cho qua, tuyên bố hoàn thành khi chưa kiểm chứng, và khiến người dùng phụ thuộc mù quáng vào AI.

## Nội dung
| File | Vai trò |
|---|---|
| `AGENTS.md` | Quy tắc gốc — mọi agent và sub-agent PHẢI tuân thủ |
| `SUBAGENTS.md` | Quy tắc ủy quyền: brief, quyền hạn, cô lập ghi, xác minh output, xử lý vi phạm |
| `CLAUDE.md`, `GEMINI.md` | File dẫn chiếu ngắn tới `AGENTS.md` cho công cụ có file cấu hình riêng |
| `.agent/skills/ai-coding-discipline/` | Skill: quy trình 3 cổng cho coding agent |
| `.agent/skills/subagent-orchestration/` | Skill: quy trình cho orchestrator và worker |
| `templates/` | Feature request, implementation plan, completion report, **sub-agent brief**, **sub-agent report** |
| `checklists/` | Code review, testing, **security**, cleanup, **pre-completion gate**, **sub-agent review** |
| `scripts/check_report.py` | Kiểm hình thức báo cáo (đủ mục, không placeholder, không cụm bị cấm) |
| `ENFORCEMENT.md` | Cách biến quy tắc văn bản thành kiểm soát kỹ thuật (sandbox, quyền công cụ, CODEOWNERS, CI) |
| `CHANGELOG.md` | Thay đổi so với v1 |

## Cách hoạt động (tóm tắt)
1. **Gán tier T0–T3** cho tác vụ. T3 (auth, schema, API, dependency, CI/deploy, xóa hàng loạt, production…) cần **con người phê duyệt bằng văn bản trước khi sửa**.
2. **Gate 1 Preflight** → **Gate 2 Verify** → **Gate 3 Completion**; không bỏ cổng nào.
3. Mọi tuyên bố "đã chạy/pass" phải có **lệnh chính xác + kết quả thật** trong phiên này.
4. **Sub-agent** kế thừa toàn bộ quy tắc, chỉ bị thu hẹp quyền; output của nó là `reported` cho tới khi orchestrator tự xác minh (V1–V8).
5. Báo cáo cuối theo `templates/COMPLETION_REPORT.md`, có thể kiểm hình thức bằng `scripts/check_report.py`.

## Cài đặt
1. Sao lưu các file hướng dẫn hiện có trong repository.
2. Giải nén gói vào thư mục gốc dự án.
3. Nếu đã có `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agent/` hoặc thư mục rules riêng: **hợp nhất**, không ghi đè mù quáng.
4. Công cụ hỗ trợ `AGENTS.md`: dùng làm quy tắc gốc. Công cụ khác: tạo file cấu hình ngắn dẫn chiếu tới `AGENTS.md` và `SUBAGENTS.md` (xem mẫu `CLAUDE.md`).
5. Đọc quy tắc hiện hành của công cụ/IDE; đường dẫn và cơ chế nạp skill có thể khác nhau giữa các phiên bản.
6. **Làm theo `ENFORCEMENT.md`** — quy tắc chỉ bằng văn bản chưa đủ để gọi là bắt buộc.
7. Nếu có hệ thống dùng nhiều agent/sub-agent: bảo đảm agent chính nạp `SUBAGENTS.md` và dán khối CORE RULES vào mỗi brief.

## Tham số mặc định có thể điều chỉnh (ghi trong brief hoặc cấu hình dự án)
| Tham số | Mặc định |
|---|---|
| Độ sâu sub-agent | 1 |
| Số sub-agent song song | 4 |
| Retry mỗi nhiệm vụ | 2 |
| Diff T1 gợi ý | ≤ ~200 dòng |
| Test flaky chạy lại để phân loại | ≤ 2 lần |

## Nguyên tắc quan trọng
- Agent đề xuất; con người phê duyệt quyết định quan trọng. Im lặng không phải phê duyệt.
- Output của AI không phải bằng chứng — kể cả output của sub-agent.
- Không tuyên bố test đã chạy nếu không thực sự chạy.
- Không xóa file, đổi schema, API contract, dependency hoặc cấu hình quan trọng khi chưa đánh giá ảnh hưởng và được duyệt.
- Không bao giờ sửa test/tắt kiểm soát để "cho qua".
- Ưu tiên thay đổi nhỏ, review được, rollback được.

## Giới hạn
Bộ quy tắc giảm rủi ro nhưng **không bảo đảm** tuân thủ tuyệt đối và không thay thế review của con người, kiểm thử thực tế, quy trình bảo mật hay backup. Siết quy tắc cũng làm tác vụ nhỏ chậm hơn — xem mục "Thay đổi hành vi" trong `CHANGELOG.md`.
