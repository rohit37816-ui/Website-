import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const app=express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(rateLimit({windowMs:60000,max:100}));
app.use(session({secret:process.env.SESSION_SECRET||"change_this",resave:false,saveUninitialized:false,cookie:{secure:process.env.NODE_ENV==="production"}}));
app.use(express.static(path.join(process.cwd(),"public")));

const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024}});
const storageGCS=new Storage({keyFilename:process.env.GOOGLE_APPLICATION_CREDENTIALS});
const BUCKET=process.env.GCS_BUCKET_NAME;

let db;
(async()=>{ db=await open({filename:'./data.db',driver:sqlite3.Database}); await db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE,password_hash TEXT)`); await db.exec(`CREATE TABLE IF NOT EXISTS files(id INTEGER PRIMARY KEY AUTOINCREMENT,filename TEXT,gcs_path TEXT,uploader TEXT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);})();

function requireAuth(req,res,next){ if(req.session?.user?.username) return next(); res.status(401).send("Unauthorized");}

// Register
app.post('/register',async(req,res)=>{ const {username,password}=req.body; if(!username||!password)return res.status(400).send("Missing"); const hash=await bcrypt.hash(password,10); try{ await db.run("INSERT INTO users(username,password_hash) VALUES(?,?)",[username,hash]); res.status(201).send("Registered"); }catch(e){ res.status(400).send("User exists"); }});

// Login
app.post('/login',async(req,res)=>{ const {username,password}=req.body; const user=await db.get("SELECT * FROM users WHERE username=?",[username]); if(!user) return res.status(401).send("Invalid"); const ok=await bcrypt.compare(password,user.password_hash); if(!ok) return res.status(401).send("Invalid"); req.session.user={username:user.username}; res.send("Logged in"); });

// Logout
app.post('/logout',(req,res)=>{ req.session.destroy(()=>res.send("Logged out")); });

// Upload
app.post('/upload',requireAuth,upload.single('file'),async(req,res)=>{ if(!req.file)return res.status(400).send("No file"); const filename=`${Date.now()}_${req.file.originalname}`; const bucket=storageGCS.bucket(BUCKET); const file=bucket.file(filename); const stream=file.createWriteStream({metadata:{contentType:req.file.mimetype},resumable:false}); stream.on('error',(err)=>{console.error(err);res.status(500).send("Upload error");}); stream.on('finish',async()=>{ await db.run("INSERT INTO files(filename,gcs_path,uploader) VALUES(?,?,?)",[req.file.originalname,filename,req.session.user.username]); res.status(201).send("Uploaded");}); stream.end(req.file.buffer); });

// List Files
app.get('/files',requireAuth,async(req,res)=>{ const rows=await db.all("SELECT id,filename,gcs_path,uploader,created_at FROM files ORDER BY created_at DESC"); const bucket=storageGCS.bucket(BUCKET); const filesWithUrls=await Promise.all(rows.map(async r=>{ const file=bucket.file(r.gcs_path); const [url]=await file.getSignedUrl({action:'read',expires:Date.now()+60*60*1000}); return {...r,url}; })); res.json(filesWithUrls); });

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));      <input type="password" name="password" placeholder="Password" required />
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
