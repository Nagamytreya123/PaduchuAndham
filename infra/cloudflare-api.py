"""Cloudflare API helpers using Wrangler OAuth token."""
import json
import subprocess
import sys
import urllib.request


def wrangler_token() -> str:
    out = subprocess.run(
        ["npx", "wrangler", "auth", "token"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
        shell=True,
    )
    stdout = out.stdout or ""
    for line in stdout.splitlines():
        line = line.strip()
        if not line or line.startswith("─") or "wrangler" in line.lower() or line.startswith("⛅"):
            continue
        if len(line) > 20 and "." in line:
            return line
    raise RuntimeError("Could not read wrangler auth token — run: npx wrangler login")


def api_get(path: str) -> dict:
    token = wrangler_token()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def zone_id() -> str:
    zones = api_get("/zones?name=paduchuandham.com")
    if not zones.get("result"):
        print("Zone not found")
        sys.exit(1)
    return zones["result"][0]["id"]


def print_dns(zid: str) -> None:
    data = api_get(f"/zones/{zid}/dns_records")
    for r in data.get("result", []):
        proxied = "proxied" if r.get("proxied") else "dns-only"
        print(f"  {r['type']:6} {r['name']:45} -> {r['content'][:70]}  [{proxied}]")


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "zones"
    if cmd == "zones":
        data = api_get("/zones?name=paduchuandham.com")
        for z in data.get("result", []):
            print(f"{z['name']}  id={z['id']}  status={z['status']}")
    elif cmd == "status":
        zones = api_get("/zones?name=paduchuandham.com")
        zone = zones["result"][0]
        zid = zone["id"]
        print(f"Domain:      {zone['name']}")
        print(f"Status:      {zone['status']}")
        print(f"Zone ID:     {zid}")
        print(f"Paused:      {zone.get('paused')}")
        print("Nameservers:")
        for ns in zone.get("name_servers", []):
            print(f"  - {ns}")
        try:
            ssl = api_get(f"/zones/{zid}/settings/ssl")
            print(f"SSL mode:    {ssl['result']['value']}")
        except urllib.error.HTTPError:
            print("SSL mode:    (check in dashboard — API token lacks settings read)")
        print()
        print("DNS records:")
        print_dns(zid)
    elif cmd == "dns":
        zid = sys.argv[2] if len(sys.argv) > 2 else zone_id()
        print_dns(zid)
    else:
        print("Usage: python infra/cloudflare-api.py [zones|status|dns]")
        sys.exit(1)


if __name__ == "__main__":
    main()
