# 05 — Câu hỏi phỏng vấn thường gặp (bám theo chính lab này)

Mỗi câu: trả lời ngắn gọn, có thể trỏ thẳng vào file cụ thể trong lab để chứng minh
bạn không chỉ học thuộc lý thuyết.

**1. CI khác CD ở đâu? Continuous Delivery khác Continuous Deployment thế nào?**
→ Xem `docs/01-concepts.md`. Lab này làm Continuous Deployment (tự động deploy, không
cần người bấm nút) — nói rõ bạn hiểu sự khác biệt và biết cách chuyển sang Continuous
Delivery bằng cách thêm bước `input` approval.

**2. Vì sao không dùng tag `latest` cho image?**
→ `latest` không cho biết đang chạy đúng version nào, không rollback được chính xác.
Lab tag theo git SHA (`app/Jenkinsfile`, biến `IMAGE_TAG`) — mọi container chạy đều
truy vết ngược được về đúng commit.

**3. Ansible là gì, khác Chef/Puppet ở điểm nào?**
→ Agentless (chỉ cần SSH), mô hình push thay vì pull, YAML declarative. Xem
`docs/01-concepts.md`.

**4. Idempotent nghĩa là gì, vì sao quan trọng trong CI/CD?**
→ Chạy lại nhiều lần không gây thêm thay đổi/lỗi nếu trạng thái đã đúng. Quan trọng vì
pipeline có thể chạy lại (retry) sau khi fail giữa chừng mà không sợ phá hỏng gì thêm.
Ví dụ cụ thể: `infra/roles/harbor/tasks/main.yml` dùng `stat` để bỏ qua bước cài nếu
đã cài rồi — vì Harbor's `install.sh` bản thân KHÔNG idempotent, phải tự làm điều đó.

**5. Nếu deploy fail giữa chừng thì sao? Có rollback không?**
→ Có, tự động. Xem case 6 trong `docs/04-failure-cases.md` và code trong
`deploy/roles/deploy_app/tasks/main.yml`. Biết luôn giới hạn: không có tag cũ (lần
deploy đầu tiên) thì không rollback được, cần can thiệp thủ công.

**6. Làm sao đảm bảo image không dính lỗ hổng bảo mật trước khi lên production?**
→ Harbor tích hợp Trivy scan tự động khi push; pipeline poll kết quả và chặn nếu vượt
ngưỡng nghiêm trọng (`deploy/playbook-check-scan.yml`). Đây là shift-left security.

**7. Secret/credential được quản lý thế nào, có hardcode không?**
→ Không. Jenkins dùng Credentials Store, Ansible dùng Vault — 2 nơi khác nhau vì 2 hệ
thống chạy độc lập. Xem `docs/03-security.md`.

**8. Jenkins chạy trong Docker, làm sao nó build được Docker image?**
→ Mount `/var/run/docker.sock` từ host vào container Jenkins (Docker-outside-of-Docker).
Phải nói được đánh đổi bảo mật đi kèm (tương đương quyền root trên host) và hướng khắc
phục production-grade (kaniko/buildah trên Kubernetes, không cần socket) — xem
`docs/03-security.md`.

**9. Vì sao tách `infra/` và `deploy/` thành 2 bộ Ansible riêng thay vì gộp chung?**
→ Khác tần suất chạy (infra hiếm, deploy liên tục), khác người vận hành, khác mức độ
rủi ro. Phản ánh cách tổ chức repo thật ở nhiều công ty (infra repo vs app/deploy repo).
Xem `infra/README.md`.

**10. Ansible inventory dùng để làm gì, vì sao không hardcode IP trong playbook?**
→ Inventory tách "cái gì cần làm" (role/playbook) khỏi "làm ở đâu" (host). Muốn thêm
server mới chỉ cần sửa `inventory/hosts.ini`, không đụng vào logic. Xem `deploy/README.md`.

**11. Health check trong pipeline này hoạt động thế nào, có edge case nào không?**
→ Curl `/health`, retry theo `health_check_retries`/`health_check_delay`. Edge case:
container start chậm hơn thời gian chờ → cần tăng retries/delay theo đặc thù app thật;
health-check chỉ kiểm tra HTTP 200, không kiểm tra logic nghiệp vụ sâu hơn (readiness
thật sự cần check kết nối DB, dependency ngoài,... — lab này đơn giản hoá).

**12. Polling vs webhook để trigger Jenkins build?**
→ Xem mục cuối `docs/02-pipeline-flow.md`. Biết được ưu/nhược mỗi cách và điều kiện
hạ tầng cần có cho webhook (Jenkins phải reachable từ Git server).

**13. Harbor GC (garbage collection) để làm gì?**
→ Dọn các blob (layer) không còn artifact nào tham chiếu, tránh disk đầy dần theo thời
gian khi liên tục push image mới. Không chạy tự động mặc định — case 3 trong
`docs/04-failure-cases.md`.

**14. Nếu 2 build chạy song song thì sao?**
→ Lab chặn hẳn bằng `disableConcurrentBuilds()` để tránh race condition trên file
đánh dấu tag hiện tại (rollback marker) — xem case 9 trong `docs/04-failure-cases.md`.
Ở quy mô lớn hơn, cách xử lý đúng đắn là dùng lock có thứ tự (ví dụ Ansible + file lock
có timeout, hoặc queue deploy) thay vì chặn cứng toàn bộ concurrency.

## Câu hỏi mở để bạn tự luyện thêm (chưa có sẵn câu trả lời trong lab)

Đây là những câu bạn nên tự tìm hiểu thêm và ghi câu trả lời của riêng mình vào
`LEARNING_LOG.md` ở thư mục gốc:

- Blue-green deployment và canary deployment khác gì cách "recreate container" mà lab
  này đang làm? Đánh đổi gì (thời gian downtime vs độ phức tạp hạ tầng)?
- Nếu chuyển sang Kubernetes, Ansible/Jenkins/Harbor sẽ đổi vai trò thế nào (Helm chart
  thay cho Ansible deploy role, Jenkins vẫn giữ vai trò CI, Harbor vẫn là registry)?
- Làm sao giám sát (monitoring/alerting) sau khi container đã deploy — lab này chỉ có
  health-check tại thời điểm deploy, không có giám sát liên tục sau đó.
