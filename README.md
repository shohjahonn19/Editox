# EditX AI Studio

EditX AI Studio — video + musiqa yuklab, ritmga mos qisqa montaj eksport qiladigan brauzer MVP.

## Nimalar ishlaydi
- Video va musiqa yuklash
- 15 / 30 / 45 soniyalik montaj
- Reels (9:16), YouTube (16:9), kvadrat (1:1) format
- Audio energiyasidan beat/zarba nuqtalarini taxminiy aniqlash
- Videoni kadrlar harakati va yorqinligiga qarab tahlil qilish
- Musiqaga yaqin kesishlar, rang/kontrast ishlovi
- MP4 eksport
- EditX logotipi `public/editx-logo.svg` ichida

## Muhim: bu hali to‘liq professional AI emas
Bu birinchi ishlaydigan MVP. U odam yuzini, voqea mazmunini yoki eng muhim syujetni semantik AI bilan tushunmaydi; sahnalarni harakat/yorqinlik asosida taxminiy tanlaydi. Hozirgi versiya murakkab motion graphics, avtomatik stiker topish, haqiqiy optical-flow slow motion, beat bo‘yicha dinamik zoom va serverdagi AI modelni o‘z ichiga olmaydi. Bularni qo‘shish uchun alohida vision/audio model va kuchli render backend kerak.

## Ishga tushirish
Node.js 20+ o‘rnatilgan kompyuterda:

```bash
npm install
npm run dev
```

Terminalda ko‘rsatilgan local URL ni brauzerda oching.

## GitHub Pages
Vite ilovasini GitHub Pages’da deploy qilish uchun `vite.config.js` base yo‘lini repository nomiga moslang (masalan `base: '/EditX-AI-Studio/'`), `npm run build` bajaring va `dist/` papkasini Pages workflow orqali deploy qiling. Faqat statik HTML fayllarni qo‘yish yetmaydi: dependency’lar build qilinishi kerak.

## Mobil telefon haqida
Telefon brauzerida ishlashi mumkin, ammo uzoq/4K videolar katta xotira talab qiladi. Dastlab 30–100 MB atrofidagi qisqa 720p/1080p fayl bilan sinab ko‘ring. Browser FFmpeg katta fayllarda sekin va xotira jihatidan cheklangan; bu cheklov FFmpeg.wasm hujjatlarida ham qayd etilgan: https://ffmpegwasm.netlify.app/docs/faq/

## Maxfiylik
Media fayllari ilova ichida, brauzerda qayta ishlanadi; FFmpeg dvigatelini ilk yuklash uchun internet kerak. CDN manzillarini production’da o‘z hosting’ingizga ko‘chirish tavsiya qilinadi.
