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

// Generate a correct response for each challenge type
function solveChallenge(c) {
  switch (c.type) {
    case "translate":
      // tap-style: pick correct word indices
      return c.correctIndices || [0];
    case "gapFill":
      return c.correctIndex ?? 0;
    case "judge":
      return c.correctIndex ?? 0;
    case "select":
      return c.correctIndex ?? 0;
    case "match":
      // return pairs in order
      return c.pairs ? c.pairs.map((_, i) => i) : [];
    case "listen":
    case "listenComplete":
      return c.prompt || "";
    case "speak":
      return c.prompt || "";
    case "characterSelect":
    case "characterMatch":
      return c.correctIndex ?? 0;
    case "fillInTheBlank":
    case "typeCloze":
    case "typeComplete":
      return c.correctSolutions ? c.correctSolutions[0] : "";
    case "completeReverseTranslation":
      return c.correctSolutions ? c.correctSolutions[0] : "";
    case "tapCloze":
    case "tapComplete":
    case "tapDescribe":
      return c.correctIndices || [0];
    case "reverseTranslate":
    case "reverseAssist":
    case "assist":
      return c.correctSolutions ? c.correctSolutions[0] : "";
    case "readComprehension":
      return c.correctIndex ?? 0;
    case "dialogue":
      return c.correctIndex ?? 0;
    case "selectPronunciation":
    case "selectTranscription":
      return c.correctIndex ?? 0;
    case "name":
      return c.correctSolutions ? c.correctSolutions[0] : "";
    case "partialListen":
    case "partialReverseTranslate":
      return c.correctSolutions ? c.correctSolutions[0] : "";
    case "definitionFillInTheBlank":
      return c.correctIndex ?? 0;
    case "freeResponse":
      return c.correctSolutions ? c.correctSolutions[0] : "yes";
    case "characterIntro":
      return c.correctIndex ?? 0;
    default:
      return c.correctIndex ?? c.correctIndices ?? 0;
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

    if (!session || !session.challenges) {
      console.error(`❌ Урок ${i}: нет сессии или challenges`);
      continue;
    }

    const challenges = session.challenges;
    console.log(`   ${challenges.length} заданий, решаю...`);

    // "Answer" each challenge with realistic timing
    const startTs = Date.now();
    const answeredChallenges = [];

    for (let j = 0; j < challenges.length; j++) {
      const c = challenges[j];
      const answer = solveChallenge(c);
      const responseTime = rand(2000, 8000); // 2-8s per challenge

      answeredChallenges.push({
        ...c,
        correct: true,
        answered: answer,
        responseTime,
      });
    }

    // Simulate total lesson time: 60-120s
    const lessonDurationMs = rand(60000, 120000);
    const alreadySpent = Date.now() - startTs;
    const remaining = Math.max(lessonDurationMs - alreadySpent, 5000);
    console.log(`   Жду ${Math.round(remaining / 1000)}с (имитация урока)...`);
    await sleep(remaining);

    const now = Date.now() / 1000;
    const result = await fetchJSON(`${API}/sessions/${session.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        ...session,
        challenges: answeredChallenges,
        heartsLeft: 0,
        startTime: now - lessonDurationMs / 1000,
        endTime: now,
        enableBonusPoints: true,
        failed: false,
        maxInLessonStreak: rand(8, challenges.length),
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
