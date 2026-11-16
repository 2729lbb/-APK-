const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

global.window = {};
for (const f of ["zh-a", "zh-b", "en-primary", "en-junior", "en-senior", "en-university", "en-b"]) {
  const src = fs.readFileSync(path.join(root, "data", f + ".js"), "utf8");
  (0, eval)(src);
}
const ZH = global.window.ZH_TIERS || [];
const EN = global.window.EN_TIERS || [];
const problems = [];
const report = [];

const ACC = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ";
const BAS = "aaaaeeeeiiiioooouuuuvvvvvnnnm";
const toAscii = s => [...s].map(ch => { const i = ACC.indexOf(ch); return i >= 0 ? BAS[i] : ch; }).join("").toLowerCase();
const step = (t, i, ch) => {
  while (i < t.length && t[i] === " ") i++;
  if (ch === " ") return { i, ok: true };
  if (i >= t.length) return { i, ok: true, finished: true };
  if (t[i] === ch) return { i: i + 1, ok: true };
  return { i, ok: false };
};

for (const [mode, tiers] of [["zh", ZH], ["en", EN]]) {
  for (const tier of tiers) {
    const seen = new Set();
    let sylMismatch = 0;
    for (const w of tier.words) {
      if (seen.has(w[0])) problems.push(`${tier.id} 重复词: ${w[0]}`);
      seen.add(w[0]);
      if (mode === "zh") {
        if (!w[1]) problems.push(`${tier.id} 缺拼音: ${w[0]}`);
        else {
          const n = w[1].trim().split(/\s+/).length;
          const c = [...w[0]].length;
          if (n !== c) { sylMismatch++; problems.push(`${tier.id} 音节数不符: ${w[0]} (${n} vs ${c})`); }
          if (/[^a-z]/.test(toAscii(w[1]).replace(/ /g, ""))) problems.push(`${tier.id} 拼音含非字母: ${w[0]}`);
          if (!toAscii(w[1]).trim()) problems.push(`${tier.id} 拼音空: ${w[0]}`);
        }
      } else {
        if (!/^[a-z]+$/.test(w[0])) problems.push(`${tier.id} 非纯字母词: ${w[0]}`);
        if (!w[1]) problems.push(`${tier.id} 缺音标: ${w[0]}`);
        if (!w[2]) problems.push(`${tier.id} 缺释义: ${w[0]}`);
      }
    }
    report.push(`${tier.id} ${tier.name}: ${tier.words.length} 条${sylMismatch ? " 音节异常 " + sylMismatch : ""}`);
  }
}

// 匹配器行为
const cases = [
  [toAscii("shí shì"), "shi shi"],
  [toAscii("lǜ"), "lv"],
  [JSON.stringify(step("hu jia", 0, "h")), JSON.stringify({ i: 1, ok: true })],
  [JSON.stringify(step("hu jia", 2, "j")), JSON.stringify({ i: 4, ok: true })],
  [String(step("hu jia", 2, "x").ok), "false"]
];
for (const [got, want] of cases) if (got !== want) problems.push(`匹配器异常: ${got} != ${want}`);

let i = 0, bad = 0;
for (const ch of "hujiahuwei") { const r = step("hu jia hu wei", i, ch); if (!r.ok) bad++; i = r.i; }
if (i !== 13 || bad !== 0) problems.push(`整词输入异常: i=${i} bad=${bad}`);

// 内联脚本语法检查
const html = fs.readFileSync(path.join(root, "打字网站Ultra.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!m) problems.push("找不到内联脚本");
else {
  const src = m[m.length - 1].replace(/^<script>/, "").replace(/<\/script>$/, "");
  try { new Function(src); } catch (e) { problems.push("内联脚本语法错误: " + e.message); }
}

console.log(report.join("\n"));
console.log("---");
if (problems.length) { console.log("FAIL"); problems.slice(0, 60).forEach(p => console.log("  " + p)); process.exit(1); }
console.log("OK 全部检查通过");
