# ENFORCEMENT — Biến quy tắc thành kiểm soát kỹ thuật

**Sự thật cần nhớ:** `AGENTS.md` là chỉ dẫn bằng văn bản. Nó giảm mạnh rủi ro nhưng **không bảo đảm** agent luôn tuân thủ — agent có thể bỏ sót, hiểu sai, hoặc bị chỉ thị độc hại trong dữ liệu đánh lạc hướng. Muốn "bắt buộc" thật sự, hãy thêm các lớp kiểm soát dưới đây. Cú pháp cấu hình khác nhau theo công cụ và phiên bản — **đọc tài liệu hiện hành của công cụ bạn dùng** trước khi áp dụng.

## 1. Các lớp kiểm soát (từ mạnh đến yếu)

| Lớp | Cách làm | Chặn được gì |
|---|---|---|
| **Sandbox / môi trường** | Chạy agent trong container/VM/worktree riêng; không mount credential production; giới hạn mạng đi ra (egress allowlist) | I-3, I-5; lệnh phá hủy ngoài sandbox; exfiltration |
| **Quyền công cụ** | Cấu hình allowlist/denylist lệnh ở cấp công cụ: chặn nhóm lệnh AGENTS §9.1 (`reset --hard`, `clean -fd`, `push --force`, `rm -rf`, `terraform apply/destroy`, `kubectl delete`, `docker system prune`, deploy/publish); chặn đọc `.env`/key | §9, I-5, §7 |
| **Bảo vệ nhánh** | Cấm push trực tiếp vào nhánh chính; bắt buộc PR + review của người; required status checks | T2/T3, §9.3 |
| **CODEOWNERS** | Gán người chịu trách nhiệm cho `AGENTS.md`, `SUBAGENTS.md`, `.agent/**`, `.github/workflows/**`, `checklists/`, `templates/` → mọi thay đổi quy tắc cần người duyệt | I-6, §11.5 |
| **CI gate** | Chạy test/lint/type/build/secret-scan bắt buộc; không cho phép giảm ngưỡng coverage hoặc xóa job để merge | §5.8, §6 |
| **Kiểm hình thức báo cáo** | `python scripts/check_report.py reports/*.md` trong CI hoặc pre-push | §14 (chỉ cấu trúc) |
| **Worktree cho sub-agent** | `git worktree add ../wt-W1 -b agent/W1` — mỗi worker một worktree; chỉ orchestrator tích hợp | SUBAGENTS §5 |
| **Audit** | Lưu brief, báo cáo worker, delegation log, và log lệnh đã chạy để đối chiếu V3 | SUBAGENTS §8, §12 |

## 2. Ví dụ CI (GitHub Actions) — chỉnh theo hệ thống của bạn

```yaml
# .github/workflows/agent-report-check.yml  (ví dụ, chưa chạy trên repo của bạn)
name: agent-report-check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.x" }
      - run: |
          shopt -s nullglob
          files=(reports/*.md)
          if [ ${#files[@]} -gt 0 ]; then python scripts/check_report.py "${files[@]}"; fi
```

Quy ước: agent lưu báo cáo tại `reports/<task-id>.md` (và báo cáo worker tại `reports/subagents/<task-id>.md`) nếu bạn muốn CI kiểm.

## 3. Ví dụ CODEOWNERS

```
# .github/CODEOWNERS  (thay @your-team bằng người/nhóm thật)
/AGENTS.md            @your-team
/SUBAGENTS.md         @your-team
/.agent/              @your-team
/.github/workflows/   @your-team
/scripts/check_report.py @your-team
```

## 4. Những gì kit này KHÔNG làm được
- Không ngăn agent nói sai nếu không có ai/công cụ đối chiếu (V2, V3 mới là thứ phát hiện ra).
- `check_report.py` chỉ kiểm cấu trúc, cụm bị cấm, placeholder; **không** chứng minh lệnh đã được chạy thật.
- Không thay thế review của con người, kiểm thử thực tế, quy trình bảo mật và backup.
