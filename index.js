const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');

process.on('uncaughtException', (err) => {
    console.log('⚠️ تم رصد خطأ وتم التعامل معه لمنع إيقاف البوت:', err.message);
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const BANK_FILE = './bank.json';
const ELITE_FILE = './elite.json';
const BANNED_ADMINS_FILE = './banned_admins.json';
const BLACK_LIST_FILE = './black_list.json';

let activeGames = {};

let bankMemory = {};
let eliteMemory = []; 
let bannedAdminsMemory = [];
let blackListMemory = {}; 
let globalEliteMode = false; 

function loadData() {
    if (!fs.existsSync(BANK_FILE)) fs.writeFileSync(BANK_FILE, JSON.stringify({}));
    if (!fs.existsSync(ELITE_FILE)) fs.writeFileSync(ELITE_FILE, JSON.stringify([]));
    if (!fs.existsSync(BANNED_ADMINS_FILE)) fs.writeFileSync(BANNED_ADMINS_FILE, JSON.stringify([]));
    if (!fs.existsSync(BLACK_LIST_FILE)) fs.writeFileSync(BLACK_LIST_FILE, JSON.stringify({}));
    try {
        bankMemory = JSON.parse(fs.readFileSync(BANK_FILE));
        eliteMemory = JSON.parse(fs.readFileSync(ELITE_FILE));
        bannedAdminsMemory = JSON.parse(fs.readFileSync(BANNED_ADMINS_FILE));
        blackListMemory = JSON.parse(fs.readFileSync(BLACK_LIST_FILE));
    } catch (e) {
        bankMemory = {};
        eliteMemory = [];
        bannedAdminsMemory = [];
        blackListMemory = {};
    }
}

function saveBankData() {
    fs.writeFile(BANK_FILE, JSON.stringify(bankMemory, null, 2), () => {});
}

function saveEliteData() {
    fs.writeFile(ELITE_FILE, JSON.stringify(eliteMemory, null, 2), () => {});
}

function saveBannedAdminsData() {
    fs.writeFile(BANNED_ADMINS_FILE, JSON.stringify(bannedAdminsMemory, null, 2), () => {});
}

function saveBlackListData() {
    fs.writeFile(BLACK_LIST_FILE, JSON.stringify(blackListMemory, null, 2), () => {});
}

loadData();

const animeCharacters = [
    "لوفي", "ناروتو", "ساسكي", "ساكورا", "كاكاشي", "غوكو", "فيجيتا", "زورو", "سانجي", "نامي",
    "إيتاتشي", "ميدوريا", "باكوغو", "تودوروكي", "لايت ياغامي", "إيل", "تانجيرو", "نيزوكو", "زينيتسو", "إينوسكي",
    "غوجو", "سوكونا", "إرين", "ميكاسا", "ليفاى", "أرمين", "كنيكي", "سيتو كايبا", "يوغي", "كيلوا",
    "غون", "كروبيكا", "هيسوكا", "أستا", "يونو", "باين", "مادارا", "أوبيتو", "شيكامارو", "غارا",
    "بولما", "هانكوك", "شانكس", "البيج مام", "كايدو", "تيتش", "أيس", "سابو", "لابو", "بروك",
    "فرانكي", "تشوبر", "يوسوب", "روبين", "جيمبي", "آرمن", "ترافالغار لوف", "يوستاك كيد", "دوفلامينغو", "ميهوك",
    "آيزن", "إيتشيجو", "روكيا", "بياكويا", "توشيرو", "كينباتشي", "أوريهيمي", "أوراهارا", "غريمجو", "القيوروكو",
    "نوبارا", "ميغومي", "نانامي", "ماكي", "تودو", "دابا", "شيغاراكي", "توغا", "دابي", "هوكاغي",
    "ميناتو", "جيرايا", "تسونادي", "اوروتشارو", "ساروتوبي", "كيبا", "هيناتا", "شينو", "تينتن", "روك لي",
    "نيجي", "المحقق كونان", "هاتوري", "كايتو كيد", "هايبارا", "ران", "شينتشي", "سايو", "ياغامي", "سوبارو",
    "ريم", "رام", "إيميليا", "اكوآ", "ميغومين", "داركنيس", "كازوما", "سورا", "شيرو", "تاتسوماكي"
];

const worldFlags = [
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇸🇦 ]", answer: "السعودية" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇾🇪 ]", answer: "اليمن" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇮🇶 ]", answer: "العراق" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇦🇪 ]", answer: "الإمارات" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇰🇼 ]", answer: "الكويت" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇶🇦 ]", answer: "قطر" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇧🇭 ]", answer: "البحرين" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇴🇲 ]", answer: "عمان" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇯🇴 ]", answer: "الأردن" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇪🇬 ]", answer: "مصر" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇲🇦 ]", answer: "المغرب" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇩🇿 ]", answer: "الجزائر" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇹🇳 ]", answer: "تونس" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇱🇾 ]", answer: "ليبيا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇸🇩 ]", answer: "السودان" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇸🇾 ]", answer: "سوريا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇱🇧 ]", answer: "لبنان" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇵🇸 ]", answer: "فلسطين" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇺🇸 ]", answer: "أمريكا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇬🇧 ]", answer: "بريطانيا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇫🇷 ]", answer: "فرنسا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇩🇪 ]", answer: "ألمانيا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇮🇹 ]", answer: "إيطاليا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇪🇸 ]", answer: "إسبانيا" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇵🇹 ]", answer: "البرتغال" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇧🇷 ]", answer: "البرازيل" },
    { q: "مـا اسـم الـدولـة صـاحـبـة الـعـلـم: [ 🇦🇷 ]", answer: "الأرجنتين" }
];

const fruitList = [
    { q: "مـا هـي الـفـاكـهـة: [ 🍎 ]", answer: "تفاح" },
    { q: "مـا هـي الـفـاكـهـة: [ 🍌 ]", answer: "موز" },
    { q: "مـا هـي الـفـاكـهـة: [ 🍉 ]", answer: "بطيخ" },
    { q: "مـا هـي الـفـاكـهـة: [ 🍇 ]", answer: "عنب" },
    { q: "مـا هـي الـفـاكـهـة: [ 🍊 ]", answer: "برتقال" },
    { q: "مـا هـي الـفـاكـهـة: [ 🍓 ]", answer: "فراولة" },
    { q: "مـا هـي الـفـاكـهـة: [ 🍍 ]", answer: "أناناس" },
    { q: "مـا هـي الـفـاكـهـة: [ 🥭 ]", answer: "مانجو" }
];

// قائمة ضخمة وشاملة لجميع الأطعمة والمأكولات والمشروبات
const foodList = [
    { q: "مـا هـذا الـطـعـام: [ 🍔 ]", answer: "برجر" },
    { q: "مـا هـذا الـطـعـام: [ 🍕 ]", answer: "بيتزا" },
    { q: "مـا هـذا الـطـعـام: [ 🍟 ]", answer: "بطاطس" },
    { q: "مـا هـذا الـطـعـام: [ 🌭 ]", answer: "هوت دوج" },
    { q: "مـا هـذا الـطـعـام: [ 🍿 ]", answer: "فشار" },
    { q: "مـا هـذا الـطـعـام: [ 🥓 ]", answer: "لحم مقدد" },
    { q: "مـا هـذا الـطـعـام: [ 🥞 ]", answer: "بان كيك" },
    { q: "مـا هـذا الـطـعـام: [ 🧇 ]", answer: "وافل" },
    { q: "مـا هـذا الـطـعـام: [ 🧀 ]", answer: "جبن" },
    { q: "مـا هـذا الـطـعـام: [ 🍖 ]", answer: "لحم" },
    { q: "مـا هـذا الـطـعـام: [ 🍗 ]", answer: "دجاج" },
    { q: "مـا هـذا الـطـعـام: [ 🥩 ]", answer: "ستيك" },
    { q: "مـا هـذا الـطـعـام: [ 🥪 ]", answer: "ساندوتش" },
    { q: "مـا هـذا الـطـعـام: [ 🌮 ]", answer: "تاكو" },
    { q: "مـا هـذا الـطـعـام: [ 🌯 ]", answer: "بوريتو" },
    { q: "مـا هـذا الـطـعـام: [ 🥙 ]", answer: "شاورما" },
    { q: "مـا هـذا الـطـعـام: [ 🥗 ]", answer: "سلطة" },
    { q: "مـا هـذا الـطـعـام: [ 🍝 ]", answer: "مباكرونا" },
    { q: "مـا هـذا الـطـعـام: [ 🍜 ]", answer: "نودلز" },
    { q: "مـا هـذا الـطـعـام: [ 🍲 ]", answer: "شوربة" },
    { q: "مـا هـذا الـطـعـام: [ 🍛 ]", answer: "كاري" },
    { q: "مـا هـذا الـطـعـام: [ 🍣 ]", answer: "سوشي" },
    { q: "مـا هـذا الـطـعـام: [ 🍱 ]", answer: "بينتو" },
    { q: "مـا هـذا الـطـعـام: [ 🥟 ]", answer: "زلابية" },
    { q: "مـا هـذا الـطـعـام: [ 🍤 ]", answer: "جمبري" },
    { q: "مـا هـذا الـطـعـام: [ 🍙 ]", answer: "كرة أرز" },
    { q: "مـا هـذا الـطـعـام: [ 🍚 ]", answer: "أرز" },
    { q: "مـا هـذا الـطـعـام: [ 🍘 ]", answer: "مقرمشات أرز" },
    { q: "مـا هـذا الـطـعـام: [ 🍢 ]", answer: "اسهو" },
    { q: "مـا هـذا الـطـعـام: [ 🍡 ]", answer: "دانغو" },
    { q: "مـا هـذا الـطـعـام: [ 🍧 ]", answer: "ثلج مجروش" },
    { q: "مـا هـذا الـطـعـام: [ 🍨 ]", answer: "آيس كريم" },
    { q: "مـا هـذا الـطـعـام: [ 🍦 ]", answer: "بوظة" },
    { q: "مـا هـذا الـطـعـام: [ 🥧 ]", answer: "فطيرة" },
    { q: "مـا هـذا الـطـعـام: [ 🧁 ]", answer: "كبي كيك" },
    { q: "مـا هـذا الـطـعـام: [ 🍰 ]", answer: "كيك" },
    { q: "مـا هـذا الـطـعـام: [ 🎂 ]", answer: "تورته" },
    { q: "مـا هـذا الـطـعـام: [ 🍮 ]", answer: "كريم كاراميل" },
    { q: "مـا هـذا الـطـعـام: [ 🍭 ]", answer: "مصاصة" },
    { q: "مـا هـذا الـطـعـام: [ 🍬 ]", answer: "حلوى" },
    { q: "مـا هـذا الـطـعـام: [ 🍫 ]", answer: "شوكلاته" },
    { q: "مـا هـذا الـطـعـام: [ 🍩 ]",انسر: "دونتس" },
    { q: "مـا هـذا الـطـعـام: [ 🍪 ]", answer: "كوكيز" },
    { q: "مـا هـذا الـطـعـام: [ 🍯 ]", answer: "عسل" },
    { q: "مـا هـذا الـطـعـام: [ 🥛 ]", answer: "حليب" },
    { q: "مـا هـذا الـطـعـام: [ ☕ ]", answer: "قهوة" },
    { q: "مـا هـذا الـطـعـام: [ 🍵 ]", answer: "شاي" },
    { q: "مـا هـذا الـطـعـام: [ 🧋 ]", answer: "شاي فقاعات" },
    { q: "مـا هـذا الـطـعـام: [ 🧃 ]", answer: "عصير" },
    { q: "مـا هـذا الـطـعـام: [ 🍺 ]", answer: "مشروب" }
];

const footballList = [
    { flag: "🇧🇷", country: "البرازيل", players: ["نيمار", "بيليه", "رونالدينهو", "كاكا", "فينيسيوس", "رودريجو", "كاسيميرو", "مارسيلو", "جيسوس", "اليسون", "فابينيو", "روماريو", "ريفالدو", "روبرتو كارلوس", "أدريانو", "هالك", "ألفيس", "تياغو سيلفا", "أوسكار"] },
    { flag: "🇦🇷", country: "الأرجنتين", players: ["ميسي", "مارادونا", "دي ماريا", "الفاريز", "ديبالا", "لوتارو", "مارتينيز", "اغويرو", "تيفيز", "هيغواين", "ماك أليستر", "سابيلا", "ريكيلمي", "كريسبو", "سيميوني", "غارناتشو"] },
    { flag: "🇵🇹", country: "البرتغال", players: ["رونالدو", "كريستيانو", "برونو", "بيرناردو", "بيبي", "فليكس", "جوتا", "روبن دياز", "كانسيلو", "فيجو", "ناني", "كواريسما"] },
    { flag: "🇫🇷", country: "فرنسا", players: ["مبابي", "بنزيما", "جريزمان", "زيدان", "هنري", "ديمبيلي", "كانتي", "تشواميني", "كامافينجا", "لوريس", "بوغبا", "جيرو", "تريزيغيه", "بافار", "تورام", "كوندي"] },
    { flag: "🇸🇦", country: "السعودية", players: ["سالم", "الدوسري", "الغنام", "البريكان", "العويس", "سامي", "الجابر", "القحطاني", "محمد نور", "ماجد عبد الله", "سلمان الفرج", "الشهراني", "سعود عبد الحميد"] },
    { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", country: "إنجلترا", players: ["بيلينغهام", "هاري كين", "ساكا", "فودين", "روني", "بيكهام", "سترلينغ", "راشفورد", "غريليش", "أرنولد", "ماونت", "جيرارد", "شيرر", "أوين", "لامبارد", "تيري", "ريو"] },
    { flag: "🇪🇸", country: "إسبانيا", players: ["لامين", "يامال", "نيكو", "رودري", "بيدري", "جافي", "إنيستا", "تشافي", "راموس", "بويول", "كاسياس", "فيا", "توريس", "موراتا", "كارفاخال", "راؤول", "بوسكيتس", "ألبا", "بيكيه"] },
    { flag: "🇩🇪", country: "ألمانيا", players: ["توني كروس", "كروس", "مولر", "نوير", "موسيالا", "فيرتز", "كلوزه", "لام", "باستيان", "خضيرة", "غنابري", "ساني", "بالاك", "أوزيل", "بواتينغ", "هوملز", "جوتزه", "روديغر"] },
    { flag: "🇮🇹", country: "إيطاليا", players: ["بوفون", "مالديني", "ديل بييرو", "توتي", "بالوتيلي", "كييزا", "دوناروما", "بيرلو", "كانافارو", "باجيو", "إنزاغي", "جورجينيو", "باريسي", "نيستا", "باريلا", "بونوتشي", "كيليني"] },
    { flag: "🇧🇪", country: "بلجيكا", players: ["دي بروين", "لوكاكو", "هازارد", "كورتوا", "دوكو", "كاراسكو", "كومباني", "ميرتنز", "تيليمانس", "فرتونغن"] },
    { flag: "🇳🇱", country: "هولندا", players: ["فان دايك", "ديباي", "دي يونغ", "روبن", "فان بيرسي", "سنايدر", "كرويف", "ديلخت", "جاكبو", "سيمونز"] },
    { flag: "🇲🇦", country: "المغرب", players: ["حكيمي", "زياش", "بونو", "النصيري", "امرابط", "اوناحي", "ابراهيم دياز", "رومان سايس", "نايف أكرد", "حارث", "الزلزولي"] },
    { flag: "🇪🇬", country: "مصر", players: ["صلاح", "محمد صلاح", "تريزيغيه", "مرموش", "النني", "مصطفى محمد", "أبو تريكة", "حازم إمام", "متعب", "الحضري", "إمام عاشور"] },
    { flag: "🇩🇿", country: "الجزائر", players: ["محرز", "رياض محرز", "بن ناصر", "بلايلي", "بونجاح", "سليماني", "رابح ماجر", "بلومي", "عطال", "بن سبعيني", "عمورة"] },
    { flag: "🇹🇳", country: "تونس", players: ["الخزري", "معلول", "المساكني", "لايدوني", "حنبعل", "السخيري"] },
    { flag: "🇮🇶", country: "العراق", players: ["يونس محمود", "نشأت أكرم", "همام طارق", "مهند علي", "أيمن حسين", "بشار رسن", "جلال حسن", "علي عدنان"] },
    { flag: "🇯🇵", country: "اليابان", players: ["ميتوما", "كامادا", "إندو", "كوبو", "كاجاوا", "ناكاتا", "مينامينو"] },
    { flag: "🇰🇷", country: "كوريا الجنوبية", players: ["سون", "هيونغ مين", "هوانغ", "بارك جي سونغ", "كيم مين جاي", "لي كانغ إن"] },
    { flag: "🇺🇾", country: "الأوروغواي", players: ["سواريز", "كافاني", "فالفيردي", "داروين", "نونيز", "غودين", "فورلان", "موسليرا", "أراوخو"] },
    { flag: "🇭🇷", country: "كرواتيا", players: ["مودريتش", "پيريشيتش", "كوفاسيتش", "بروزوفيتش", "غفارديول", "ماندزوكيتش", "سوكر", "راكيتيتش"] },
    { flag: "🇸🇳", country: "السنغال", players: ["ماني", "ساديو ماني", "كوليبالي", "ميندي", "إسماعيل سار", "الحاج ضيوف"] },
    { flag: "🇨🇲", country: "الكاميرون", players: ["إيتو", "صامويل إيتو", "روجيه ميلا", "أبو بكر", "أغيسا"] },
    { flag: "🇬🇭", country: "غانا", players: ["أييو", "أسامواه جيان", "توماس بارتي", "محمد قدوس", "إيسيان"] },
    { flag: "🇨🇮", country: "ساحل العاج", players: ["دروغبا", "يايا توريه", "كولو توريه", "جيرفينيو", "هالير", "كيسيه"] },
    { flag: "🇲🇽", country: "المكسيك", players: ["لوزانو", "تشيتشاريتو", "رافائيل ماركيز", "أوتشوا", "راؤول خيميز", "كارлос فيلا"] },
    { flag: "🇺🇸", country: "أمريكا", players: ["بوليسيتش", "مکيني", "تيم وياه", "جيو رينا", "تيم هاورد", "دونوفان"] },
    { flag: "🇨🇴", country: "كولومبيا", players: ["خاميس", "فالديراما", "فالكاو", "لويس دياز", "كوادرادو", "أوسبينا"] },
    { flag: "🇨🇱", country: "تشيلي", players: ["أليكسيس", "سانشيز", "فيدال", "برافو", "فارغاس", "ميديل"] },
    { flag: "🇩🇰", country: "الدنمارك", players: ["إريكسن", "شمايكل", "هويبيرغ", "هويلوند", "لاودروب"] },
    { flag: "🇸🇪", country: "السويد", players: ["زلاتان", "إبراهيموفيتش", "لارسون", "كولوسيفسكي"] },
    { flag: "🇵🇱", country: "بولندا", players: ["ليفاندوفسكي", "تشيزني", "زيلينسكي", "بونيك"] },
    { flag: "🇹🇷", country: "تركيا", players: ["تشالهان أوغلو", "أردا غولر", "أردا توران", "بوراك يلماز"] },
    { flag: "🇺🇦", country: "أوكرانيا", players: ["شيفتشينكو", "زينتشينكو", "مودريك", "يارمولينكو"] },
    { flag: "🇷🇸", country: "صربيا", players: ["ميتروفيتش", "فلاهوفيتش", "سافيتش", "ستانكوفيتش", "في디تش"] },
    { flag: "🇨🇿", country: "التشيك", players: ["نيدفيد", "بيتر تشيك", "روسيتسكي", "شيك", "باروش"] },
    { flag: "🇨🇭", country: "سويسرا", players: ["تشاكا", "شاكيري", "سومر", "أكانجي", "إمبولو"] },
    { flag: "🇦🇹", country: "النمسا", players: ["ألابا", "أرناوتوفيتش", "سابيتسر", "لايمر"] },
    { flag: "🇬🇷", country: "اليونان", players: ["زاغوراكيس", "كاراجونيس", "تشاريستياس", "مانولاس"] },
    { flag: "🇷🇴", country: "رومانيا", players: ["هاجي", "موتو", "كيفو", "دراغوشين"] },
    { flag: "🇳🇬", country: "نيجيريا", players: ["أوسيمين", "أوكوشا", "كانو", "ميكيل", "موسيس"] },
    { flag: "🇦🇺", country: "أستراليا", players: ["تيم كاهيل", "رايان", "موي", "هاري كيول"] },
    { flag: "🇮🇷", country: "إيران", players: ["علي دائي", "آزمون", "طارمي", "علي كريمي", "نكونام"] },
    { flag: "🇯🇴", country: "الأردن", players: ["التعمري", "أبو ليلى", "النعيمات", "حسونة الشيخ"] },
    { flag: "🇸🇾", country: "سوريا", players: ["عمر السومة", "خريبكة", "فهد اليوسف", "محمود المواس"] },
    { flag: "🇱🇧", country: "لبنان", players: ["حسن معتوق", "رضا عنتر", "مهدي خليل"] },
    { flag: "🇦🇪", country: "الإمارات", players: ["عموري", "إسماعيل مطر", "علي مبخوت", "أحمد خليل", "خالد عيسى"] },
    { flag: "🇴🇲", country: "عمان", players: ["علي الحبسي", "الحوسني", "فوزي بشير", "أحمد كانو"] },
    { flag: "🇰🇼", country: "الكويت", players: ["بشار عبد الله", "جاسم الهويدي", "بدر المطوع", "فرج لهيب"] },
    { flag: "🇧🇭", country: "البحرين", players: ["طلال يوسف", "سالمين", "مهدي حميدان"] }
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('أدخل رقم هاتفك مع رمز الدولة (بدون + أو مسافات): ');
        let code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`\n🔑 كود الربط الخاص بك هو: ${code}\n`);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ تم اتصال بوت مملكة أريفانيا بنجاح وجاهز للعمل!');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    async function endActiveGame(sender, sock, reason = "completed") {
        if (!activeGames[sender]) return;
        let game = activeGames[sender];
        if (game.timer) clearTimeout(game.timer);

        let scores = game.scores;
        let sortedPlayers = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

        if (sortedPlayers.length > 0 && reason === "completed") {
            let top1 = sortedPlayers[0];
            let top2 = sortedPlayers[1];
            let top3 = sortedPlayers[2];

            let resultText = `╭━━━〔 👑 𝓝𝓮𝔀 𝓡𝓸𝔂𝓪𝓵 𝓟𝓸𝓭𝓲𝓾𝓶 👑 〕━━━╮\n`;
            resultText += `⚔️ *نـتـائـج مـسـابـقـة (${game.type.toUpperCase()}) الـمـلـكـيـة* ⚔️\n`;
            resultText += `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            if (top1) {
                let p1Num = top1.split('@')[0];
                let pts1 = scores[top1];
                let reward1 = 10;
                if (!bankMemory[top1]) bankMemory[top1] = 0;
                bankMemory[top1] += reward1;
                resultText += `🥇 ┃ *الـمـركـز الأول (الـبـطـل)*\n👤 ⟵ @${p1Num}\n🎯 ⟵ الإجابات الصحيحة: *[ ${pts1} ]*\n🪙 ⟵ الجائزة الملكية: *[ +${reward1} نـقـطـة ]*\n\n`;
            }
            if (top2) {
                let p2Num = top2.split('@')[0];
                let pts2 = scores[top2];
                let reward2 = 5;
                if (!bankMemory[top2]) bankMemory[top2] = 0;
                bankMemory[top2] += reward2;
                resultText += `🥈 ┃ *الـمـركـز الـثـانـي (الـفـارس)*\n👤 ⟵ @${p2Num}\n🎯 ⟵ الإجابات الصحيحة: *[ ${pts2} ]*\n🪙 ⟵ الجائزة الملكية: *[ +${reward2} نـقـطـة ]*\n\n`;
            }
            if (top3) {
                let p3Num = top3.split('@')[0];
                let pts3 = scores[top3];
                let reward3 = 3;
                if (!bankMemory[top3]) bankMemory[top3] = 0;
                bankMemory[top3] += reward3;
                resultText += `🥉 ┃ *الـمـركـز الـثـالـث (الـمـجـاهـد)*\n👤 ⟵ @${p3Num}\n🎯 ⟵ الإجابات الصحيحة: *[ ${pts3} ]*\n🪙 ⟵ الجائزة الملكية: *[ +${reward3} نـقـطـة ]*\n\n`;
            }

            saveBankData();
            resultText += `✨ *ألف مبروك للأبطال المتصدرين في مملكة أريفانيا!* 🔥`;
            await sock.sendMessage(sender, { text: resultText, mentions: sortedPlayers.slice(0, 3) });
        } else {
            await sock.sendMessage(sender, { text: `🛑 *تـم إيـقـاف الـمـسـابـقـة الـحـالـيـة بـنـجـاح!* 🔒` });
        }
        delete activeGames[sender];
    }

    function setQuestionTimer(sender, sock) {
        if (activeGames[sender]) {
            if (activeGames[sender].timer) clearTimeout(activeGames[sender].timer);
            activeGames[sender].timer = setTimeout(async () => {
                if (!activeGames[sender]) return;
                let game = activeGames[sender];
                let correctAnswerDisplay = game.type === 'كورة' ? game.answer.players[0] : (game.type === 'طعام' ? game.answer : game.answer);
                game.roundsLeft--;

                if (game.roundsLeft <= 0) {
                    await endActiveGame(sender, sock, "completed");
                } else {
                    let nextQ = generateQuestion(game.type);
                    game.answer = nextQ.answer;
                    await sock.sendMessage(sender, { 
                        text: `⏳ *انـتـهـى الـوقـت (20 ثـانـيـة)!* لم يجاوب أحد.\n❌ الإجابة الصحيحة كانت: *[ ${correctAnswerDisplay} ]*\n\n🔄 *الـسـؤال الـتـالـي (${game.roundsLeft} جـولات مـبـقـيـة)*:\n${nextQ.question}` 
                    });
                    setQuestionTimer(sender, sock);
                }
            }, 20000);
        }
    }

    function generateQuestion(type) {
        if (type === 'كتابة') {
            let rc = animeCharacters[Math.floor(Math.random() * animeCharacters.length)];
            return { question: `✍️ *اكـتـب اسـم شـخـصـيـة الـأنـمـي الـتـالـيـة بـدقـة:*\n❖ 〖 ${rc} 〗`, answer: rc };
        } else if (type === 'تفكيك') {
            let rc = animeCharacters[Math.floor(Math.random() * animeCharacters.length)];
            return { question: `🧩 *فـكـك اسـم شـخـصـيـة الـأنـمـي بـالـأحـرف والـمـسـافـات:*\n❖ 〖 ${rc} 〗`, answer: rc };
        } else if (type === 'تخمين') {
            let num = Math.floor(Math.random() * 5) + 1;
            return { question: `🔢 *تـخـمـيـن رقـم بـيـن 1 و 5:* اكتب الرقم الصحيح`, answer: num.toString() };
        } else if (type === 'تعداد') {
            return { question: `⚡ *سـرعـة كـتـابـة الـأعـداد:* (1 2 3 4 5)`, answer: "1 2 3 4 5" };
        } else if (type === 'فواكة') {
            let f = fruitList[Math.floor(Math.random() * fruitList.length)];
            return { question: f.q, answer: f.answer };
        } else if (type === 'اعلام') {
            let fl = worldFlags[Math.floor(Math.random() * worldFlags.length)];
            return { question: fl.q, answer: fl.answer };
        } else if (type === 'كورة') {
            let item = footballList[Math.floor(Math.random() * footballList.length)];
            return { 
                question: `⚽ *اعـطنـي اسـم لاعب كـرة قـدم مـن الـدولـة الـتـالـيـة:*\n❖ 〖 ${item.flag} (${item.country}) 〗`, 
                answer: item 
            };
        } else if (type === 'طعام') {
            let fItem = foodList[Math.floor(Math.random() * foodList.length)];
            return { question: fItem.q, answer: fItem.answer };
        }
        return { question: "سؤال سريع", answer: "صح" };
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const messageTime = m.messageTimestamp ? Number(m.messageTimestamp) : 0;
        const currentTime = Math.floor(Date.now() / 1000);
        if (messageTime && (currentTime - messageTime > 20)) return;

        const sender = m.key.remoteJid;
        const userJid = m.key.fromMe ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (m.key.participant || sender);
        const isGroup = sender.endsWith('@g.us');

        const messageBody = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '';
        let rawText = messageBody.trim();

        function normalizeCmd(str) {
            return str.toLowerCase().replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
        }

        function normalizeAnswer(str) {
            return str.toLowerCase().replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^ال/, '').replace(/\s+/g, '');
        }

        // فحص إجابات المسابقات النشطة
        if (!rawText.startsWith('.') && activeGames[sender]) {
            let game = activeGames[sender];
            let isCorrect = false;

            if (game.type === 'تفكيك') {
                let userClean = rawText.replace(/[أإآ]/g, 'أ').trim();
                let targetClean = game.answer.split('').join(' ');
                if (normalizeCmd(userClean).replace(/\s+/g, ' ') === normalizeCmd(targetClean).replace(/\s+/g, ' ')) isCorrect = true;
            } else if (game.type === 'كورة') {
                let userAnsNorm = normalizeAnswer(rawText);
                let validPlayers = game.answer.players;
                for (let p of validPlayers) {
                    let pNorm = normalizeAnswer(p);
                    if (pNorm.includes(userAnsNorm) || userAnsNorm.includes(pNorm)) {
                        if (userAnsNorm.length >= 2) {
                            isCorrect = true;
                            break;
                        }
                    }
                }
            } else {
                if (normalizeAnswer(rawText) === normalizeAnswer(game.answer)) isCorrect = true;
            }

            if (isCorrect) {
                if (game.timer) clearTimeout(game.timer);
                if (!game.scores[userJid]) game.scores[userJid] = 0;
                game.scores[userJid]++;
                game.roundsLeft--;

                if (game.roundsLeft <= 0) {
                    await endActiveGame(sender, sock, "completed");
                } else {
                    let nextQ = generateQuestion(game.type);
                    game.answer = nextQ.answer;
                    await sock.sendMessage(sender, { 
                        text: `🎉 *كـفـو يـا @${userJid.split('@')[0]}! إجابة صحيحة وموفقة.*\n📊 رصيدك الحالي في هذه المسابقة: *[ ${game.scores[userJid]} إجابات ]*\n\n🔄 *الـسـؤال الـتـالـي (${game.roundsLeft} جـولات مـبـقـيـة)*:\n${nextQ.question}`,
                        mentions: [userJid]
                    }, { quoted: m });
                    setQuestionTimer(sender, sock);
                }
            }
            return;
        }

        if (!rawText.startsWith('.')) return;

        let cleanText = rawText.replace(/^[.]\s+/, '.');
        let textWithoutDot = cleanText.slice(1).trim();
        let parts = textWithoutDot.split(/\s+/);
        let baseCommand = parts[0];
        let secondArg = parts[1] || '';
        let thirdArg = parts[2] || '';

        let normalizedBaseCmd = normalizeCmd(baseCommand);

        const allowedCommands = ['تست', 'نخبة', 'نخبه', 'حذف', 'طرد', 'ادمن', 'admin', 'انهاء', 'إهاء', 'الرتب', 'رتب', 'طرق', 'طرق النقاط', 'اوامر', 'أوامر', 'help', 'رصيدي', 'بنك', 'فعاليات', 'مسابقات', 'كتابة', 'تفكيك', 'اعلام', 'فواكة', 'فواكه', 'تخمين', 'تعداد', 'كورة', 'طعام', 'اكل'];
        let matchedCmd = allowedCommands.find(cmd => normalizeCmd(cmd) === normalizedBaseCmd);
        if (!matchedCmd && normalizedBaseCmd !== 'حذف') return;

        let isGroupAdmin = false;
        if (isGroup) {
            try {
                let metadata = await sock.groupMetadata(sender);
                let participant = metadata.participants.find(p => p.id === userJid);
                if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                    isGroupAdmin = true;
                }
            } catch (e) {}
        }

        let isDev = m.key.fromMe;
        let hasFullAccess = isDev || isGroupAdmin || eliteMemory.includes(userJid) || globalEliteMode;

        let isBankCmd = (normalizedBaseCmd === normalizeCmd('رصيدي') || normalizedBaseCmd === normalizeCmd('بنك'));
        if (!hasFullAccess && !isBankCmd) {
            return; 
        }

        if (normalizedBaseCmd === normalizeCmd('تست')) {
            if (!isDev) return;
            let startTime = Date.now();
            let latency = Date.now() - startTime;
            await sock.sendMessage(sender, { text: `╭━━━〔 🚀 𝓟𝓲𝓷𝓰 𝓣𝓮𝓼𝓽 🚀 〕━━━╮\n⚡ سرعة استجابة البوت: *[ ${latency} ms ]*\n🔥 البوت يعمل بأقصى طاقة وأعلى أداء!\n╰━━━━━━━━━━━━━━━━━━━━━━╯` }, { quoted: m });
            return;
        }

        function getTargetJid() {
            if (m.message.extendedTextMessage?.contextInfo?.participant) {
                return m.message.extendedTextMessage.contextInfo.participant;
            }
            if (m.message.extendedTextMessage?.contextInfo?.mentionedJid && m.message.extendedTextMessage.contextInfo.mentionedJid.length > 0) {
                return m.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            return null;
        }

        if (normalizedBaseCmd === normalizeCmd('طرد')) {
            if (!isDev && !isGroupAdmin) {
                await sock.sendMessage(sender, { text: '❌ *عذراً، أمر الطرد مخصص لمشرفي المجموعة أو المطور فقط!*' }, { quoted: m });
                return;
            }
            if (!isGroup) return;
            let target = getTargetJid();
            if (!target) {
                await sock.sendMessage(sender, { text: '⚠️ يرجى الرد على رسالة الشخص المراد طرده أو عمل منشن له.' }, { quoted: m });
                return;
            }
            try {
                await sock.groupParticipantsUpdate(sender, [target], "remove");
                await sock.sendMessage(sender, { text: `✅ *تم طرد العضو بنجاح من المجموعة!* ✈️`, mentions: [target] }, { quoted: m });
            } catch (e) {
                await sock.sendMessage(sender, { text: '❌ *فشل طرد العضو! تأكد من أن البوت مشرف ولديه صلاحيات.*' }, { quoted: m });
            }
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('نخبة') && normalizeCmd(secondArg) === normalizeCmd('الكل')) {
            if (!isDev && !isGroupAdmin) {
                await sock.sendMessage(sender, { text: '❌ *عذراً، هذا الأمر مخصص لمشرفي المجموعة أو المطور فقط!*' }, { quoted: m });
                return;
            }
            globalEliteMode = true;
            await sock.sendMessage(sender, { text: `👑 *تم تفعيل (نخبة الكل)! أصبح بإمكان جميع أعضاء المجموعة استخدام أوامر البوت.*` }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('حذف') && normalizeCmd(secondArg) === normalizeCmd('نخبة') && normalizeCmd(thirdArg) === normalizeCmd('الكل')) {
            if (!isDev && !isGroupAdmin) {
                await sock.sendMessage(sender, { text: '❌ *عذراً، هذا الأمر مخصص لمشرفي المجموعة أو المطور فقط!*' }, { quoted: m });
                return;
            }
            globalEliteMode = false;
            await sock.sendMessage(sender, { text: `🛑 *تم إلغاء (نخبة الكل)! عاد البوت لوضعه الطبيعي.*` }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('نخبة') || normalizedBaseCmd === normalizeCmd('نخبه')) {
            if (!isDev && !isGroupAdmin) {
                await sock.sendMessage(sender, { text: '❌ *عذراً، هذا الأمر مخصص لمشرفي المجموعة أو المطور فقط!*' }, { quoted: m });
                return;
            }
            let target = getTargetJid();
            if (!target) {
                await sock.sendMessage(sender, { text: '⚠️ يرجى الرد على رسالة الشخص أو عمل منشن له لتفعيله في النخبة.' }, { quoted: m });
                return;
            }
            if (!eliteMemory.includes(target)) {
                eliteMemory.push(target);
                saveEliteData();
            }
            await sock.sendMessage(sender, { text: `✅ *تم إضافة العضو بنجاح إلى قائمة النخبة!*`, mentions: [target] }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('حذف') && normalizeCmd(secondArg) === normalizeCmd('نخبة')) {
            if (!isDev && !isGroupAdmin) {
                await sock.sendMessage(sender, { text: '❌ *عذراً، هذا الأمر مخصص لمشرفي المجموعة أو المطور فقط!*' }, { quoted: m });
                return;
            }
            let target = getTargetJid();
            if (!target) {
                await sock.sendMessage(sender, { text: '⚠️ يرجى الرد على رسالة الشخص أو عمل منشن له لإزالته من النخبة.' }, { quoted: m });
                return;
            }
            eliteMemory = eliteMemory.filter(id => id !== target);
            saveEliteData();
            await sock.sendMessage(sender, { text: `🛑 *تم إزالة العضو من النخبة ولم يعد مسموحاً له سوى بـ .رصيدي.*`, mentions: [target] }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('ادمن') || normalizedBaseCmd === normalizeCmd('admin')) {
            let adminCaption = `╭━━━〔 🛡️ 𝓐𝓻𝓿𝓪𝓷𝓲𝓪 𝓐𝓭𝓶𝓲𝓷𝓼 🛡️ 〕━━━╮\n⚡ *قـائمـة أوامـر الـمـشـرفـيـن الـمـلـكـيـة* ⚡\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n1️⃣ \`.انهاء\`\n✈️ \`.طرد\` (منشن/رد)\n👑 \`.نخبة\` (منشن/رد)\n🌐 \`.نخبة الكل\`\n🛑 \`.حذف نخبة الكل\`\n🛑 \`.حذف نخبة\` (منشن/رد)\n\n#👑_EMPIRE_ARVANIA_ADMINS`;
            await sock.sendMessage(sender, { text: adminCaption }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('انهاء') || normalizedBaseCmd === normalizeCmd('إهاء')) {
            if (activeGames[sender]) {
                await endActiveGame(sender, sock, "manual");
            } else {
                await sock.sendMessage(sender, { text: '⚠️ *تنبيه:* لا توجد مسابقة نشطة حالياً.' }, { quoted: m });
            }
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('الرتب') || normalizedBaseCmd === normalizeCmd('رتب')) {
            const captionText = `╭━━━〔 👑 𝓐𝓻𝓿𝓪𝓷𝓲𝓪 𝓡𝓪𝓷𝓴𝚜 👑 〕━━━╮\n⚔️ *سلم الرتب العسكرية*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n▪️ مشرف تدريبي ⟵ 30 نقطة\n▪️ حامل راية ⟵ 80 نقطة\n▪️ حامل بيرق ⟵ 200 نقطة\n▪️ الملازم ⟵ 400 نقطة\n▪️ فارس ⟵ 700 نقطة\n▪️ تشيبوكاي ⟵ 1000 نقطة`;
            await sock.sendMessage(sender, { text: captionText }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('طرق النقاط') || normalizedBaseCmd === normalizeCmd('طرق')) {
            const captionText = `╭━━━〔 💠 𝓟𝓸𝓲𝓷𝓽𝓼 𝓖𝓾𝓲𝓭𝓮 💠 〕━━━╮\n💎 *كيف تجمع نقاطك*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n🥇 الأول ⟵ 10 نقاط\n🥈 الثاني ⟵ 5 نقاط\n🥉 الثالث ⟵ 3 نقاط`;
            await sock.sendMessage(sender, { text: captionText }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('أوامر') || normalizedBaseCmd === normalizeCmd('اوامر') || normalizedBaseCmd === normalizeCmd('help')) {
            let captionText = `╭━━━〔 ⚙️ 𝓡𝓸𝔂𝓪𝓵 𝓜𝓮𝓷𝓾 ⚙️ 〕━━━╮\n🔥 *أوامر بوت مملكة أريفانيا*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n1️⃣ \`.رصيدي\`\n2️⃣ \`.الرتب\`\n3️⃣ \`.طرق النقاط\`\n4️⃣ \`.فعاليات\`\n5️⃣ \`.ادمن\``;
            await sock.sendMessage(sender, { text: captionText }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('رصيدي') || normalizedBaseCmd === normalizeCmd('بنك')) {
            let currentBalance = bankMemory[userJid] || 0;
            let captionText = `╭━━━〔 🏦 𝓡𝓸𝔂𝓪𝓵 𝓑𝓪𝓷𝓴 🏦 〕━━━╮\n💳 *حسابك المصرفي*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n👤 @${userJid.split('@')[0]}\n🪙 الرصيد: *[ ${currentBalance} نقطة ]*`;
            await sock.sendMessage(sender, { text: captionText, mentions: [userJid] }, { quoted: m });
            return;
        }

        if (normalizedBaseCmd === normalizeCmd('فعاليات') || normalizedBaseCmd === normalizeCmd('مسابقات')) {
            let eventsCaption = `╭━━━〔 🎮 𝓡𝓸𝔂𝓪𝓵 𝓔𝓿𝓮𝓷𝓽𝓼 🎮 〕━━━╮\n⚡ *قائمة الفعاليات والحماس*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n1️⃣ \`.كتابة {عدد الجولات}\`\n2️⃣ \`.تفكيك {عدد الجولات}\`\n3️⃣ \`.اعلام {عدد الجولات}\`\n4️⃣ \`.فواكة {عدد الجولات}\`\n5️⃣ \`.كورة {عدد الجولات}\` ⚽\n6️⃣ \`.طعام {عدد الجولات}\` 🍔 ✨ جديد!\n7️⃣ \`.تخمين {عدد الجولات}\`\n8️⃣ \`.تعداد {عدد الجولات}\`\n🛑 \`.انهاء\``;
            await sock.sendMessage(sender, { text: eventsCaption }, { quoted: m });
            return;
        }

        let gameTypes = ['كتابة', 'تفكيك', 'فواكة', 'فواكه', 'تخمين', 'تعداد', 'اعلام', 'كورة', 'طعام', 'اكل'];
        for (let gType of gameTypes) {
            let targetGameType = (gType === 'فواكه' || gType === 'اكل') ? (gType === 'فواكه' ? 'فواكة' : 'طعام') : gType;
            if (normalizedBaseCmd === normalizeCmd(gType)) {
                let args = textWithoutDot.split(' ');
                let rounds = parseInt(args[1]) || 10;
                if (![10, 20, 30].includes(rounds)) rounds = 10;

                let firstQ = generateQuestion(targetGameType);
                if (activeGames[sender] && activeGames[sender].timer) clearTimeout(activeGames[sender].timer);

                activeGames[sender] = { type: targetGameType, roundsLeft: rounds, answer: firstQ.answer, timer: null, scores: {} };

                await sock.sendMessage(sender, { text: `╭━━━〔 ⚔️ 𝓔𝓿𝓮𝓷𝓽 𝓢𝓽𝓪𝓻𝓽𝓮𝓭 ⚔️ 〕━━━╮\n🎮 *بدأت مسابقة (${targetGameType.toUpperCase()}) الملكية!*\n🔢 الجولات: *[ ${rounds} ]*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n${firstQ.question}` });
                setQuestionTimer(sender, sock);
                return;
            }
        }
    });
}

startBot();
