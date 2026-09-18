# deploy/ — Ansible cho phần CD (Continuous Deployment)

Khác với `infra/` (dựng hạ tầng nền, chạy hiếm), thư mục này lo việc **đưa 1 image cụ
thể lên chạy**, được gọi tự động từ `app/Jenkinsfile` mỗi lần pipeline CI thành công.

## 2 playbook

- `playbook-check-scan.yml`: gọi Harbor API, đợi Trivy scan xong, chặn pipeline nếu
  lỗ hổng vượt ngưỡng (`max_severity_allowed` trong `group_vars/all.yml`).
- `playbook-deploy.yml`: pull image mới, recreate container, health-check, **tự động
  rollback** về tag chạy thành công gần nhất nếu health-check thất bại.

## Vì sao dùng inventory thay vì hardcode IP trong playbook

`inventory/hosts.ini` là nơi DUY NHẤT khai báo server đích (`app_servers` group). Nhờ
vậy, nếu sau này bạn có nhiều server thật (thay vì gộp chung 1 server như lab này),
chỉ cần thêm host vào group này — không phải sửa playbook hay role. Đây chính là điểm
khác biệt cốt lõi giữa "chạy 1 script deploy.sh qua SSH" và "dùng 1 công cụ orchestration
như Ansible": inventory tách biệt *cái gì cần làm* (role) khỏi *làm ở đâu* (inventory).

## Cơ chế rollback hoạt động thế nào

1. Trước khi deploy, role đọc file `rollback_marker_file` trên target host (nếu có) —
   đây là tag đã chạy **thành công** ở lần deploy trước.
2. Deploy tag mới, đợi vài giây, health-check `GET /health`.
3. Nếu health-check fail: chạy lại container với tag cũ đã lưu, rồi **vẫn báo playbook
   fail** — vì mục tiêu ban đầu (đưa tag mới lên) không đạt được, dù server đã hồi phục.
4. Nếu health-check pass: ghi tag mới vào `rollback_marker_file`, sẵn sàng làm điểm
   rollback cho lần deploy tiếp theo.

Giới hạn cần biết: đây là rollback dựa trên 1 marker file đơn giản, phù hợp để **học
khái niệm**. Ansible không tự lưu lịch sử nhiều version (không như Kubernetes
Deployment có revision history) — muốn rollback về tag cũ hơn 1 bước, phải tự chạy lại
playbook với `-e image_tag=<tag cũ>` thủ công.

## Chạy thử thủ công (không qua Jenkins)

```bash
cd deploy
ansible-galaxy collection install -r requirements.yml
ansible-playbook playbook-check-scan.yml -e image_tag=abc1234
ansible-playbook playbook-deploy.yml -e image_tag=abc1234
```
