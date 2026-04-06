const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    try {
        const lessonsCount = 5; 
        const jwt = process.env.DUOLINGO_JWT;

        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        };

        const { sub } = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString());

        const userReq = await fetch(`https://duolingo.com{sub}?fields=fromLanguage,learningLanguage`, { headers });
        const { fromLanguage, learningLanguage } = await userReq.json();

        for (let i = 0; i < lessonsCount; i++) {
            console.log(`⏳ Имитируем прохождение урока ${i + 1}... (ждем 45 секунд)`);
            
            // ЖЕСТКАЯ ПАУЗА
            await sleep(45000); 

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

            const finalReq = await fetch(`https://duolingo.com/${session.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    ...session,
                    heartsLeft: 0,
                    startTime: (Date.now() - 180000) / 1000, // Начали 3 минуты назад
                    enableBonusPoints: true,
                    endTime: Date.now() / 1000,
                    failed: false,
                    maxInLessonStreak: 12,
                    shouldLearnThings: true,
                }),
            });
            const result = await finalReq.json();
            console.log(`✅ Урок ${i + 1} принят! Получено XP: ${result.xpGain}`);
        }
        console.log("🎉 Все уроки пройдены. Огонёк и квесты должны засчитаться!");
    } catch (e) {
        console.error("❌ Ошибка:", e.message);
    }
}

await run(); // Важно: в Bun нужно писать 'await' перед вызовом
