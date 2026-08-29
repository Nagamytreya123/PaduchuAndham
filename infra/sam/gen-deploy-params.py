import re
from pathlib import Path

env_file = Path(__file__).resolve().parent.parent / ".env.production"
out_file = Path(__file__).resolve().parent / ".deploy-params.yaml"

env: dict[str, str] = {}
for line in env_file.read_text(encoding="utf-8").splitlines():
    m = re.match(r"^([^#=]+)=(.*)$", line.strip())
    if m:
        env[m.group(1).strip()] = m.group(2).strip()


def g(key: str, default: str = "") -> str:
    return env.get(key, default)


params = {
    "ClientUrl": g("CLIENT_URL", "https://www.paduchuandham.com"),
    "JwtSecret": g("JWT_SECRET"),
    "MongoDbUri": g("MONGODB_URI"),
    "GoogleClientId": g("GOOGLE_CLIENT_ID"),
    "GoogleClientSecret": g("GOOGLE_CLIENT_SECRET"),
    "AdminEmails": g("ADMIN_EMAILS"),
    "AdminOrderNotifyEmail": g("ADMIN_ORDER_NOTIFY_EMAIL"),
    "RazorpayKeyId": g("RAZORPAY_KEY_ID"),
    "RazorpayKeySecret": g("RAZORPAY_KEY_SECRET"),
    "RazorpayWebhookSecret": g("RAZORPAY_WEBHOOK_SECRET"),
    "SmtpHost": g("SMTP_HOST"),
    "SmtpPort": g("SMTP_PORT", "587"),
    "SmtpSecure": g("SMTP_SECURE", "false"),
    "SmtpUser": g("SMTP_USER"),
    "SmtpPass": g("SMTP_PASS"),
    "SmtpFrom": g("SMTP_FROM"),
    "RedisUrl": g("REDIS_URL"),
    "UploadsBucketName": "paduchuandham-uploads-474476202047",
    "FrontendBucketName": "paduchuandham-frontend-474476202047",
}

def yaml_value(value: str) -> str:
    if value == "":
        return "''"
    if any(c in value for c in ":&*?#[]{},") or value.startswith("'"):
        escaped = value.replace("'", "''")
        return f"'{escaped}'"
    return value


lines = []
for key, value in params.items():
    lines.append(f"{key}: {yaml_value(value)}")

out_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Wrote {out_file}")
