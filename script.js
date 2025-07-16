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
        myRankDisplay.classList.add('hidden');
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
            // 기존 기록 확인
            const querySnapshot = await rankingCollection.where('name', '==', name).get();
            
            if (querySnapshot.empty) {
                // 새 기록 추가
                await rankingCollection.add({
                    name: name,
                    score: score,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // 기존 기록 업데이트 (더 높은 점수일 경우)
                const doc = querySnapshot.docs[0];
                if (doc.data().score < score) {
                    await rankingCollection.doc(doc.id).update({
                        score: score,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error("랭킹 저장 오류: ", error);
        } finally {
            loadRanking(); // 랭킹 갱신
        }
    }

    async function loadRanking() {
        rankingList.innerHTML = '<li>불러오는 중...</li>';
        myRankDisplay.classList.add('hidden');

        try {
            const snapshot = await rankingCollection
                .orderBy('score', 'desc') // 1. 점수 내림차순
                .orderBy('timestamp', 'desc') // 2. 시간 내림차순 (최신순)
                .limit(500)
                .get();

            rankingList.innerHTML = ''; // 기존 목록 초기화
            if (snapshot.empty) {
                rankingList.innerHTML = '<li>아직 랭킹이 없습니다.</li>';
                return;
            }

            const allRanks = [];
            snapshot.forEach((doc, index) => {
                const rankData = { ...doc.data(), rank: index + 1 };
                allRanks.push(rankData);

                if (index < 500) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="rank-name">${index + 1}. ${doc.data().name}</span>
                        <span class="rank-stage">${doc.data().score} 스테이지</span>
                    `;
                    rankingList.appendChild(li);
                }
            });

            // 내 순위 찾기
            const myRankData = allRanks.find(r => r.name === nickname);
            if(myRankData) {
                myRankDisplay.textContent = `내 순위: ${myRankData.rank}위 (${myRankData.score} 스테이지)`;
                myRankDisplay.classList.remove('hidden');
            }

        } catch (error) {
            console.error("랭킹 불러오기 오류: ", error);
            rankingList.innerHTML = '<li>랭킹을 불러오는 데 실패했습니다.</li>';
        }
    }

    // 초기 랭킹 로드
    loadRanking();
});