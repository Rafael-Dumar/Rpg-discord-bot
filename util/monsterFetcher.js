import axios from 'axios';

// função que busca os dados de um monstro na api

async function fetchMonster(monsterName) {
    try {
        const res = await axios.get(`https://www.dnd5eapi.co/api/monsters/${monsterName.toLowerCase()}`);
        return res.data;
    } catch(error) {
        console.error(`erro ao buscar o monstro ${monsterName}`, error);
        return null;
    }
}

export default fetchMonster;