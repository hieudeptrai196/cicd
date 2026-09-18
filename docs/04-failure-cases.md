# 04 — Các case lỗi & cách hệ thống này xử lý (trọng tâm ôn phỏng vấn)

Mỗi mục: **tình huống → điều gì thực sự xảy ra trong lab này → vì sao thiết kế vậy**.

## 1. Test fail (`npm test` trong stage Test)

Xảy ra gì: Jenkinsfile dừng ngay tại stage `Test`, các stage `Build image`,
`Push to Harbor`, `Deploy` **không chạy**. Không có image lỗi nào được tạo ra hay
push lên Harbor.
Vì sao: fail-fast — phát hiện lỗi càng sớm càng tốt, tránh lãng phí thời gian
build/push/deploy 1 thứ chắc chắn sẽ lỗi.

## 2. Build image fail (Dockerfile sai, thiếu file, out of disk...)

Xảy ra gì: dừng tại stage `Build image`. Image cũ (tag trước) vẫn đang chạy bình
thường trên server — build fail không ảnh hưởng gì tới production.
Vì sao: vì mỗi image có tag riêng theo git SHA, image mới build lỗi không hề đụng
tới image cũ đang chạy dưới tag khác.

## 3. Push to Harbor fail (sai credential, Harbor down, hết dung lượng disk)

Xảy ra gì: dừng tại stage `Push to Harbor`. Image đã build xong nhưng chỉ tồn tại cục
bộ trên máy Jenkins agent, chưa lên được Harbor.
Case đặc biệt cần biết: nếu Harbor **hết dung lượng disk**, push sẽ fail với lỗi từ
Docker daemon/Harbor registry. Cách xử lý thật: Harbor có tính năng **garbage
collection** (GC) — dọn các blob không còn artifact nào tham chiếu tới (ví dụ do xoá
tag cũ). GC KHÔNG chạy tự động theo mặc định, phải lên lịch (Harbor UI → Administration
→ Garbage Collection) hoặc gọi API định kỳ.

## 4. Scan phát hiện lỗ hổng Critical (`deploy/playbook-check-scan.yml`)

Xảy ra gì: playbook `fail`, Jenkinsfile dừng, **không chạy** stage Deploy. Image vẫn
nằm trên Harbor (có thể xem chi tiết CVE trong Harbor UI) nhưng không lên production.
Vì sao không tự xoá image luôn: giữ lại để điều tra/audit — biết chính xác build nào
dính lỗ hổng gì, tránh vô tình build/push lại y hệt mà không hay biết.
Edge case: nếu Harbor API chưa scan xong khi playbook gọi tới (`scan_status` chưa
`Success`) → playbook `retries: 15, delay: 5` (tối đa ~75 giây) để đợi. Nếu quá thời
gian này mà scan vẫn chưa xong, playbook fail với lỗi timeout của `uri` module — đây
là dấu hiệu Harbor jobservice có vấn đề, cần kiểm tra riêng.

## 5. Ansible không SSH được tới target host (network, sai key, server down)

Xảy ra gì: `ansible-playbook` fail ngay ở bước đầu (gathering facts / connection),
Jenkinsfile báo FAILURE. Không có gì bị thay đổi trên server (vì chưa kết nối được thì
chưa chạy task nào).
Cách debug thực tế: `ansible-playbook ... -vvv` để xem chi tiết lỗi SSH, hoặc
`ansible app_servers -m ping` để test riêng kết nối trước khi chạy playbook đầy đủ.

## 6. Deploy xong nhưng health-check fail

Xảy ra gì: chính là case được thiết kế kỹ nhất trong `deploy/roles/deploy_app`:
1. Container mới được tạo nhưng không trả `200` ở `/health` sau
   `health_check_retries * health_check_delay` giây.
2. Nếu có tag chạy trước đó → **tự động rollback**: chạy lại container với tag cũ.
3. Playbook vẫn **fail** (dù server đã hồi phục) để Jenkins/người vận hành biết tag
   mới có vấn đề, cần điều tra riêng — không được coi nhầm là "deploy thành công".

## 7. Deploy lần đầu tiên fail (không có tag cũ để rollback)

Xảy ra gì: playbook fail với thông báo rõ ràng "không có tag nào trước đó để rollback,
cần can thiệp thủ công" — vì đây là deploy đầu tiên, chưa từng có phiên bản nào chạy
thành công trước đó để quay lại.
Đây là giới hạn thực tế của cơ chế rollback dựa trên marker file đơn giản — nên biết
để trả lời câu "rollback mechanism của bạn có xử lý được mọi trường hợp không?".

## 8. Jenkins agent/container bị restart hoặc mất giữa chừng khi đang build

Xảy ra gì: build đang chạy bị đánh dấu ABORTED/FAILURE. Vì `jenkins_home` được mount
ra Docker volume riêng (`docker-compose.jenkins.yml.j2`), lịch sử build cũ và cấu hình
Jenkins **không bị mất** khi container restart — chỉ build đang dở bị huỷ.
Nếu build đó đã đi tới sau stage `Push to Harbor` nhưng chưa tới `Deploy`: image đã
tồn tại trên Harbor nhưng chưa được deploy — trạng thái an toàn (production vẫn chạy
tag cũ), chỉ cần trigger lại build (hoặc chạy tay `ansible-playbook playbook-deploy.yml`
với đúng tag đó).

## 9. `disableConcurrentBuilds()` — vì sao Jenkinsfile chặn build chạy song song

Nếu 2 build cùng chạy đồng thời, cả 2 đều có thể gọi `deploy/playbook-deploy.yml` gần
như cùng lúc, dẫn tới race condition trên `rollback_marker_file` (build A đọc tag cũ,
build B cũng đọc đúng tag đó, cả 2 cùng ghi đè — sai lệch dữ liệu rollback). Chặn
concurrent build là cách đơn giản nhất để tránh race condition này trong 1 lab với 1
target host duy nhất.

## 10. Harbor admin password / DB password để plaintext trong `infra/group_vars/all.yml`

Đây là hạn chế **có chủ đích để đơn giản hoá lab ban đầu**, không phải thiết kế cho
thật. `docs/03-security.md` có hướng dẫn chuyển sang Ansible Vault — nên tự làm bài
tập này để hiểu rõ quy trình mã hoá secret trước khi đi phỏng vấn.
