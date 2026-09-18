# infra/ — Provision hạ tầng CI/CD

Ansible playbook dựng **hạ tầng nền** cho toàn bộ lab: cài Docker Engine, deploy Jenkins
(image tùy chỉnh có sẵn Docker CLI + Ansible), deploy Harbor (registry riêng có scan bảo mật).

Đây là ví dụ cho việc dùng Ansible như một công cụ **provisioning / configuration
management**, khác với `deploy/` (dùng Ansible cho **application deployment**). Tách 2
việc này ra 2 thư mục vì trong thực tế chúng thường có tần suất chạy, người vận hành,
và vòng đời rất khác nhau: `infra/` chạy hiếm (khi dựng server mới hoặc đổi cấu hình nền
tảng), `deploy/` chạy liên tục (mỗi lần có bản build mới).

## Chạy thế nào

```bash
cd infra
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.ini inventory/hosts.ini   # sửa IP/user thật vào file này
ansible-playbook playbook-provision.yml
```

Yêu cầu: server đích chạy Ubuntu hoặc Debian, SSH key đã được thêm vào server, user SSH
có quyền sudo (playbook dùng `become: true`).

## Vì sao thứ tự role là docker → jenkins → harbor

- `docker`: **phải chạy trước tiên** vì cả Jenkins lẫn Harbor đều được deploy bằng
  Docker container/compose. Role này cũng cấu hình `insecure-registries` trong
  `/etc/docker/daemon.json` để Docker daemon tin tưởng Harbor (Harbor trong lab chạy
  HTTP, không TLS).
- `jenkins` và `harbor`: **không phụ thuộc lẫn nhau**, chỉ đều phụ thuộc `docker`. Thứ
  tự giữa 2 role này không quan trọng.

## Idempotency — chạy lại nhiều lần có an toàn không?

- Role `docker`: an toàn tuyệt đối, `apt`/`systemd`/`copy` module của Ansible tự kiểm
  tra trạng thái hiện tại trước khi đổi gì.
- Role `jenkins`: an toàn — build lại image Docker và `docker compose up` là các thao
  tác idempotent (compose chỉ recreate container nếu có gì thay đổi).
- Role `harbor`: **idempotent một cách có chủ đích, không phải mặc định**. Bộ cài
  offline chính thức của Harbor (`install.sh`) không được thiết kế để chạy lại an toàn
  cho việc nâng cấp phiên bản — chạy lại có thể phá vỡ dữ liệu hoặc cấu hình hiện có.
  Vì vậy role này dùng sự tồn tại của `{{ harbor_home }}/docker-compose.yml` làm "marker"
  để **bỏ qua hoàn toàn** các bước cài đặt nếu Harbor đã được cài trước đó. Muốn nâng
  cấp Harbor thật sự, phải theo quy trình migrate chính thức của Harbor (đổi version,
  backup DB, chạy migration tool) — không phải chạy lại role này.

## Về việc mount Docker socket vào Jenkins (Docker-outside-of-Docker)

`infra/roles/jenkins/templates/docker-compose.jenkins.yml.j2` mount
`/var/run/docker.sock` từ host vào container Jenkins để pipeline build được Docker
image mà không cần Docker-in-Docker (vốn phức tạp và có vấn đề về hiệu năng/ổn định).
**Đánh đổi**: bất kỳ job Jenkins nào chạy được lệnh cũng coi như có quyền root trên
host, vì điều khiển được Docker daemon của host. Đây là một câu hỏi phỏng vấn kinh
điển ("Jenkins agent chạy trong Docker container, làm sao để nó build được image?") —
xem thêm phân tích ở `docs/03-security.md`.

## Về insecure-registries

Harbor trong lab này chạy HTTP thuần (không cấu hình TLS) để đơn giản hoá setup. Docker
daemon mặc định từ chối kết nối tới registry không phải HTTPS, nên role `docker` phải
khai báo Harbor vào danh sách `insecure-registries`. Đây **không phải** cách làm cho
production — production phải có certificate TLS hợp lệ cho Harbor.
