const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
    try {
        const jwt = process.env.DUOLINGO_JWT;
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
        };

        const { sub } = JSON.parse(
            Buffer.from(jwt.split(".")[1], "base64").toString()
        );

        const userReq = await fetch(
            `https://duolingo.com${sub}?fields=fromLanguage,learningLanguage`,
            { headers }
        );

        const { fromLanguage, learningLanguage } = await userReq.json();

        // случайная задержка перед стартом
        await sleep(rand(20000, 60000));

        console.log("⏳ Старт сессии...");

        const sessionReq = await fetch("https://duolingo.com", {
            method: "POST",
            headers,
            body: JSON.stringify({
                fromLanguage,
                learningLanguage,
                isFinalLevel: false,
                isV2: true,
                juicy: true,
                type: "GLOBAL_PRACTICE",
            }),
        });

        const session = await sessionReq.json();

        const duration = rand(180000, 360000); // 3–6 минут

        await sleep(rand(30000, 90000));

        const finalReq = await fetch(`https://duolingo.com/${session.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                ...session,
                heartsLeft: 0,
                startTime: (Date.now() - duration) / 1000,
                endTime: Date.now() / 1000,
                enableBonusPoints: true,
                failed: false,
                maxInLessonStreak: rand(5, 20),
                shouldLearnThings: true,
            }),
        });

        const result = await finalReq.json();

        console.log("✅ Урок завершён. XP:", result.xpGain);
    } catch (e) {
        console.error("❌ Ошибка:", e);
    }
}

run();