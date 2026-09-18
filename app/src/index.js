const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint health-check: đây là endpoint mà deploy/roles/deploy_app dùng để
// xác nhận container mới chạy thành công trước khi coi deploy là "thành công".
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'CI/CD demo app',
    // APP_VERSION được set bằng chính git SHA (image tag) khi Ansible chạy
    // container - nhờ vậy có thể xác nhận trực tiếp version nào đang chạy.
    version: process.env.APP_VERSION || 'dev',
  });
});

app.get('/add/:a/:b', (req, res) => {
  const a = Number(req.params.a);
  const b = Number(req.params.b);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return res.status(400).json({ error: 'a và b phải là số' });
  }
  return res.status(200).json({ result: a + b });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`App đang chạy tại port ${PORT}`);
  });
}

module.exports = app;
