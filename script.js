document.addEventListener('DOMContentLoaded', () => {
    // 화면 요소
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const nicknameInput = document.getElementById('nickname-input');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const nicknameDisplay = document.getElementById('nickname-display');
    const stageDisplay = document.getElementById('stage');
    const finalStageDisplay = document.getElementById('final-stage');
    const cpuHandDisplay = document.getElementById('cpu-hand');
    const playerButtonsContainer = document.getElementById('player-buttons');
    const timerBar = document.getElementById('timer-bar');
    const rankingList = document.getElementById('ranking-list');
    const myRankDisplay = document.getElementById('my-rank');

    let nickname = '';
    let stage = 1;
    let timer;
    let timerInterval;
    let timeLeft;
    const hands = ['✌️', '✊', '🖐️'];
    const winConditions = { '✌️': '✊', '✊': '🖐️', '🖐️': '✌️' };
    const rankingCollection = db.collection('rankings');

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    nicknameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startGame(); });

    function startGame() {
        nickname = nicknameInput.value.trim();
        if (!nickname) { alert('닉네임을 입력해주세요!'); return; }
        stage = 1;
        nicknameDisplay.textContent = `도전자: ${nickname}`;
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        loadRanking();
        nextStage();
    }

    function restartGame() {
        gameOverScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }

    function nextStage() {
        stageDisplay.textContent = stage;
        playerButtonsContainer.innerHTML = '';
        const cpuHand = hands[Math.floor(Math.random() * 3)];
        cpuHandDisplay.textContent = cpuHand;
        const playerHandOptions = shuffle([...hands]);
        playerHandOptions.forEach(hand => {
            const button = document.createElement('button');
            button.className = 'player-btn';
            button.textContent = hand;
            button.addEventListener('click', () => selectHand(hand, cpuHand));
            playerButtonsContainer.appendChild(button);
        });
        startTimer();
    }

    function selectHand(playerHand, cpuHand) {
        clearInterval(timerInterval);
        if (winConditions[cpuHand] === playerHand) {
            stage++;
            setTimeout(nextStage, 300);
        } else {
            gameOver();
        }
    }

    function startTimer() {
        const initialTime = Math.max(5000 - (stage - 1) * 150, 700);
        timeLeft = initialTime;
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        void timerBar.offsetWidth;
        timerBar.style.transition = `width ${initialTime / 1000}s linear`;
        timerBar.style.width = '0%';
        clearInterval(timerInterval);
        timerInterval = setTimeout(gameOver, initialTime);
    }

    function gameOver() {
        clearInterval(timerInterval);
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        finalStageDisplay.textContent = stage;
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
        // ### 전체 순위 부분의 try...catch를 의도적으로 제거했습니다 ###
        rankingList.innerHTML = '<li>최종 색인 설정 중...</li>';

        const topRankSnapshot = await rankingCollection
            .orderBy('score', 'desc')
            .orderBy('timestamp', 'desc')
            .limit(500)
            .get();

        rankingList.innerHTML = '';
        if (topRankSnapshot.empty) {
            rankingList.innerHTML = '<li>아직 랭킹이 없습니다.</li>';
        } else {
            topRankSnapshot.forEach((doc, index) => {
                const rankData = doc.data();
                const rank = index + 1;
                if (rankData && !isNaN(rank)) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="rank-name">${rank}. ${rankData.name}</span>
                        <span class="rank-stage">${rankData.score} 스테이지</span>
                    `;
                    rankingList.appendChild(li);
                }
            });
        }
        
        // '내 순위' 로직은 그대로 유지합니다.
        myRankDisplay.classList.add('hidden');
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
            myRankDisplay.textContent = `내 순위: ${myRank}위 (${myScore} 스테이지)`;
            myRankDisplay.classList.remove('hidden');
        } catch (error) {
            console.error("내 순위 불러오기 오류: ", error);
            myRankDisplay.textContent = `내 순위를 불러올 수 없습니다.`;
            myRankDisplay.classList.remove('hidden');
        }
    }

    loadRanking();
});