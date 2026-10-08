# Nghê Cót · Giấy

> Cuốn sách giấy nổi (pop-up book) tương tác để học về **Cổ phục Việt Nam (Việt phục)**, có chú **Nghê giấy** đồng hành, chấm đồ và trả lời câu hỏi.

Đây là phiên bản **Giấy** của dự án *Nghê Cót*, một bài dự thi **AI Arena Vietnam 2026** (chủ đề *Việt phục Remix*). Mọi thứ trên màn hình đều làm bằng giấy: giấy cắt, giấy dán, giấy gấp, tem, băng keo, mép giấy xé.

## Có gì trong sách

- **Chín áo, chín chương**: mỗi chương là một cổ phục, có trang giấy nổi, bộ phận, dòng thời gian và nguồn trích dẫn.
- **Gặp áo**: những mảnh giấy dựng đứng trên mặt sách, bấm vào để xem từng bộ phận của áo.
- **Phối đồ**: búp bê giấy mặc thử áo xưa phối với đồ hiện đại (35 bộ có sẵn, có chấm điểm, gợi ý màu).
- **Đừng nhầm**: so sánh các cặp áo dễ lẫn.
- **Nữ / Nam**: chuyển giữa hai búp bê giấy.
- **Hỏi Nghê**: trò chuyện với Nghê bằng tiếng Việt, giọng Gen Z, Nghê chỉ trả lời từ kho dữ liệu của sách.
- **Thiệp**: lưu bộ phối thành tấm thiệp để chia sẻ.
- Dùng được trên **máy tính** và **điện thoại** (bố cục riêng cho điện thoại), có âm thanh giấy và hỗ trợ giảm chuyển động.

## Công nghệ

| Phần | Dùng |
|---|---|
| Giao diện | React 19, TypeScript, Vite 8 |
| Kiểu dáng, chuyển động | Tailwind CSS 4, CSS riêng từng phần, `motion` |
| Máy chủ | Express (một tệp `server.ts`) |
| AI | Google Gemini qua `@google/genai`, gọi **phía máy chủ** (khóa không lộ ra trình duyệt) |

## Chạy trên máy

Cần **Node.js 20+**.

```bash
npm install
cp .env.example .env
```

Mở `.env` và điền khóa Gemini:

```
GEMINI_API_KEY=khoa_cua_ban
PORT=3000
```

Chạy chế độ phát triển (Express + Vite chung một cổng):

```bash
npm run dev
```

Rồi mở http://localhost:3000.

Không có khóa Gemini thì sách vẫn đọc được bình thường; chỉ phần Nghê nhận xét và trò chuyện là không hoạt động.

## Đóng gói và chạy thật

```bash
npm run build   # dựng dist/ và gói server.ts thành server.js
npm start       # chạy node server.js
```

Các lệnh khác:

| Lệnh | Việc làm |
|---|---|
| `npm run lint` | Kiểm tra kiểu TypeScript (`tsc --noEmit`) |
| `npm run preview` | Xem bản đã dựng bằng Vite |
| `npm run clean` | Xóa `dist/` và `server.js` |

## API

Hai điểm cuối, đều là `POST` và đều có giới hạn thời gian:

| Đường dẫn | Việc làm |
|---|---|
| `/api/nghe` | Nghê chấm bộ phối: nhận các món và lỗi, trả **một câu** tiếng Việt (tối đa 25 chữ) |
| `/api/nghe-chat` | Nghê trả lời câu hỏi (tối đa 60 chữ), chỉ dùng dữ liệu của chương đang đọc; có thể trả về `action` để thay đồ trên búp bê |

## Cấu trúc thư mục

```
.
├── server.ts            # Express + hai API Gemini + phục vụ giao diện
├── index.html
├── public/              # Toàn bộ ảnh giấy (book/, doll/, popcard/, mech/, icons/)
├── docs/
│   ├── BUILD-RULES.md   # Luật dựng: đọc trước mỗi bước
│   └── MIX-RULES.md     # Luật chấm điểm Phối đồ
└── src/
    ├── data/            # Kho dữ liệu của chủ dự án (chỉ đọc)
    ├── book/            # Cuốn sách: bìa, trang, thẻ chương, thanh trên
    ├── spreads/         # Từng trang đôi: Gặp áo, Phối đồ, Đừng nhầm...
    ├── doll/            # Búp bê giấy và ghép lớp đồ
    ├── mix/             # Chấm điểm, màu, gợi ý phối đồ
    ├── nghe/            # Chú Nghê: bàn Nghê, trò chuyện, in thiệp
    ├── paper/           # Linh kiện giấy: tem, băng keo, mép xé, nắp lật
    ├── mobile/          # Bố cục điện thoại
    ├── share/           # Tạo thiệp chia sẻ
    └── dev/             # Công cụ kiểm tra khi phát triển (mở bằng ?dev)
```

## Nguyên tắc nội dung

- **Một nguồn sự thật**: mọi danh sách áo, màu, bộ phận, mốc thời gian và trích dẫn đều đọc từ `src/data/*.json`, không viết cứng trong mã.
- **Mọi chữ trên màn hình là tiếng Việt**, lấy nguyên văn từ `copy-giay.json` hoặc `kb.json`.
- **Nghê không bịa**: lời Nghê chỉ dựa trên dữ liệu được đưa vào. Nếu dữ liệu không có, Nghê nói thật là chưa biết.
- **Ảnh thiếu thì để trống**: không dùng hình giả; chỉ ghi `[art missing] <đường dẫn>` ở console.

Chi tiết xem `docs/BUILD-RULES.md` và `src/data/README.md`.

## Sử dụng AI trong dự án

- Giao diện được dựng trên **Google AI Studio** và tinh chỉnh bằng các trợ lý lập trình AI.
- Hình giấy do AI tạo ra rồi chọn lọc, chỉnh tay.
- Lời của Nghê do **Gemini** sinh trong lúc chạy, bị ràng buộc bởi kho dữ liệu và lời nhắc hệ thống trong `server.ts`.

## Phiên bản liên quan

**Nghê Cót · Mộc** là bản 3D (bàn thợ, mộc bản) của cùng dự án. Hai bản chia sẻ cùng ý tưởng và cùng chú Nghê, khác chất liệu: gỗ và giấy.
