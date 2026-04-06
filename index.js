const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LESSONS = parseInt(process.env.LESSONS || "5", 10);
const API = "https://www.duolingo.com/2017-06-30";

async function run() {
  const jwt = process.env.DUOLINGO_JWT;
  if (!jwt) throw new Error("DUOLINGO_JWT not set");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  };

  // --- get user info ---
  const { sub } = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64").toString()
  );
  const userRes = await fetch(
    `${API}/users/${sub}?fields=fromLanguage,learningLanguage`,
    { headers }
  );
  if (!userRes.ok) throw new Error(`User fetch failed: ${userRes.status}`);
  const { fromLanguage, learningLanguage } = await userRes.json();
  console.log(`📚 ${fromLanguage} → ${learningLanguage}`);

  let totalXP = 0;

  for (let i = 1; i <= LESSONS; i++) {
    try {
      // random pre-lesson pause (10-30s) to look human
      if (i > 1) {
        const gap = rand(40000, 65000);
        console.log(`⏳ Пауза ${Math.round(gap / 1000)}с перед уроком ${i}...`);
        await sleep(gap);
      }

      // --- create session ---
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
            "assist", "characterIntro", "characterMatch",
            "characterSelect", "completeReverseTranslation",
            "definitionFillInTheBlank", "dialogue", "fillInTheBlank",
            "freeResponse", "gapFill", "judge", "listen",
            "listenComplete", "listenMatch", "match", "name",
            "partialListen", "partialReverseTranslate", "readComprehension",
            "reverseAssist", "reverseTranslate", "select",
            "selectPronunciation", "selectTranscription", "speak",
            "tapCloze", "tapComplete", "tapDescribe", "translate", "typeCloze",
            "typeComplete",
          ],
          type: "GLOBAL_PRACTICE",
        }),
      });

      if (!sessionRes.ok) {
        console.error(`❌ Урок ${i}: session POST ${sessionRes.status}`);
        continue;
      }
      const session = await sessionRes.json();

      // --- simulate lesson duration (120-240s) ---
      const durationMs = rand(120000, 240000);
      const durationSec = durationMs / 1000;
      console.log(
        `📝 Урок ${i}/${LESSONS}: имитация ${Math.round(durationSec)}с...`
      );
      await sleep(durationMs);

      const now = Date.now() / 1000;

      // --- complete session ---
      const putRes = await fetch(`${API}/sessions/${session.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...session,
          heartsLeft: 0,
          startTime: now - durationSec,
          endTime: now,
          enableBonusPoints: true,
          failed: false,
          maxInLessonStreak: rand(5, 20),
          shouldLearnThings: true,
        }),
      });

      if (!putRes.ok) {
        console.error(`❌ Урок ${i}: PUT ${putRes.status}`);
        continue;
      }
      const result = await putRes.json();
      const xp = result.xpGain || 0;
      totalXP += xp;
      console.log(`✅ Урок ${i} завершён. XP: ${xp}`);
    } catch (e) {
      console.error(`❌ Урок ${i} ошибка:`, e.message);
    }
  }

  console.log(`\n🏆 Итого: ${totalXP} XP за ${LESSONS} уроков`);
}

run().catch((e) => {
  console.error("💀 Fatal:", e);
  process.exit(1);
});
