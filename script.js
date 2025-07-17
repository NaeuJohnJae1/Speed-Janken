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
                // 새 기록 추가
                await rankingCollection.add({
                    name: name,
                    score: score,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // 기존 기록 업데이트 (더 높은 점수일 경우에만)
                const userDoc = userQuerySnapshot.docs[0];
                if (userDoc.data().score < score) {
                    await rankingCollection.doc(userDoc.id).update({
                        score: score,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error("랭킹 저장 오류: ", error);
        } finally {
            // 랭킹 표시 갱신
            loadRanking();
        }
    }

    async function loadRanking() {
        // 1. 상위 500위 랭킹 목록 표시
        rankingList.innerHTML = '<li>불러오는 중...</li>';
        try {
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
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="rank-name">${index + 1}. ${rankData.name}</span>
                        <span class="rank-stage">${rankData.score} 스테이지</span>
                    `;
                    rankingList.appendChild(li);
                });
            }
        } catch (error) {
            console.error("상위 랭킹 불러오기 오류: ", error);
            rankingList.innerHTML = '<li>랭킹을 불러오는 데 실패했습니다.</li>';
        }

        // 2. '내 순위'를 별도로 계산하여 표시
        myRankDisplay.classList.add('hidden');
        if (!nickname) return; // 닉네임이 없으면 내 순위 계산 안함

        try {
            const userQuerySnapshot = await rankingCollection.where('name', '==', nickname).get();
            if (userQuerySnapshot.empty) {
                return; // 사용자의 랭킹 기록이 아직 없음
            }
            
            const myData = userQuerySnapshot.docs[0].data();
            const myScore = myData.score;
            const myTimestamp = myData.timestamp;

            // 나보다 점수가 높은 사람 수 세기
            const higherScoreSnapshot = await rankingCollection.where('score', '>', myScore).get();
            
            // 나랑 점수는 같지만, 나보다 더 나중에 기록한 사람 수 세기
            const sameScoreSnapshot = await rankingCollection.where('score', '==', myScore).where('timestamp', '>', myTimestamp).get();

            // .size를 사용하여 문서 개수를 셉니다. (v8 SDK 호환 방식)
            const myRank = higherScoreSnapshot.size + sameScoreSnapshot.size + 1;

            myRankDisplay.textContent = `내 순위: ${myRank}위 (${myScore} 스테이지)`;
            myRankDisplay.classList.remove('hidden');

        } catch (error) {
            console.error("내 순위 불러오기 오류: ", error);
            myRankDisplay.textContent = `내 순위를 불러올 수 없습니다.`;
            myRankDisplay.classList.remove('hidden');
        }
    }

    // 페이지 로드 시 초기 랭킹 표시
    loadRanking();
});