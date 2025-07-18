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

    // --- 게임 로직 (생략된 부분은 이전과 동일) ---
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

    // ### 가장 단순화된 랭킹 로드 함수 ###
    async function loadRanking() {
        rankingList.innerHTML = '<li>데이터를 읽는 중...</li>';
        // '내 순위'는 이 테스트에서 숨깁니다.
        myRankDisplay.classList.add('hidden');

        try {
            // 정렬 없이 그냥 모든 데이터를 가져옵니다.
            const snapshot = await rankingCollection.get();

            if (snapshot.empty) {
                rankingList.innerHTML = '<li>데이터가 없습니다. 게임을 플레이해서 랭킹을 저장해보세요.</li>';
                return;
            }

            rankingList.innerHTML = ''; // 목록 비우기
            
            snapshot.forEach((doc, index) => {
                const data = doc.data();
                
                const li = document.createElement('li');
                // 순위 없이 이름과 점수만 표시
                li.textContent = `이름: ${data.name}, 점수: ${data.score}`;
                rankingList.appendChild(li);
            });

        } catch (error) {
            console.error("### 최종 테스트 오류 ###:", error);
            rankingList.innerHTML = '<li>최종 테스트 중 오류가 발생했습니다.</li>';
        }
    }

    loadRanking();
});