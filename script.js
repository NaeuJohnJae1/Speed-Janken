// 2. Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// 3. 전체 게임 코드
document.addEventListener('DOMContentLoaded', () => {
    // --- 번역 데이터 ---
    const translations = {
        ko: {
            title: "순발력! 가위바위보", nicknameTitle: "닉네임을 입력하세요", nicknamePlaceholder: "10자 이내",
            startButton: "게임 시작", stageLabel: "스테이지", cpuLabel: "상대방", playerLabel: "나",
            gameOverTitle: "게임 오버", finalStageLabel: "최종 스테이지", restartButton: "다시 시작",
            rankingTitle: "🏆 랭킹 (상위 500)", rankingRule: "동점일 경우, 나중에 달성한 사람이 더 높은 순위입니다.",
            loading: "불러오는 중...", noRanking: "아직 랭킹이 없습니다.", loadFail: "랭킹을 불러오는 데 실패했습니다.",
            myRank: "내 순위", myRankFail: "내 순위를 불러올 수 없습니다.", stageUnit: "스테이지", challenger: "도전자"
        },
        en: {
            title: "Reflex! RSP", nicknameTitle: "Enter your nickname", nicknamePlaceholder: "Max 10 chars",
            startButton: "Start Game", stageLabel: "Stage", cpuLabel: "Opponent", playerLabel: "You",
            gameOverTitle: "Game Over", finalStageLabel: "Final Stage", restartButton: "Restart",
            rankingTitle: "🏆 Ranking (Top 500)", rankingRule: "In case of a tie, the later achiever ranks higher.",
            loading: "Loading...", noRanking: "No rankings yet.", loadFail: "Failed to load rankings.",
            myRank: "My Rank", myRankFail: "Could not load your rank.", stageUnit: "Stage", challenger: "Challenger"
        },
        ja: {
            title: "瞬発力！じゃんけん", nicknameTitle: "ニックネームを入力してください", nicknamePlaceholder: "最大10文字",
            startButton: "ゲーム開始", stageLabel: "ステージ", cpuLabel: "相手", playerLabel: "自分",
            gameOverTitle: "ゲームオーバー", finalStageLabel: "最終ステージ", restartButton: "リスタート",
            rankingTitle: "🏆 ランキング (上位500)", rankingRule: "同点の場合、後で達成した人が上位になります。",
            loading: "読み込み中...", noRanking: "まだランキングがありません。", loadFail: "ランキングの読み込みに失敗しました。",
            myRank: "自分の順位", myRankFail: "自分の順位を読み込めませんでした。", stageUnit: "ステージ", challenger: "挑戦者"
        },
        'zh-CN': {
            title: "反应力！剪刀石头布", nicknameTitle: "请输入您的昵称", nicknamePlaceholder: "最多10个字符",
            startButton: "开始游戏", stageLabel: "阶段", cpuLabel: "对手", playerLabel: "你",
            gameOverTitle: "游戏结束", finalStageLabel: "最终阶段", restartButton: "重新开始",
            rankingTitle: "🏆 排行榜 (前500名)", rankingRule: "如果分数相同，后达成者排名更高。",
            loading: "加载中...", noRanking: "暂无排行。", loadFail: "加载排行榜失败。",
            myRank: "我的排名", myRankFail: "无法加载您的排名。", stageUnit: "阶段", challenger: "挑战者"
        },
        'zh-TW': {
            title: "反應力！剪刀石頭布", nicknameTitle: "請輸入您的暱稱", nicknamePlaceholder: "最多10個字元",
            startButton: "開始遊戲", stageLabel: "階段", cpuLabel: "對手", playerLabel: "您",
            gameOverTitle: "遊戲結束", finalStageLabel: "最終階段", restartButton: "重新開始",
            rankingTitle: "🏆 排行榜 (前500名)", rankingRule: "如果分數相同，後達成者排名更高。",
            loading: "載入中...", noRanking: "暫無排行。", loadFail: "載入排行榜失敗。",
            myRank: "我的排名", myRankFail: "無法載入您的排名。", stageUnit: "階段", challenger: "挑戰者"
        }
    };

    // --- 요소 및 변수 ---
    const allElements = {
        startScreen: document.getElementById('start-screen'), gameScreen: document.getElementById('game-screen'),
        gameOverScreen: document.getElementById('game-over-screen'), nicknameInput: document.getElementById('nickname-input'),
        startButton: document.getElementById('start-button'), restartButton: document.getElementById('restart-button'),
        nicknameDisplay: document.getElementById('nickname-display'), stageDisplay: document.getElementById('stage'),
        finalStageDisplay: document.getElementById('final-stage'), cpuHandDisplay: document.getElementById('cpu-hand'),
        playerButtonsContainer: document.getElementById('player-buttons'), timerBar: document.getElementById('timer-bar'),
        rankingList: document.getElementById('ranking-list'), myRankDisplay: document.getElementById('my-rank'),
        langSelect: document.getElementById('lang-select')
    };
    const sounds = {
        bgm: document.getElementById('bgm'), click: document.getElementById('sound-click'),
        success: document.getElementById('sound-success'), fail: document.getElementById('sound-fail')
    };

    let nickname = '';
    let stage = 1;
    let timerInterval;
    const hands = ['✌️', '✊', '🖐️'];
    const winConditions = { '✌️': '✊', '✊': '🖐️', '🖐️': '✌️' };
    const rankingCollection = db.collection('rankings');
    let currentLang = 'ko';
    let playerHandElements = [];

    // --- 이벤트 리스너 ---
    allElements.startButton.addEventListener('click', startGame);
    allElements.restartButton.addEventListener('click', restartGame);
    allElements.nicknameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startGame(); });
    allElements.langSelect.addEventListener('change', (e) => updateLanguage(e.target.value));
    document.addEventListener('keydown', handleKeyboardInput);

    // --- 함수 ---
    function updateLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang;
        const t = translations[lang];

        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.getAttribute('data-lang');
            if(t[key]) el.textContent = t[key];
        });
        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
            const key = el.getAttribute('data-lang-placeholder');
            if(t[key]) el.placeholder = t[key];
        });
        loadRanking();
    }

    function playSound(sound, volume = 1.0) {
        sound.volume = volume;
        sound.currentTime = 0;
        sound.play();
    }
    
    function handleKeyboardInput(e) {
        if (allElements.gameScreen.classList.contains('hidden')) return;

        let selectedButton = null;
        if (e.key === 'ArrowLeft') selectedButton = playerHandElements[0];
        else if (e.key === 'ArrowDown') selectedButton = playerHandElements[1];
        else if (e.key === 'ArrowRight') selectedButton = playerHandElements[2];
        
        if (selectedButton) {
            e.preventDefault(); 
            playSound(sounds.click);
            selectedButton.click();
        }
    }

    function startGame() {
        nickname = allElements.nicknameInput.value.trim();
        if (!nickname) { alert('닉네임을 입력해주세요!'); return; }
        
        playSound(sounds.click);
        sounds.bgm.volume = 0.3;
        sounds.bgm.play();

        stage = 1;
        allElements.nicknameDisplay.textContent = `${translations[currentLang].challenger}: ${nickname}`;
        allElements.startScreen.classList.add('hidden');
        allElements.gameOverScreen.classList.add('hidden');
        allElements.gameScreen.classList.remove('hidden');
        
        loadRanking();
        nextStage();
    }

    function restartGame() {
        playSound(sounds.click);
        allElements.gameOverScreen.classList.add('hidden');
        allElements.startScreen.classList.remove('hidden');
    }

    function nextStage() {
        allElements.stageDisplay.textContent = stage;
        allElements.playerButtonsContainer.innerHTML = '';
        playerHandElements = [];
        
        const cpuHand = hands[Math.floor(Math.random() * 3)];
        allElements.cpuHandDisplay.textContent = cpuHand;

        const playerHandOptions = shuffle([...hands]);
        playerHandOptions.forEach(hand => {
            const button = document.createElement('button');
            button.className = 'player-btn';
            button.textContent = hand;
            button.addEventListener('click', () => {
                playSound(sounds.click);
                selectHand(hand, cpuHand);
            });
            allElements.playerButtonsContainer.appendChild(button);
            playerHandElements.push(button);
        });

        startTimer();
    }

    function selectHand(playerHand, cpuHand) {
        clearInterval(timerInterval);
        if (winConditions[cpuHand] === playerHand) {
            playSound(sounds.success);
            stage++;
            setTimeout(nextStage, 300);
        } else {
            playSound(sounds.fail, 0.4); // 실패 효과음 볼륨 조절
            gameOver();
        }
    }

    function startTimer() {
        const initialTime = Math.max(5000 - (stage - 1) * 150, 700);
        allElements.timerBar.style.transition = 'none';
        allElements.timerBar.style.width = '100%';
        void allElements.timerBar.offsetWidth;
        allElements.timerBar.style.transition = `width ${initialTime / 1000}s linear`;
        allElements.timerBar.style.width = '0%';
        clearInterval(timerInterval);
        timerInterval = setTimeout(() => {
            playSound(sounds.fail, 0.4); // 실패 효과음 볼륨 조절
            gameOver();
        }, initialTime);
    }



    function gameOver() {
        clearInterval(timerInterval);
        sounds.bgm.pause();
        sounds.bgm.currentTime = 0;
        allElements.gameScreen.classList.add('hidden');
        allElements.gameOverScreen.classList.remove('hidden');
        allElements.finalStageDisplay.textContent = stage;
        saveRanking(nickname, stage);
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function saveRanking(name, score) {
        if (!name || score <= 0) return;
        try {
            const userQuerySnapshot = await rankingCollection.where('name', '==', name).get();
            if (userQuerySnapshot.empty) {
                await rankingCollection.add({ name: name, score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            } else {
                const userDoc = userQuerySnapshot.docs[0];
                if (userDoc.data().score < score) {
                    await rankingCollection.doc(userDoc.id).update({ score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                }
            }
        } catch (error) {
            console.error("랭킹 저장 오류: ", error);
        } finally {
            loadRanking();
        }
    }

    async function loadRanking() {
        const t = translations[currentLang];
        allElements.rankingList.innerHTML = `<li>${t.loading}</li>`;
        try {
            const topRankSnapshot = await rankingCollection
                .orderBy('score', 'desc')
                .orderBy('timestamp', 'desc')
                .limit(500)
                .get();

            allElements.rankingList.innerHTML = '';
            if (topRankSnapshot.empty) {
                allElements.rankingList.innerHTML = `<li>${t.noRanking}</li>`;
            } else {
                let rank = 0;
                topRankSnapshot.forEach((doc) => {
                    rank++;
                    const rankData = doc.data();
                    
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="rank-name">${rank}. ${rankData.name}</span>
                        <span class="rank-stage">${rankData.score} ${t.stageUnit}</span>
                    `;
                    allElements.rankingList.appendChild(li);
                });
            }
        } catch (error) {
            console.error("전체 랭킹 로드 실패: ", error);
            allElements.rankingList.innerHTML = `<li>${t.loadFail}</li>`;
        }

        allElements.myRankDisplay.classList.add('hidden');
        if (!nickname) return;
        try {
            const userQuerySnapshot = await rankingCollection.where('name', '==', nickname).get();
            if (userQuerySnapshot.empty) { return; }
            
            const myData = userQuerySnapshot.docs[0].data();
            const myScore = myData.score;
            const myTimestamp = myData.timestamp;

            const higherScoreSnapshot = await rankingCollection.where('score', '>', myScore).get();
            const higherScoreCount = higherScoreSnapshot.size;
            
            let sameScoreCount = 0;
            if (myTimestamp) {
                const sameScoreSnapshot = await rankingCollection.where('score', '==', myScore).where('timestamp', '>', myTimestamp).get();
                sameScoreCount = sameScoreSnapshot.size;
            }

            const myRank = higherScoreCount + sameScoreCount + 1;
            allElements.myRankDisplay.textContent = `${t.myRank}: ${myRank}위 (${myScore} ${t.stageUnit})`;
            allElements.myRankDisplay.classList.remove('hidden');
        } catch (error) {
            console.error("내 순위 불러오기 오류: ", error);
            allElements.myRankDisplay.textContent = t.myRankFail;
            allElements.myRankDisplay.classList.remove('hidden');
        }
    }

    updateLanguage(currentLang);
});