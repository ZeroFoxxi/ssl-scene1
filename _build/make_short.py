# 由 SHORT=1 生成的 26 页原始稿，按精简版顺序保留 10 页
import re, zipfile, shutil, subprocess, sys, os
SK = os.environ["PPTX_SKILL"]
shutil.rmtree("short_unz", ignore_errors=True)
zipfile.ZipFile("场景一专项_汇报精简版_raw.pptx").extractall("short_unz")
p = "short_unz/ppt/presentation.xml"; x = open(p, encoding="utf-8").read()
m = re.search(r"<p:sldIdLst>(.*?)</p:sldIdLst>", x, re.S)
ids = re.findall(r"<p:sldId [^>]*/>", m.group(1)); assert len(ids) == 26, len(ids)
order = [1, 2, 4, 5, 8, 25, 11, 12, 22, 23, 24]
x = x[:m.start()] + "<p:sldIdLst>" + "".join(ids[i - 1] for i in order) + "</p:sldIdLst>" + x[m.end():]
x = re.sub(r'<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">.*?</p:ext>', "", x, flags=re.S)
open(p, "w", encoding="utf-8").write(x)
subprocess.run([sys.executable, SK + "/scripts/clean.py", "short_unz"], check=True, capture_output=True)
out = "场景一专项_汇报精简版.pptx"
if os.path.exists(out): os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk("short_unz"):
        for f in files:
            full = os.path.join(root, f); z.write(full, os.path.relpath(full, "short_unz"))
print("short deck written")
