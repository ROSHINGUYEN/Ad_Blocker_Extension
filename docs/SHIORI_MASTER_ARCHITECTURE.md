# SHIORI Master Architecture

Tài liệu thiết kế kiến trúc toàn diện cho hệ thống **SHIORI AD CLEANER**.

## 1. Modular Architecture Overview
Hệ thống gồm 4 phân tầng chính:
- **Presentation & Runtime:** Browser Extension (MV3), Local Dashboard SPA.
- **Specialized Engines:** WebAd Engine, YouTube Engine, Redirect Guard, Privacy Shield, Rule Engine.
- **Intelligence & Decision Core:** Signal Extractors (Network, DOM, Behavior, Media) & Decision Engine Matrix.
- **Shared Contracts & Storage:** Typed contracts (`@shiori/shared`), Local-first IndexedDB cache.

## 2. Core Philosophy
- **Clean Browsing. Smart Detection. User Privacy.**
- Không đánh đổi tính ổn định để lấy tỷ lệ chặn quảng cáo.
- Không tự tiện xóa nội dung khi confidence chưa đủ cao.
