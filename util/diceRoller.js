export function rollDice(diceString){
    if (!diceString) return 0;
    // receives a string '2d10+6' and transforms to numeric
    const match = diceString.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/)
    if (!match) return 0;

    const numDice = parseInt(match[1]);
    const numSides = parseInt(match[2]);
    const bonus = parseInt(match[3]) || 0;

    let total = 0;
    for(let i = 0; i<numDice; i++){
        total += Math.floor(Math.random() * numSides) + 1
    }
    return total + bonus;
}