# 02 — Luồng pipeline chi tiết, từng bước

## Giai đoạn 0: Provision (chạy 1 lần, thủ công)

```bash
cd infra && ansible-playbook playbook-provision.yml
```

Kết quả: server có Docker chạy sẵn, Jenkins nghe ở port 8080 (image custom có Docker
CLI + Ansible bên trong), Harbor nghe ở port 80. Xem chi tiết `infra/README.md`.

## Giai đoạn 0.5: Cấu hình Jenkins (làm 1 lần qua UI)

1. Mở `http://<server>:8080`, nhập initial admin password (Ansible in ra ở cuối
   playbook, hoặc lấy bằng `docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`).
2. Cài plugin: **Docker Pipeline**, **Git**, **Pipeline**.
3. Vào **Manage Jenkins → Credentials**, tạo credential kiểu "Username with password",
   ID = `harbor-robot-account`, username/password = robot account đã tạo trong Harbor
   (Harbor UI → Projects → cicd-demo → Robot Accounts → New).
4. Tạo 1 job kiểu **Pipeline**, trỏ "Pipeline script from SCM" vào repo chứa `app/`,
   script path = `app/Jenkinsfile`.
5. (Tuỳ chọn) Cấu hình webhook từ Git server để Jenkins tự trigger build khi có push,
   thay vì phải bấm "Build Now" thủ công — xem ghi chú "hook" ở cuối file này.

## Giai đoạn 1: CI — chạy mỗi khi có code mới

Tương ứng các stage trong `app/Jenkinsfile`:

| Stage | Làm gì | Nếu fail thì sao |
|---|---|---|
| Checkout | Lấy code mới nhất từ Git | Pipeline dừng, thường do lỗi credential/network |
| Install deps | `npm install` trong `app/` | Dừng — thiếu dependency thì không build được |
| Test | `npm test` (Node test runner, `app/test/app.test.js`) | **Dừng ngay** — không build/push image có test fail |
| Build image | `docker build` theo `app/Dockerfile`, tag = 7 ký tự đầu git SHA | Dừng — thường do lỗi Dockerfile |
| Push to Harbor | `docker login` bằng robot account, `docker push` | Dừng — thường do sai credential hoặc Harbor down |
| Kiểm tra scan | Gọi `deploy/playbook-check-scan.yml`, đợi Trivy, chặn nếu CVE Critical | Dừng — image ở lại Harbor nhưng KHÔNG được deploy |

## Giai đoạn 2: CD — chạy ngay sau khi CI xanh

Stage `Deploy (Ansible)` gọi `deploy/playbook-deploy.yml -e image_tag=<sha>`:

1. Đọc tag đang chạy hiện tại (nếu có) từ `rollback_marker_file` trên target host.
2. `docker login` Harbor bằng robot account, `docker pull` tag mới.
3. Recreate container `cicd-demo-app` với image mới, set env `APP_VERSION=<sha>`.
4. Health-check `GET /health` (retry `health_check_retries` lần, cách nhau
   `health_check_delay` giây).
5. Nếu health-check **pass**: ghi tag mới vào marker file, coi deploy thành công.
6. Nếu health-check **fail**: chạy lại container với tag CŨ (rollback), rồi vẫn fail
   playbook để Jenkins báo build đỏ — xem lý do tại `deploy/roles/deploy_app/tasks/main.yml`.

## Giai đoạn 3: Kiểm chứng thủ công (cách bạn tự test sau khi build xong)

```bash
curl http://<server>:3000/            # xem version đang chạy
curl http://<server>:3000/health      # health-check
curl http://<server>:3000/add/2/3     # {"result":5}
```

Và kiểm tra trong Harbor UI: Projects → cicd-demo → app → thấy tag mới + kết quả scan.

## Về "hook" — vì sao pipeline tự chạy khi có push

Có 2 cách để Jenkins biết "có code mới, chạy pipeline đi":
- **Polling**: Jenkins định kỳ tự hỏi Git server "có gì mới không?" — đơn giản, không
  cần cấu hình gì phía Git server, nhưng có độ trễ và tốn tài nguyên polling liên tục.
- **Webhook**: Git server (GitHub/GitLab/Gitea...) chủ động gọi HTTP request tới
  Jenkins ngay khi có push — tức thời, không tốn tài nguyên polling, nhưng yêu cầu
  Jenkins phải có địa chỉ mà Git server gọi tới được (public IP/domain, hoặc VPN/tunnel
  nếu Jenkins chạy sau NAT). Lab này không cấu hình sẵn webhook vì phụ thuộc việc bạn
  dùng Git server nào (GitHub, GitLab tự host, Gitea...) — nhưng nên hiểu và nói được
  sự khác biệt polling vs webhook khi phỏng vấn.

## Về Jenkins plugin cần thiết

`Docker Pipeline` (cho phép gọi `docker.build`/`docker.withRegistry` nếu bạn muốn viết
Jenkinsfile theo phong cách Groovy DSL thay vì gọi `sh 'docker ...'` trực tiếp như lab
này đang làm), `Git` (checkout SCM), `Pipeline` (core để chạy Jenkinsfile dạng
declarative). Lab này chọn cách gọi `sh` trực tiếp cho dễ hiểu/dễ debug hơn là dùng
Docker Pipeline DSL — đây cũng là 1 lựa chọn đáng nói khi phỏng vấn: "vì sao không
dùng Docker Pipeline plugin đầy đủ?" → đơn giản hoá, ít phụ thuộc plugin hơn, dễ chạy
được trên bất kỳ Jenkins nào chỉ cần có Docker CLI.
