export function createArcadeEngine() {
  let status = 'idle';
  let puzzle = null;
  let currentStepIndex = 0;
  let picks = [];
  let pathLength = 0;
  let optimalLength = 0;

  function startGame(p) {
    puzzle = p;
    currentStepIndex = 0;
    picks = [];
    optimalLength = puzzle.optimalLength;
    pathLength = 0;
    status = 'playing';
    return getState();
  }

  function pickOption(option) {
    if (status !== 'playing') return null;

    const pick = { name: option.name, color: option.color, step: pathLength };
    picks.push(pick);
    pathLength++;

    if (option.next === null || option.next === undefined) {
      // Reached target — game over
      status = 'ended';
      return {
        result: option.color,
        gameOver: true,
        nextStepIndex: null
      };
    }

    currentStepIndex = option.next;
    return {
      result: option.color,
      gameOver: false,
      nextStepIndex: currentStepIndex
    };
  }

  function getState() {
    return {
      status,
      puzzle,
      currentStepIndex,
      picks: [...picks],
      pathLength,
      optimalLength
    };
  }

  function getGrade() {
    if (status !== 'ended') return null;

    const diff = pathLength - optimalLength;

    if (diff === 0) return 'S';
    if (diff === 1) return 'A';
    if (diff === 2) return 'B';
    if (diff === 3) return 'C';
    return 'D';
  }

  function getScoreOverOptimal() {
    return pathLength - optimalLength;
  }

  function getShareEmoji() {
    return picks.map(p => {
      if (p.color === 'green') return '\u{1F7E2}';
      return '\u{1F7E1}';
    }).join('');
  }

  function getShareText(puzzleNumber, streak) {
    const over = getScoreOverOptimal();
    const grade = getGrade();
    const perfect = over === 0 ? ' (Perfect)' : '';
    const streakText = streak > 0 ? ` \u{1F525}${streak}` : '';

    const lines = [
      `\u{1F91D} Six Handshakes #${puzzleNumber} +${over}${perfect}${streakText}`,
      getShareEmoji(),
      'sixhandshakes.app'
    ];

    return lines.join('\n');
  }

  function reset() {
    status = 'idle';
    puzzle = null;
    currentStepIndex = 0;
    picks = [];
    pathLength = 0;
    optimalLength = 0;
  }

  return {
    startGame,
    pickOption,
    getState,
    getGrade,
    getScoreOverOptimal,
    getShareEmoji,
    getShareText,
    reset
  };
}
