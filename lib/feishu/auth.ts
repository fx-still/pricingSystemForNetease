type TokenCache = {
  token: string;
  expiresAt: number;
};

let cache: TokenCache | null = null;

const REFRESH_BUFFER_MS = 60 * 1000;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }
  return value;
}

export async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();
  if (cache && now + REFRESH_BUFFER_MS < cache.expiresAt) {
    return cache.token;
  }

  const appId = getRequiredEnv("FEISHU_APP_ID");
  const appSecret = getRequiredEnv("FEISHU_APP_SECRET");

  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("飞书 token 获取失败");
  }

  const data = (await response.json()) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };

  if (data.code !== 0 || !data.tenant_access_token || !data.expire) {
    throw new Error(`飞书 token 获取失败: ${data.msg ?? "unknown"}`);
  }

  cache = {
    token: data.tenant_access_token,
    expiresAt: now + data.expire * 1000,
  };

  return cache.token;
}
