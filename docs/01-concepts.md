# 01 — Khái niệm nền tảng: CI/CD và vai trò từng công cụ

## CI vs CD — đừng nhầm 2 khái niệm này

- **CI (Continuous Integration)**: mỗi lần dev push code, hệ thống TỰ ĐỘNG kiểm tra
  code đó có "hoà nhập" tốt với phần còn lại không — build, chạy test, (thường có)
  lint/scan. Mục tiêu: phát hiện lỗi CÀNG SỚM CÀNG TỐT, không để dồn đến cuối sprint.
  Trong lab này: các stage `Install deps`, `Test`, `Build image`, `Push to Harbor`,
  `Kiểm tra scan` trong `app/Jenkinsfile` chính là CI.
- **CD**: có 2 nghĩa hay bị gộp lẫn, cần phân biệt rõ khi trả lời phỏng vấn:
  - **Continuous Delivery**: code luôn ở trạng thái SẴN SÀNG để deploy bất cứ lúc nào,
    nhưng bước "bấm nút" deploy lên production vẫn có thể cần con người xác nhận.
  - **Continuous Deployment**: TỰ ĐỘNG deploy lên production ngay khi qua hết pipeline,
    không cần con người bấm nút.
  - Lab này làm theo hướng **Continuous Deployment** (stage `Deploy (Ansible)` chạy tự
    động) để đơn giản hoá, nhưng bạn hoàn toàn có thể thêm bước `input` (manual
    approval) trong Jenkinsfile để biến nó thành Continuous Delivery — biết cách nói
    rõ sự khác biệt này là điểm cộng lớn khi phỏng vấn.

## Vì sao chọn Jenkins (CI orchestrator)

Jenkins là "bộ não" chạy pipeline: nó lắng nghe sự kiện (push code, hoặc lịch/poll),
rồi thực thi tuần tự các stage định nghĩa trong `Jenkinsfile`. Điểm mạnh: pipeline
"as code" (versioned cùng repo), hệ sinh thái plugin khổng lồ, chạy được trên
infrastructure tự quản lý (self-hosted) — khác với GitHub Actions/GitLab CI vốn gắn
chặt với platform Git tương ứng. Đánh đổi: phải tự vận hành/patch Jenkins, cấu hình
phức tạp hơn so với CI tích hợp sẵn trong GitHub/GitLab.

## Vì sao chọn Harbor (registry riêng)

Harbor là 1 **OCI-compliant container registry** mã nguồn mở, chạy được on-premise.
So với Docker Hub công khai, Harbor cho:
- **RBAC theo project**: mỗi project (namespace image) có quyền truy cập riêng.
- **Vulnerability scanning tích hợp sẵn** (Trivy) — quét lỗ hổng ngay khi push image,
  không cần tool riêng.
- **Robot accounts**: tài khoản máy-tới-máy (CI push, server pull) tách biệt khỏi tài
  khoản người dùng thật, dễ thu hồi quyền khi cần.
- **Replication** giữa nhiều Harbor instance (không dùng trong lab này, nhưng nên biết
  để trả lời câu "Harbor có hỗ trợ multi-region không?").

So với Nexus/Artifactory (cũng lưu được container image nhưng vốn sinh ra cho nhiều
loại artifact khác như jar/npm/maven), Harbor tập trung 100% vào container/OCI
artifact và có UI/scan dành riêng cho use-case đó.

## Vì sao chọn Ansible (provisioning + deployment)

Ansible là công cụ **configuration management / orchestration**, đặc điểm cốt lõi:
- **Agentless**: không cần cài phần mềm agent trên máy đích, chỉ cần SSH + Python.
  So với Chef/Puppet (cần agent cài sẵn, mô hình **pull** — agent tự định kỳ kéo cấu
  hình về áp dụng), Ansible dùng mô hình **push** — máy điều khiển (control node) chủ
  động SSH vào và áp dụng thay đổi ngay khi bạn chạy playbook.
- **Idempotent**: chạy lại playbook nhiều lần trên cùng 1 trạng thái không gây thay
  đổi thêm/không gây lỗi — mỗi module (`apt`, `copy`, `docker_container`,...) tự kiểm
  tra trạng thái hiện tại trước khi hành động. Đây là lý do Ansible an toàn để chạy
  lặp lại trong CI/CD (mỗi lần deploy chỉ là "đảm bảo trạng thái đúng như khai báo").
- **YAML declarative**: khai báo "tôi muốn trạng thái cuối cùng là gì", không phải
  viết script imperative từng bước như shell.

Trong lab này, Ansible được dùng cho **2 việc khác nhau về bản chất**:
1. `infra/` — **provisioning**: dựng hạ tầng nền (cài Docker, deploy Jenkins, deploy
   Harbor). Chạy hiếm, thường là thao tác thủ công/có kiểm soát chặt.
2. `deploy/` — **application deployment**: đưa 1 image cụ thể lên chạy. Chạy tự động,
   liên tục, mỗi khi có build mới.

Tách 2 việc này ra 2 thư mục (2 inventory, 2 bộ playbook riêng) phản ánh đúng cách các
tổ chức thật tách "infra repo" và "app/deploy repo" — khác người vận hành, khác tần
suất thay đổi, khác mức độ rủi ro khi chạy sai.

## Bức tranh tổng thể

```
Dev push code (app/)
        │
        ▼
   Jenkins (CI) ── test ── build image ── push ──► Harbor (registry + scan)
        │                                                  │
        └──────────────► gọi Ansible (CD) ◄──pull image────┘
                                │
                                ▼
                    Container app chạy trên server
```

Đọc tiếp `02-pipeline-flow.md` để thấy chi tiết từng bước tương ứng với đoạn code nào.
