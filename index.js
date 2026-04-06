const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const API = "https://www.duolingo.com/2017-06-30";

async function run() {
  const jwt = process.env.DUOLINGO_JWT;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  };

  const { sub } = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64").toString()
  );
  console.log("User ID:", sub);

  const userRes = await fetch(
    `${API}/users/${sub}?fields=fromLanguage,learningLanguage`,
    { headers }
  );
  const user = await userRes.json();
  console.log("User:", JSON.stringify(user, null, 2));

  const { fromLanguage, learningLanguage } = user;

  console.log("\n--- POST /sessions ---");
  const sessionRes = await fetch(`${API}/sessions`, {
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
  const session = await sessionRes.json();

  // Выводим ВСЕ ключи сессии
  console.log("Session keys:", Object.keys(session));
  // Первые 2 challenges для анализа
  if (session.challenges) {
    console.log("Challenges count:", session.challenges.length);
    console.log("Challenge[0]:", JSON.stringify(session.challenges[0], null, 2));
    if (session.challenges[1]) {
      console.log("Challenge[1]:", JSON.stringify(session.challenges[1], null, 2));
    }
  } else {
    console.log("NO challenges field!");
    console.log("Full session:", JSON.stringify(session, null, 2).slice(0, 3000));
  }

  // Ждём 60с и завершаем
  console.log("\nЖду 60с...");
  await sleep(60000);

  const now = Date.now() / 1000;
  const putRes = await fetch(`${API}/sessions/${session.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      ...session,
      heartsLeft: 0,
      startTime: now - 60,
      endTime: now,
      enableBonusPoints: true,
      failed: false,
      maxInLessonStreak: rand(5, 20),
      shouldLearnThings: true,
    }),
  });
  const result = await putRes.json();
  console.log("\n--- PUT result ---");
  console.log("Result keys:", Object.keys(result));
  console.log("XP:", result.xpGain);
  console.log("Full result:", JSON.stringify(result, null, 2).slice(0, 3000));
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
