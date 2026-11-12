# SHIORI YouTube Engine Specification

Module ưu tiên cao phụ trách phân tích và xử lý quảng cáo YouTube mà không gây lỗi trình phát video.

## Quy tắc kỹ thuật nghiêm ngặt:
1. **Tuyệt đối không hack time / speed video** hoặc mô phỏng click giả mạo.
2. **Không chặn mù quáng các video CDN chunks** (`googlevideo.com`).
3. **Player Stability First:** Nếu phát hiện `player error` hoặc video bị pause bất thường, kích hoạt Circuit Breaker chuyển ngay sang trạng thái Fallback (ALLOW) để đảm bảo trải nghiệm xem video không bị gián đoạn.
4. **Phân biệt rõ ràng:**
   - Platform Ad (In-stream, preroll, midroll).
   - Overlay banner trên player.
   - Banner ngoài khung player.
   - Video nội dung chính thức.
