# Nhật ký học CI/CD (Jenkins + Harbor + Ansible)

File này để bạn tự cập nhật mỗi lần học tiếp — checklist tiến độ, câu hỏi còn thắc
mắc, và ghi chú của riêng bạn. Không cần commit chỉnh chu, cứ ghi thoải mái như sổ tay.

## Bối cảnh — đọc phần này nếu bạn mở lại bằng 1 phiên chat/trợ lý khác

**Mục tiêu**: học Jenkins + Harbor + Ansible đủ sâu (kể cả các case lỗi/edge case) để
trình bày tự tin trong 1 buổi phỏng vấn DevOps/CI-CD — ưu tiên hiểu chắc hơn tốc độ.

**Repo**: https://github.com/hieudeptrai196/cicd (nhánh `main`) — clone hoặc mở lại
`D:\private_project\cicdlearning` là đủ, không cần kể lại lịch sử chat cũ.

**Đã có gì (xem tóm tắt ở `README.md` và "Checklist tiến độ" bên dưới)**: toàn bộ code/
playbook cho 1 pipeline CI/CD đầy đủ — `infra/` (Ansible provision Docker + Jenkins +
Harbor), `app/` (REST API Node.js mẫu + Jenkinsfile), `deploy/` (Ansible deploy có
health-check + auto-rollback), `docs/01`–`05` (khái niệm, luồng pipeline, bảo mật,
failure case, Q&A phỏng vấn — tất cả tiếng Việt). App đã test chạy thật (pass), nhưng
`infra/` và `deploy/` **CHƯA từng chạy trên server thật** vì lúc dựng chưa có VPS.

**Trạng thái tại thời điểm ghi chú này (2026-09-18)**: chưa mua VPS. Kế hoạch: mua VPS
(dự kiến 2026-09-19), sau đó chạy provisioning + pipeline lần đầu tiên.

**Cách bạn muốn được hướng dẫn tiếp** (nói rõ với trợ lý mới nếu cần): **cầm tay chỉ
việc, đi từng bước một** — chạy 1 bước, giải thích bước đó đang làm gì/vì sao, nêu các
case lỗi có thể xảy ra ngay tại bước đó (đối chiếu `docs/04-failure-cases.md`), xác
nhận bạn hiểu rồi mới sang bước tiếp theo. KHÔNG chạy toàn bộ `ansible-playbook
playbook-provision.yml` một lèo rồi báo cáo kết quả cuối — mục đích là hiểu, không chỉ
là có pipeline chạy được.

**Việc cần làm khi có VPS** (chi tiết ở checklist bên dưới): điền IP/SSH user thật vào
`infra/inventory/hosts.ini` và `deploy/inventory/hosts.ini`, đồng bộ `harbor_hostname`/
`harbor_registry`/`HARBOR_REGISTRY` giữa `infra/group_vars/all.yml`,
`deploy/group_vars/all.yml`, `app/Jenkinsfile`, rồi mới bắt đầu chạy
`infra/playbook-provision.yml` — từng role một (docker → jenkins → harbor), không
chạy full playbook ngay nếu muốn hiểu kỹ từng phần.

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
