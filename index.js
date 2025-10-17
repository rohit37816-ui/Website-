
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My File Storage</title>
  <style>
    /* General body styles */
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    h1 {
      margin-top: 20px;
      font-size: 2.5rem;
      text-shadow: 2px 2px #00000050;
    }

    /* Card style container */
    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 15px;
      padding: 20px 30px;
      margin: 20px 0;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    }

    input, button {
      width: 100%;
      padding: 10px 15px;
      margin: 10px 0;
      border-radius: 8px;
      border: none;
      font-size: 1rem;
    }

    input {
      background: rgba(255,255,255,0.2);
      color: #fff;
    }

    input::placeholder {
      color: #ddd;
    }

    button {
      background: #ff6a00;
      background: linear-gradient(45deg, #ff6a00, #ffcc00);
      color: #000;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    button:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }

    /* File list table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.3);
    }

    th {
      color: #ffeb3b;
    }

    a {
      color: #00ffff;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 500px){
      .card { padding: 15px; }
      h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <h1>My File Storage</h1>

  <!-- Login Card -->
  <div class="card">
    <h2>Login</h2>
    <form id="login">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  </div>

  <!-- Upload Card -->
  <div class="card">
    <h2>Upload File</h2>
    <form id="upload" enctype="multipart/form-data">
      <input type="file" name="file" required />
      <button type="submit">Upload</button>
    </form>
  </div>

  <!-- File List Card -->
  <div class="card">
    <h2>Files</h2>
    <table id="fileList">
      <thead>
        <tr>
          <th>File Name</th>
          <th>Uploader</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <!-- JS -->
  <script>
    async function post(path, data) {
      const resp = await fetch(path, { method: 'POST', body: data, credentials: 'include' });
      return resp;
    }

    document.getElementById('login').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await post('/login', new URLSearchParams(fd));
      alert(await res.text());
      loadFiles();
    };

    document.getElementById('upload').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await fetch('/upload', { method: 'POST', body: fd, credentials: 'include' });
      alert(await res.text());
      loadFiles();
    };

    async function loadFiles() {
      const r = await fetch('/files', { credentials: 'include' });
      const tbody = document.querySelector('#fileList tbody');
      tbody.innerHTML = '';
      if (r.status !== 200) {
        tbody.innerHTML = `<tr><td colspan="3">Login first</td></tr>`;
        return;
      }
      const files = await r.json();
      files.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${f.filename}</td><td>${f.uploader}</td><td><a href="${f.url}" target="_blank">Download</a></td>`;
        tbody.appendChild(tr);
      });
    }

    loadFiles();
  </script>
</body>
</html>
