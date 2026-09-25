# 覓搭 MiDa 上線宣傳片

- 成片：`out/MiDa-launch-film.mp4`（1920×1080 · 30fps · H.264 + AAC · 63 秒）
- 画面素材：Stitch 项目 **MiDa**（`projects/17483975682150139468`）中的原始设计稿，以及 Celestial Destiny 设计系统
- 文案依据：`觅搭 MeetUp PRD`（2026-09-08 final）及附录、Stitch《营销套件.md》（`stitch/marketing-kit.md`）
- 语言与市场：繁体中文，面向 P1 主发行轨「国际版」（台／港／新马华人圈）

## 分镜

| 时间 | 场景 | 画面（Stitch 画面 ID） | 文案 |
|---|---|---|---|
| 0–5s | 开场 | 星空、金色轨道 | 茫茫人海，為什麼偏偏是 TA？ |
| 5–10s | 痛点 | 三张只有分数的匿名配对卡 | 一般的配對，只給你一個分數——卻說不出為什麼，也不知道第一句該說什麼。 |
| 10–15.5s | 品牌 | `logo-mark.png` | 覓搭 MiDa · 有理由的連接 · 以命理為內核，開啟有理由的遇見 |
| 15.5–22s | 01 生辰建檔 | 登錄與註冊 `97f5fcd2`、生辰建檔與獨立授權 `063c099c` | 生辰，是無法美化的真實。生辰資料獨立授權、註銷即刪，只用於為你排盤。 |
| 22–30s | 02 AI 命書 | 八字命書與專業排盤 `abe3b348`、西式占星星盤 `fc07fadf`、命書章節詳解 `d4ec7139` | 同一張盤，千人千面的深度敘事；每一段解讀，都能回溯到排盤依據。 |
| 30–37s | 03 每日五維 | 今日運勢五維評分 `26af4e3c` | 感情・事業・財富・健康・人際；評分與結論永久免費 |
| 37–46s | 04 雙人合盤 | 雙人合盤與契合度洞察 `8d94a905` | 關係亮點／互補之處／破冰話題卡；合盤報告，就是你們的第一句話。 |
| 46–52s | 05 邀友 | 合盤邀請與裂變分享 `726763ff`、社群宣傳卡 | 分享到 Instagram、LINE、WhatsApp，好友註冊後，雙方各得 1 張深讀券。 |
| 52–56s | 信任 | 四张信任卡 | 評分與結論永遠免費 · 生辰獨立授權 · 註銷即刪 · 18+ 成人專屬 |
| 56–63s | 结尾 | Logo + CTA | 有理由的連接 · AI 命盤 · 深度合盤 · 五維日運 · App Store 搜尋「覓搭 MiDa」 |

配乐是 `scripts/music.py` 合成的原创音乐：D 宫五声音阶铺底、拨弦琶音、76 BPM 低频脉冲、转场闪光。没有使用第三方音频素材，不存在授权问题。

## 文案合规核对（对照 PRD）

- **FR-26 / FR-30**：只写「評分與結論永遠免費，付費只為深度解讀」，不出现价格，也不出现「解鎖結果」之类的表述。
- **FR-6 / FR-3 / FR-2**：「獨立授權、可隨時撤回」「註銷即刪」「18+」都是 PRD 已经定案的承诺。
- **FR-12**：邀友文案写的是「雙方各得 1 張深讀券」。每人每月最多 6 张的上限在片中没有展开，投放落地页需要补上。
- **FR-13**：结尾带显式 AI 标识和文化参考声明。
- **FR-41 / 附录 §5**：全片不出现算命、预测、改运、吉凶断言。「五維日運」出自 Stitch 营销套件，只适用于国际版。**国内版投放前需要改掉「運勢／日運」类表述**（广告法第九条），换成「每日五維・了解自己」这类说法。
- CTA「App Store 搜尋」按 PRD「本期 App Store only」设置，**正式投放前请确认上架状态**。

## 重新生成

```bash
cd promo-video
npm install
npm run stitch     # Stitch 原稿 HTML → build/screens/*.png（本地编译 Tailwind，2x 分辨率）
npm run music      # 生成 build/music.wav（需要 numpy）
npm run render     # 逐帧渲染 → out/MiDa-launch-film.mp4（需要 imageio-ffmpeg 或设置 FFMPEG）
node scripts/render-video.mjs --stills 3,27,45   # 只导出静帧预览
```

- `stitch/html/`：从 Stitch 下载的原始 HTML。`stitch/img/`：logo 和营销视觉图。`stitch/screens.json`：画面 ID 与标题的对照。
- 沙箱中 Chromium 不信任出口代理的证书，所以页面里的外部请求（Google Fonts、Stitch 图片）由 `scripts/lib/net.mjs` 改走 Node 转发（读取 `HTTPS_PROXY`，需要 `NODE_USE_ENV_PROXY=1`，已写进 npm 脚本）并缓存到 `build/cache/`。本地机器上同样可用。
- Stitch 原型页顶部的「原型狀態演示」调试条由 `scripts/lib/clean.js` 在渲染时隐藏。
- 要改文案、节奏或画面，编辑 `composition/index.html`：场景 DOM 加上底部的时间轴（`A()` / `rise()` / `scene()`）。用浏览器打开 `composition/index.html?t=27` 就能预览任意秒数。
