import axios from 'axios';

// função que busca os dados de um monstro na api

export const monsterPools = {
    facil: [],
    medio: [],
    dificil: [],
    lendario: [],
}

export async function monsterCache() {
     try {
        console.log('Inicializando cache de monstros...');
        let nextPage = 'https://api.open5e.com/monsters/?limit=300';
        const allMonsters = [];

        // Loop para buscar todas as páginas de monstros da API
        while (nextPage) {
            const response = await axios.get(nextPage);
            allMonsters.push(...response.data.results);
            nextPage = response.data.next;
        }

        // Loop para separar todos os monstros em suas listas de dificuldade
        for (const monster of allMonsters) {
            const cr = monster.cr;
            if (cr >= 0 && cr <= 1) {
                monsterPools.facil.push(monster);
            } else if (cr > 1 && cr <= 4) {
                monsterPools.medio.push(monster);
            } else if (cr > 4 && cr <= 9) { 
                monsterPools.dificil.push(monster);
            } else if (cr >= 10) {
                monsterPools.lendario.push(monster);
            }
        }

        console.log(`Cache de monstros inicializado: ${monsterPools.facil.length} fáceis, ${monsterPools.medio.length} médios, ${monsterPools.dificil.length} difíceis, ${monsterPools.lendario.length} lendários.`);
        
    } catch(error) {
        console.error('erro ao iniciar o cache:', error);
    }
}

