# Nhật ký học CI/CD (Jenkins + Harbor + Ansible)

File này để bạn tự cập nhật mỗi lần học tiếp — checklist tiến độ, câu hỏi còn thắc
mắc, và ghi chú của riêng bạn. Không cần commit chỉnh chu, cứ ghi thoải mái như sổ tay.

## Checklist tiến độ

### Đã xong (dựng cùng trợ lý)
- [x] Thiết kế cấu trúc project: `infra/` (provision) / `app/` (code + CI) /
      `deploy/` (CD) / `docs/` (tài liệu học).
- [x] Viết Ansible role `docker`, `jenkins` (build image Jenkins custom), `harbor`
      (cài qua offline installer chính thức).
- [x] Viết app mẫu Node.js (Express) + test bằng `node --test`.
- [x] Viết `Jenkinsfile`: checkout → test → build → push Harbor → check scan → deploy.
- [x] Viết Ansible role `deploy_app`: pull image, health-check, auto-rollback.
- [x] Viết `docs/01` đến `docs/05`: khái niệm, luồng pipeline, bảo mật, failure case, Q&A.

### Việc bạn cần tự làm tiếp (trên server thật của bạn)
- [ ] Sửa `infra/inventory/hosts.ini` và `deploy/inventory/hosts.ini` với IP/user SSH
      thật của server.
- [ ] Sửa `harbor_hostname` trong `infra/group_vars/all.yml` cho khớp domain/IP thật,
      đồng bộ với `harbor_registry` trong `deploy/group_vars/all.yml` và
      `HARBOR_REGISTRY` trong `app/Jenkinsfile`.
- [ ] Chạy `infra/playbook-provision.yml` — ghi lại log/lỗi gặp phải nếu có vào phần
      "Câu hỏi & vướng mắc" bên dưới.
- [ ] Setup Jenkins qua UI (plugin, credential `harbor-robot-account`, tạo pipeline job)
      — theo `docs/02-pipeline-flow.md` mục "Giai đoạn 0.5".
- [ ] Tạo project + robot account trong Harbor UI.
- [ ] Trigger build đầu tiên, xác nhận thấy image trong Harbor + container chạy được.
- [ ] Thử CHỦ ĐỘNG làm hỏng 1 test trong `app/test/app.test.js`, chạy lại pipeline,
      quan sát pipeline dừng đúng chỗ như mô tả trong `docs/04-failure-cases.md`.
- [ ] Thử đổi health-check endpoint thành sai (`/health-wrong`) để tự tay quan sát cơ
      chế auto-rollback hoạt động thật.
- [ ] Làm bài tập chuyển `harbor_robot_password`/`harbor_admin_password` sang mã hoá
      bằng `ansible-vault` (hướng dẫn ở `docs/03-security.md`).
- [ ] (Nâng cao, tuỳ chọn) Bật TLS thật cho Harbor thay vì insecure-registry.

## Câu hỏi & vướng mắc (tự ghi lại khi gặp)

> Mẫu: `[ngày] Vướng gì -> đã hiểu ra sao / còn treo`

-

## Ghi chú riêng / điều vừa hiểu ra

-

## Liên kết nhanh

- Tổng quan: [README.md](README.md)
- Khái niệm: [docs/01-concepts.md](docs/01-concepts.md)
- Luồng pipeline: [docs/02-pipeline-flow.md](docs/02-pipeline-flow.md)
- Bảo mật: [docs/03-security.md](docs/03-security.md)
- Failure case: [docs/04-failure-cases.md](docs/04-failure-cases.md)
- Interview Q&A: [docs/05-interview-qa.md](docs/05-interview-qa.md)
