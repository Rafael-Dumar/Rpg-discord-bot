import pool from "../database.js";


const lootTable = {
    facil: [ // cr 0-1
        { rarity: 'Comum', chance: 67},
        { rarity: 'Incomum', chance: 25},
        { rarity: 'Raro', chance: 5},
        { rarity: 'Épico', chance: 2},
        { rarity: 'Lendário', chance: 1}
    ],

    medio: [ // cr 2-4
        { rarity: 'Comum', chance: 40},
        { rarity: 'Incomum', chance: 41},
        { rarity: 'Raro', chance: 11},
        { rarity: 'Épico', chance: 5.5},
        { rarity: 'Lendário', chance: 2.5}
        
    ],

    dificil: [ // cr 5-9
        { rarity: 'Comum', chance: 15},
        { rarity: 'Incomum', chance: 20},
        { rarity: 'Raro', chance: 40},
        { rarity: 'Épico', chance: 17},
        { rarity: 'Lendário', chance: 8}
    ],

    lendario: [ // cr 10+
        { rarity: 'Comum', chance: 5},
        { rarity: 'Incomum', chance: 3},
        { rarity: 'Raro', chance: 42},
        { rarity: 'Épico', chance: 35},
        { rarity: 'Lendário', chance: 15}
    ]
    
};

export function getRandomLoot(cr) {
    let difficulty;
    if (cr <= 1) difficulty = 'facil';
    else if (cr <= 4) difficulty = 'medio';
    else if (cr <= 9) difficulty = 'dificil';
    else difficulty = 'lendario';

    const table = lootTable[difficulty];
    const totalChance = table.reduce((sum, item) => sum + item.chance, 0);
    let randomRoll = Math.random() * totalChance;

    for (const item of table) {
        if (randomRoll < item.chance) {
            return item.rarity;
        }
        randomRoll -= item.chance;
    }



}