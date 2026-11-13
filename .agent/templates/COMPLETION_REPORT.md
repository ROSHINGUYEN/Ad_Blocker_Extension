# Completion Report

> Điền mọi mục. Không để lại `{{...}}`. Mục không áp dụng: ghi `N/A — <lý do>`.
> Kiểm tra hình thức: `python scripts/check_report.py <file>`

## Tier
{{T0 | T1 | T2 | T3}} — {{lý do gán tier}}

## Status
{{Completed | Partially completed | Blocked}}
<!-- Completed chỉ khi MỌI acceptance criterion có bằng chứng ở bảng Verification. -->

## Summary
{{1–5 dòng: đã làm gì, vì sao}}

## Acceptance criteria trace
| Criterion | Label (implemented/tested/verified/not-tested/blocked/assumption) | Evidence ref |
|---|---|---|
| {{AC-1}} | {{label}} | {{V-1}} |

## Files changed
<!-- Lấy từ `git diff --name-only` / `git status`, không viết theo trí nhớ. -->
| File | Change | Reason |
|---|---|---|
| {{path}} | {{added/modified/deleted}} | {{lý do}} |

## Verification
<!-- Chỉ ghi lệnh THỰC SỰ đã chạy TRONG phiên này. Kết quả = output/exit code thật. -->
| ID | Command/check | Actual result | Scope/limitations |
|---|---|---|---|
| V-1 | {{lệnh chính xác}} | {{exit code, pass/fail/skip}} | {{phạm vi test}} |

## Baseline vs after
{{Lỗi có sẵn trước khi sửa (từ baseline) so với sau khi sửa}}

## Not verified
{{Phần chưa kiểm tra + lý do. Nếu không có: "None — <lý do tin được>"}}

## Known risks
{{Rủi ro còn lại; TODO/FIXME/HACK đã để lại}}

## Decisions required
{{Chỉ những quyết định cần phán đoán của người dùng; hoặc "None"}}

## How to reproduce/run
{{Lệnh để người dùng tự chạy lại và kiểm tra}}

## Rollback notes
{{Cách hoàn tác, an toàn}}

## Rule compliance
<!-- Liệt kê MỌI chỗ lệch AGENTS.md/SUBAGENTS.md và ai phê duyệt. Không có: "Deviations: none". -->
- Deviations: {{none | mục AGENTS §x — lý do — phê duyệt bởi/ở đâu}}
- Waivers đã dùng: {{none | ...}}
- Hành động thuộc AGENTS §9.1 đã thực hiện: {{none | lệnh — phê duyệt}}

## Sub-agents
<!-- Có dùng: dán delegation log (SUBAGENTS §12). Không dùng: "N/A — không ủy quyền". -->
{{N/A — không ủy quyền | bảng delegation log}}
