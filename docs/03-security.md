# 03 — Bảo mật: scan image, quản lý secret, các đánh đổi đã chọn

## Image scanning (Trivy tích hợp trong Harbor)

Mỗi lần push image, Harbor tự trigger job scan bằng Trivy (cấu hình trong
`infra/roles/harbor/templates/harbor.yml.j2`, phần `trivy:`). `deploy/playbook-check-scan.yml`
poll API Harbor tới khi job scan xong, đọc `severity` cao nhất, và **chặn deploy** nếu
vượt ngưỡng `max_severity_allowed` (mặc định: chặn `Critical`).

Đây là ví dụ cụ thể của **shift-left security**: thay vì để đội security quét sau khi
đã deploy (hoặc không quét luôn), lỗ hổng được chặn ngay trong pipeline, trước khi có
cơ hội chạy ở production.

**Câu hỏi phỏng vấn hay gặp**: "Nếu chặn cả High thì sao, có quá gắt không?" → Đây là
quyết định đánh đổi giữa tốc độ release và rủi ro bảo mật, thường KHÔNG nên hardcode
cứng nhắc mà nên cấu hình theo từng project/môi trường (dev có thể lỏng hơn, prod chặt
hơn) — đúng như cách `max_severity_allowed` được đưa ra làm biến, không hardcode trong
logic.

## Credential — 2 nơi lưu secret khác nhau, vì sao tách riêng

1. **Jenkins Credentials Store**: chứa Harbor robot account mà **Jenkins** dùng để
   push image. Được inject vào pipeline qua `credentials('harbor-robot-account')`
   trong Jenkinsfile — Jenkins tự động mask giá trị này trong console log.
2. **Ansible Vault**: chứa Harbor robot account mà **Ansible/server đích** dùng để
   pull image lúc deploy (`deploy/group_vars/all.yml` — hiện đang để plaintext
   placeholder, PHẢI mã hoá trước khi dùng thật).

Vì sao không dùng chung 1 chỗ? Jenkins Credentials Store chỉ Jenkins truy cập được;
Ansible chạy độc lập (có thể chạy tay, không qua Jenkins) nên cần secret riêng mà
Ansible tự đọc được mà không phụ thuộc Jenkins đang chạy.

### Cách mã hoá secret bằng Ansible Vault

```bash
cd deploy
ansible-vault encrypt_string 'GiaTriThatCuaPassword' --name 'harbor_robot_password'
# Dán kết quả (dạng !vault |...) vào group_vars/all.yml thay cho dòng plaintext

# Khi chạy playbook, thêm --ask-vault-pass hoặc --vault-password-file
ansible-playbook playbook-deploy.yml -e image_tag=abc1234 --ask-vault-pass
```

Trong Jenkinsfile, vault password nên được lưu như 1 credential khác trong Jenkins
Credentials Store (kiểu "Secret file" hoặc "Secret text"), không hardcode.

## Docker socket mount — đánh đổi lớn nhất trong lab này

`infra/roles/jenkins/templates/docker-compose.jenkins.yml.j2` mount
`/var/run/docker.sock` vào container Jenkins để pipeline build được image Docker.

**Vấn đề**: Docker daemon chạy với quyền root trên host. Bất kỳ ai điều khiển được
Docker daemon (qua socket này) đều có thể chạy container với `--privileged`, mount
`/` của host vào container, rồi từ đó có toàn quyền trên host — tức là **quyền trên
socket này tương đương quyền root trên host**. Nếu 1 Jenkinsfile độc hại (hoặc 1 plugin
bị compromise) chạy trong Jenkins container, nó có thể leo thang chiếm toàn bộ server.

**Vì sao lab này vẫn chọn cách này**: đơn giản, không cần Docker-in-Docker (DinD, vốn
có vấn đề về hiệu năng/độ ổn định và cũng có rủi ro bảo mật tương tự), phù hợp cho môi
trường học tập 1 server duy nhất.

**Cách làm production-grade hơn** (nên biết để trả lời phỏng vấn dù lab không triển
khai): build agent Jenkins chạy trên Kubernetes với mỗi job 1 pod tạm thời (Jenkins
Kubernetes plugin), dùng `kaniko` hoặc `buildah` để build image **không cần Docker
daemon/socket** — loại bỏ hoàn toàn rủi ro này.

## Vì sao Harbor trong lab chạy HTTP (insecure-registry) chứ không TLS

Bật TLS đúng cách cần certificate hợp lệ (tự ký hoặc từ CA thật) + cấu hình thêm ở cả
Harbor lẫn Docker daemon. Lab này bỏ qua để giảm độ phức tạp setup ban đầu, nhưng đây
là 1 lỗ hổng thật: traffic push/pull image (bao gồm cả credential lúc login) đi qua
HTTP không mã hoá trong mạng nội bộ. Production PHẢI dùng TLS thật.

**Muốn tự nâng cấp lên TLS** (bài tập thêm, không bắt buộc cho mục tiêu học hiện tại):
1. Sinh certificate (tự ký cho lab: `openssl req -x509 -newkey rsa:4096 ...`, hoặc
   dùng Let's Encrypt nếu server có domain + IP public thật).
2. Thêm section `https:` vào `harbor.yml.j2`, trỏ `certificate`/`private_key`.
3. Xoá `insecure-registries` khỏi `/etc/docker/daemon.json`, thay bằng copy CA cert
   vào `/etc/docker/certs.d/<harbor_hostname>/ca.crt` trên MỌI máy cần pull/push
   (kể cả máy dev nếu build local).

## Nguyên tắc chung đã áp dụng trong lab

- **Least privilege**: container app chạy bằng user `node` (không phải root) —
  `app/Dockerfile`.
- **Immutable artifact**: image tag theo git SHA, không dùng `latest` — mọi container
  đang chạy đều truy vết được về đúng commit.
- **Robot account riêng cho máy-tới-máy**: không dùng tài khoản admin Harbor cho CI/CD.
