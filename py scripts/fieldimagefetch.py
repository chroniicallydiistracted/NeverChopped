import argparse, os, time, urllib.parse, requests
from bs4 import BeautifulSoup

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://gridiron-uniforms.com/",
}

def discover(year, category, size, team_filter):
    url = f"https://gridiron-uniforms.com/fields/controller/controller.php?action=view-year-all&year={year}"
    r = requests.get(url, headers=DEFAULT_HEADERS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        if "action=view-single-field" in a["href"] and "image_path=" in a["href"]:
            q = urllib.parse.urlparse(a["href"]).query
            params = urllib.parse.parse_qs(q)
            path = urllib.parse.unquote(params.get("image_path", [""])[0])
            if not path:
                continue
            if path.startswith("http://"):
                path = "https://" + path.split("://", 1)[1]
            if path.startswith("/"):
                path = "https://gridiron-uniforms.com" + path
            parts = urllib.parse.urlparse(path)
            segs = parts.path.split("/")
            if len(segs) < 7:
                continue
            cat = segs[3]
            team = segs[4]
            sz = segs[5]
            if cat != category or sz != size:
                continue
            if team_filter and team not in team_filter:
                continue
            out.append((team, path))
    return sorted(set(out))

def download(items, outdir, delay):
    os.makedirs(outdir, exist_ok=True)
    for team, url in items:
        fname = url.rsplit("/", 1)[-1]
        ddir = os.path.join(outdir, team)
        os.makedirs(ddir, exist_ok=True)
        fp = os.path.join(ddir, fname)
        if not os.path.exists(fp):
            with requests.get(url, headers=DEFAULT_HEADERS, stream=True, timeout=60) as r:
                if r.status_code == 200:
                    with open(fp, "wb") as f:
                        for chunk in r.iter_content(1 << 16):
                            if chunk:
                                f.write(chunk)
            time.sleep(delay)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--year", required=True)
    p.add_argument("--category", default="regular-season")
    p.add_argument("--size", default="r1024")
    p.add_argument("--team", action="append")
    p.add_argument("--out", default="gud_fields")
    p.add_argument("--delay", type=float, default=0.3)
    args = p.parse_args()
    items = discover(args.year, args.category, args.size, set(args.team) if args.team else None)
    download(items, os.path.join(args.out, f"{args.category}_{args.year}_{args.size}"), args.delay)
    print(f"downloaded {len(items)} files")
