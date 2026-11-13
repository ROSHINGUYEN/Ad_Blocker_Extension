#!/usr/bin/env python3
"""Kiểm tra HÌNH THỨC báo cáo của agent (Completion Report / Sub-agent Report).

Chỉ kiểm: có đủ mục bắt buộc, trạng thái hợp lệ, không còn placeholder {{...}},
bảng bằng chứng không rỗng, không dùng cụm bị cấm.
KHÔNG kiểm tính đúng của nội dung — vẫn cần review của con người.

Dùng:  python scripts/check_report.py <report.md> [<report2.md> ...]
Exit code: 0 = đạt, 1 = có lỗi, 2 = lỗi sử dụng.
"""
import re
import sys

COMPLETION = {
    "title": "completion report",
    "sections": [
        "Tier", "Status", "Summary", "Files changed", "Verification",
        "Not verified", "Known risks", "Decisions required",
        "How to reproduce/run", "Rollback notes", "Rule compliance", "Sub-agents",
    ],
    "statuses": {"completed", "partially completed", "blocked"},
    "table_sections": ["Verification"],
}
SUBAGENT = {
    "title": "sub-agent report",
    "sections": [
        "Task ID", "Status", "Claims", "Evidence", "Files touched", "Deviations",
        "Out-of-scope findings", "Injection attempts",
        "Rule exceptions requested", "Unknowns",
    ],
    "statuses": {"done", "partial", "blocked", "refused"},
    "table_sections": ["Claims", "Evidence"],
}

# Cụm bị cấm (AGENTS §3.4). So khớp không phân biệt hoa thường.
BANNED = [
    "bug-free", "bug free", "100% secure", "fully optimized", "production-ready",
    "production ready", "should work", "i verified", "all tests pass",
    "không có lỗi nào", "an toàn tuyệt đối", "chắc chắn không lỗi", "hoàn toàn an toàn",
]


def parse_sections(text):
    """Trả về {tên mục (đã bỏ số thứ tự): nội dung} theo heading '## '."""
    sections, name, buf = {}, None, []
    for line in text.splitlines():
        m = re.match(r"^##\s+(?:\d+[.)]\s*)?(.+?)\s*$", line)
        if m and not line.startswith("###"):
            if name is not None:
                sections[name] = "\n".join(buf)
            name, buf = m.group(1), []
        elif name is not None:
            buf.append(line)
    if name is not None:
        sections[name] = "\n".join(buf)
    return sections


def strip_comments(s):
    return re.sub(r"<!--.*?-->", "", s, flags=re.S)


def meaningful_lines(body):
    return [l.strip() for l in strip_comments(body).splitlines() if l.strip()]


def table_data_rows(body):
    rows = []
    for l in meaningful_lines(body):
        if l.startswith("|") and not re.match(r"^\|[\s:\-|]+\|?$", l):
            rows.append([c.strip() for c in l.strip("|").split("|")])
    return rows[1:]  # bỏ dòng tiêu đề


def check(path):
    errors = []
    try:
        text = open(path, encoding="utf-8").read()
    except OSError as e:
        return [f"không đọc được file: {e}"]

    first = next((l for l in text.splitlines() if l.strip()), "").lower()
    if COMPLETION["title"] in first:
        spec = COMPLETION
    elif SUBAGENT["title"] in first:
        spec = SUBAGENT
    else:
        return ["không nhận diện được loại báo cáo (dòng tiêu đề phải là "
                "'# Completion Report' hoặc '# Sub-agent Report')"]

    sections = parse_sections(text)
    for name in spec["sections"]:
        if name not in sections:
            errors.append(f"thiếu mục bắt buộc: '## {name}'")
        elif not meaningful_lines(sections[name]):
            errors.append(f"mục '{name}' đang trống (không áp dụng thì ghi 'N/A — <lý do>')")

    # Placeholder chưa điền
    for i, line in enumerate(text.splitlines(), 1):
        if "{{" in line and "}}" in line and not line.lstrip().startswith(">"):
            errors.append(f"dòng {i}: còn placeholder chưa điền: {line.strip()[:60]}")

    # Trạng thái hợp lệ
    status_lines = meaningful_lines(sections.get("Status", ""))
    status = status_lines[0].lower() if status_lines else ""
    if status and status not in spec["statuses"]:
        errors.append(f"Status '{status_lines[0]}' không hợp lệ; cho phép: "
                      + ", ".join(sorted(spec["statuses"])))

    # Bảng bằng chứng phải có dòng dữ liệu thật (trừ khi Blocked/REFUSED/BLOCKED)
    exempt = status in {"blocked", "refused"}
    for name in spec["table_sections"]:
        body = sections.get(name, "")
        if not meaningful_lines(body):
            continue
        rows = table_data_rows(body)
        if not rows:
            if not exempt and not re.search(r"n/a\s*[—-]", body, re.I):
                errors.append(f"mục '{name}' cần ít nhất 1 dòng bằng chứng (hoặc 'N/A — <lý do>')")
        else:
            for r in rows:
                if any(not c for c in r):
                    errors.append(f"mục '{name}' có ô trống trong dòng: | {' | '.join(r)} |")

    # Completed ⇒ phải có Not verified thật sự được suy nghĩ (không chỉ 'none')
    if status == "completed":
        nv = " ".join(meaningful_lines(sections.get("Not verified", ""))).lower()
        if nv in {"none", "n/a", "không", "none."}:
            errors.append("Status 'Completed' nhưng 'Not verified' chỉ ghi 'none' không kèm lý do; "
                          "ghi 'None — <lý do tin được>'")

    # Cụm bị cấm (bỏ qua dòng chú thích/comment)
    body_no_comments = strip_comments(text)
    for i, line in enumerate(body_no_comments.splitlines(), 1):
        low = line.lower()
        for phrase in BANNED:
            if phrase in low:
                errors.append(f"cụm bị cấm '{phrase}' (AGENTS §3.4): {line.strip()[:70]}")
    return errors


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    failed = False
    for path in argv[1:]:
        errs = check(path)
        if errs:
            failed = True
            print(f"✘ {path}")
            for e in errs:
                print(f"   - {e}")
        else:
            print(f"✔ {path} — đạt kiểm tra hình thức (chưa phải xác nhận nội dung đúng)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
