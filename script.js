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

    // 게임 변수
    let nickname = '';
    let stage = 1;
    let timer;
    let timerInterval;
    let timeLeft;
    const hands = ['✌️', '✊', '🖐️']; // 가위, 바위, 보
    const winConditions = { '✌️': '✊', '✊': '🖐️', '🖐️': '✌️' };
    
    // Firebase 랭킹 컬렉션
    const rankingCollection = db.collection('rankings');

    // --- 이벤트 리스너 ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startGame();
        }
    });

    // --- 게임 로직 ---
    function startGame() {
        nickname = nicknameInput.value.trim();
        if (!nickname) {
            alert('닉네임을 입력해주세요!');
            return;
        }
        
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
        playerButtonsContainer.innerHTML = ''; // 버튼 초기화
        
        const cpuHand = hands[Math.floor(Math.random() * 3)];
        cpuHandDisplay.textContent = cpuHand;

        // 버튼 랜덤 배치
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
        clearInterval(timerInterval); // 타이머 정지
        
        if (winConditions[cpuHand] === playerHand) {
            // 승리
            stage++;
            setTimeout(nextStage, 300); // 다음 스테이지로
        } else {
            // 패배
            gameOver();
        }
    }

    function startTimer() {
        const initialTime = Math.max(5000 - (stage - 1) * 150, 700); // 스테이지가 오를수록 시간 감소, 최소 0.7초
        timeLeft = initialTime;
        timerBar.style.transition = 'none'; // 초기화 시 트랜지션 제거
        timerBar.style.width = '100%';
        
        // 강제 리플로우로 트랜지션 재적용
        void timerBar.offsetWidth; 
        
        timerBar.style.transition = `width ${initialTime / 1000}s linear`;
        timerBar.style.width = '0%';

        clearInterval(timerInterval);
        timerInterval = setTimeout(gameOver, initialTime); // 시간이 다 되면 게임 오버
    }

    function gameOver() {
        clearInterval(timerInterval);
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        finalStageDisplay.textContent = stage;
        
        saveRanking(nickname, stage);
    }

    // --- 유틸리티 함수 ---
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Firebase 랭킹 관련 ---
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
        // ### 테스트를 위해 정렬 기준을 하나로 줄였습니다 ###
        rankingList.innerHTML = '<li>테스트 랭킹 불러오는 중...</li>';
        try {
            const topRankSnapshot = await rankingCollection
                .orderBy('score', 'desc') // timestamp 정렬을 임시로 제거
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
        } catch (error) {
            console.error("테스트 랭킹 불러오기 오류: ", error);
            rankingList.innerHTML = '<li>테스트 랭킹을 불러오는 데 실패했습니다.</li>';
        }

        // '내 순위' 부분은 그대로 둡니다.
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