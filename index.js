const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LESSONS = parseInt(process.env.LESSONS || "5", 10);
const API = "https://www.duolingo.com/2017-06-30";

async function fetchJSON(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    if (!res.ok) {
      console.error(`HTTP ${res.status} from ${url}`);
      console.error("Body:", text.slice(0, 500));
      return null;
    }
    return JSON.parse(text);
  } catch (e) {
    clearTimeout(timeout);
    console.error(`Fetch error (${url}):`, e.message);
    return null;
  }
}

async function run() {
  const jwt = process.env.DUOLINGO_JWT;
  if (!jwt) throw new Error("DUOLINGO_JWT not set");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  };

  const { sub } = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64").toString()
  );
  console.log(`👤 User ID: ${sub}`);

  const user = await fetchJSON(
    `${API}/users/${sub}?fields=fromLanguage,learningLanguage`,
    { headers }
  );
  if (!user) throw new Error("Cannot fetch user info");

  const { fromLanguage, learningLanguage } = user;
  console.log(`📚 ${fromLanguage} → ${learningLanguage}\n`);

  let totalXP = 0;

  for (let i = 1; i <= LESSONS; i++) {
    if (i > 1) {
      const gap = rand(15000, 30000);
      console.log(`⏳ Пауза ${Math.round(gap / 1000)}с...`);
      await sleep(gap);
    }

    console.log(`📝 Урок ${i}/${LESSONS}: создаю сессию...`);
    const session = await fetchJSON(`${API}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fromLanguage,
        learningLanguage,
        isFinalLevel: false,
        isV2: true,
        juicy: true,
        challengeTypes: [
          "assist","characterIntro","characterMatch","characterSelect",
          "completeReverseTranslation","definitionFillInTheBlank",
          "dialogue","fillInTheBlank","freeResponse","gapFill",
          "judge","listen","listenComplete","listenMatch","match",
          "name","partialListen","partialReverseTranslate",
          "readComprehension","reverseAssist","reverseTranslate",
          "select","selectPronunciation","selectTranscription","speak",
          "tapCloze","tapComplete","tapDescribe","translate",
          "typeCloze","typeComplete",
        ],
        type: "GLOBAL_PRACTICE",
      }),
    });

    if (!session) {
      console.error(`❌ Урок ${i}: не удалось создать сессию, пропускаю`);
      continue;
    }
    console.log(`   Session ID: ${session.id}`);

    const durationMs = rand(60000, 120000);
    console.log(`   Жду ${Math.round(durationMs / 1000)}с (имитация урока)...`);
    await sleep(durationMs);

    const now = Date.now() / 1000;
    const result = await fetchJSON(`${API}/sessions/${session.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        ...session,
        heartsLeft: 0,
        startTime: now - durationMs / 1000,
        endTime: now,
        enableBonusPoints: true,
        failed: false,
        maxInLessonStreak: rand(5, 20),
        shouldLearnThings: true,
      }),
    });

    if (!result) {
      console.error(`❌ Урок ${i}: PUT не удался`);
      continue;
    }
    const xp = result.xpGain || 0;
    totalXP += xp;
    console.log(`✅ Урок ${i} готов! XP: ${xp}\n`);
  }

  console.log(`🏆 Итого: ${totalXP} XP за ${LESSONS} уроков`);
}

run().catch((e) => {
  console.error("💀 Fatal:", e);
  process.exit(1);
});
