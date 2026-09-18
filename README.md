# CI/CD Learning Lab — Jenkins + Harbor + Ansible

Project học tập để chuẩn bị phỏng vấn: dựng 1 pipeline CI/CD thật, chạy được, trên 1
server Ubuntu/Debian, gồm Jenkins (CI), Harbor (private registry + scan bảo mật), và
Ansible (dùng cho cả provisioning hạ tầng lẫn deploy ứng dụng).

## Cấu trúc

```
cicdlearning/
├── infra/    # Ansible: provision server (Docker, Jenkins, Harbor) - xem infra/README.md
├── app/      # App mẫu Node.js + Dockerfile + Jenkinsfile (pipeline CI)
├── deploy/   # Ansible: deploy app, health-check, auto-rollback - xem deploy/README.md
├── docs/     # Khái niệm, luồng pipeline, bảo mật, failure case, câu hỏi phỏng vấn
└── LEARNING_LOG.md  # Checklist tiến độ + nơi ghi lại câu hỏi/vướng mắc của bạn
```

## Đọc theo thứ tự này để hiểu toàn bộ

1. [`docs/01-concepts.md`](docs/01-concepts.md) — vì sao chọn Jenkins/Harbor/Ansible,
   CI vs CD.
2. [`docs/02-pipeline-flow.md`](docs/02-pipeline-flow.md) — luồng chạy chi tiết từng
   bước, đối chiếu với code thật.
3. [`docs/03-security.md`](docs/03-security.md) — scan bảo mật, quản lý secret, các
   đánh đổi (Docker socket mount, insecure-registry).
4. [`docs/04-failure-cases.md`](docs/04-failure-cases.md) — 10 tình huống lỗi cụ thể
   và cách hệ thống này xử lý (trọng tâm để trả lời phỏng vấn).
5. [`docs/05-interview-qa.md`](docs/05-interview-qa.md) — tổng hợp câu hỏi phỏng vấn
   thường gặp, bám theo chính lab này.

## Chạy end-to-end (tóm tắt — chi tiết xem `infra/README.md` và `deploy/README.md`)

```bash
# 1. Provision hạ tầng (1 lần)
cd infra
ansible-galaxy collection install -r requirements.yml
# Sửa inventory/hosts.ini với IP/user SSH thật trước khi chạy
ansible-playbook playbook-provision.yml

# 2. Setup Jenkins qua UI: plugin, credential harbor-robot-account, tạo pipeline job
#    -> xem docs/02-pipeline-flow.md mục "Giai đoạn 0.5"

# 3. Tạo project + robot account trong Harbor UI

# 4. Push code trong app/ -> Jenkins tự build -> tự deploy
#    Hoặc chạy tay:
cd ../deploy
ansible-galaxy collection install -r requirements.yml
ansible-playbook playbook-check-scan.yml -e image_tag=<git-sha>
ansible-playbook playbook-deploy.yml -e image_tag=<git-sha>

# 5. Kiểm tra
curl http://<server>:3000/health
```

## Trạng thái hiện tại

Toàn bộ code/playbook trong repo này đã được viết đầy đủ nhưng **chưa được chạy thử
trên server thật** (được dựng trong 1 phiên làm việc không có quyền truy cập trực tiếp
vào VPS của bạn). Việc tiếp theo là bạn tự chạy trên server, ghi lại lỗi/vướng mắc gặp
phải vào [`LEARNING_LOG.md`](LEARNING_LOG.md) để cùng gỡ tiếp.
