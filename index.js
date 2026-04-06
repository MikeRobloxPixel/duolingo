try {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    process.env.LESSONS = process.env.LESSONS ?? 5; // Сразу ставим 5 уроков

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DUOLINGO_JWT}`,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    };

    const { sub } = JSON.parse(Buffer.from(process.env.DUOLINGO_JWT.split(".")[1], "base64").toString());

    const { fromLanguage, learningLanguage } = await fetch(
        `https://duolingo.com{sub}?fields=fromLanguage,learningLanguage`,
        { headers }
    ).then((res) => res.json());

    let totalXp = 0;
    for (let i = 0; i < process.env.LESSONS; i++) {
        console.log(`🚀 Начинаем урок ${i + 1}... Имитируем прохождение (30 секунд)`);
        
        // Ждем 30 секунд, чтобы Duolingo поверил, что мы учимся
        await sleep(30000); 

        const session = await fetch("https://duolingo.com", {
            method: "POST",
            headers,
            body: JSON.stringify({
                fromLanguage,
                learningLanguage,
                isFinalLevel: false,
                isV2: true,
                juicy: true,
                smartTipsVersion: 2,
                type: "GLOBAL_PRACTICE",
            }),
        }).then((res) => res.json());

        const response = await fetch(`https://duolingo.com/${session.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                ...session,
                heartsLeft: 0,
                startTime: (+new Date() - 120000) / 1000, // Сказали, что начали 2 минуты назад
                enableBonusPoints: true,
                endTime: +new Date() / 1000,
                failed: false,
                maxInLessonStreak: 15,
                shouldLearnThings: true,
            }),
        }).then((res) => res.json());

        totalXp += response.xpGain;
        console.log(`✅ Урок ${i + 1} завершен! Получено ${response.xpGain} XP`);
    }

    console.log(`🎉 Итого за сессию: ${totalXp} XP. Огонёк и квесты должны обновиться!`);
} catch (error) {
    console.log("❌ Ошибка! Проверь DUOLINGO_JWT в Secrets.");
    if (error instanceof Error) console.log(error.message);
}
