import { rollDice } from "./diceRoller.js";
import pool from "../database.js";

export function handlePlayerTurn(player, monster, combat) {
    // Lógica do turno do jogador
    let turnDescription = '';
    // logica de dano do jogador
    let playerDamage = Math.floor(player.attack_power * (0.8 + Math.random() * 0.4)) // dano varia entre 80% e 120%
    let isPlayerCritical = false;

    if (combat.playerBuff) {
        switch (combat.playerBuff.type) {
            case 'DAMAGE_BOOST':
                const bonusDmg = Math.floor(playerDamage * (combat.playerBuff.value/100))
                playerDamage += bonusDmg
                turnDescription += `✨ **(Dano Aumentado: +${bonusDmg}!)** `;
                break;
            case 'BERSERK':
                const berserkBonus = Math.floor(playerDamage * (combat.playerBuff.value/100))
                playerDamage += berserkBonus
                turnDescription += `😡 **(Fúria Berserk: +${berserkBonus}!)** `
                break;
            case 'GUARANTEED_CRIT':
                isPlayerCritical = true;
                turnDescription += `🎯 **(Crítico Garantido!)**`
                break;
            
        }
   
    }
    if (!isPlayerCritical) {
        const critChance = 0.1 + (player.crit_chance * 0.006);
        if (Math.random() <= critChance) {
            isPlayerCritical = true;
        }
    }

    if (isPlayerCritical) {
        playerDamage = player.attack_power * 2;
        turnDescription += "💥**GOLPE CRÍTICO!** "
    }
    
    
    // reduz o dano em 1/3 baseado nos dados da api de armadura do monstro
    const monsterDefense = Math.floor(monster.armor_class/3);
    const finalPlayerDamage = Math.max(1, playerDamage - monsterDefense) // garante pelo menos 1 de dano
    // aplica o dano ao monstro
    monster.hit_points -= finalPlayerDamage;
    turnDescription += `⚔️ Você ataca o **${monster.name}** e causa **${finalPlayerDamage}** de dano!\n ❤️ HP do Monstro: **${monster.hit_points > 0 ? monster.hit_points : 0}**`
    return turnDescription; 
}




export async function handleMonsterTurn(player, monster, dbClient = null, combat = {}) {
    const db = dbClient || pool;
    // Lógica do turno do monstro
    let turnDescription = '';
    let damageMultiplier = 1; // para uso do case 'invulnerability'
    let monsterDamage = 0;
    let totalDefense = player.defense + player.armor_class;
    let damageNegated = false; // para uso do case 'ethereal'

    if (combat.playerBuff) {
        switch(combat.playerBuff.type){
            case 'ETHEREAL':
                damageNegated = true;
                break;
            case 'INVULNERABILITY':
                damageMultiplier = 0.5;
                turnDescription += `\n\n🛡️ Graças à sua invulnerabilidade, o dano do golpe é reduzido!`;
                break;
            case 'DEFENSE_BOOST':
                totalDefense += combat.playerBuff.value;
                break;
            case 'ARMOR_BOOST':
                totalDefense += combat.playerBuff.value;
                break;
            case 'BERSERK':
                totalDefense = Math.max(0, totalDefense - 5);
                break;
        }
    }
    // Seleciona um ataque aleatório do monstro que tenha dano definido
    const possibleAttacks = monster.actions.filter(action => action.damage_dice || (action.damage && action.damage[0]?.damage_dice));
    if (possibleAttacks.length > 0) {
        const monsterAttackAction = possibleAttacks[Math.floor(Math.random() * possibleAttacks.length)];
        const diceString = monsterAttackAction.damage_dice || monsterAttackAction.damage?.[0]?.damage_dice;
        if (diceString) {
            const baseDamage = rollDice(diceString);
            monsterDamage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4) * 1.5); // dano varia entre 80% e 120% e aumenta em 50% para balancear
        } else {
            monsterDamage = Math.floor(monster.strength * (0.8 + Math.random() * 0.4) * 1.5) || 5; // fallback se não tiver dano definido
        }
    }
    // Se não conseguiu calcular o dano pelo ataque, usa a força do monstro como base
    if (monsterDamage === 0) {
        monsterDamage = Math.floor(monster.strength * (0.8 + Math.random() * 0.4) * 1.5) || 5;
    }
    // Garantir que monsterDamage não seja NaN
    if (isNaN(monsterDamage)) {
        console.error("monsterDamage resultou em NaN!", monster);
        const cr = monster.cr;

        if (cr <= 1) monsterDamage = Math.floor(5 * (0.8 + Math.random() * 0.4));
        else if (cr <= 4) monsterDamage = Math.floor(8 * (0.8 + Math.random() * 0.4));
        else if (cr <= 9) monsterDamage = Math.floor(15 * (0.8 + Math.random() * 0.4));
        else monsterDamage = Math.floor(25 * (0.8 + Math.random() * 0.4));
        
        console.log(`Novo dano de fallback calculado baseado no CR ${cr}: ${monsterDamage}`);
    }
    // 5% de chance de acerto crítico
    const criticalChance = Math.random() <= 0.05;
    if (criticalChance) {
        monsterDamage = Math.floor(monsterDamage * 1.5); // Dano crítico aumenta em 50%
        turnDescription += `\n\n💥 O ${monster.name} contra-ataca com um **GOLPE CRÍTICO!**`;
    } else {
        turnDescription += `\n\n👹 O ${monster.name} contra-ataca!`;
    }
    
    // escala o dano do monstro baseado na dificuldade da dungeon
    let attackScale = 0;
    const cr = monster.cr;
    if (cr >= 0 && cr <= 1) {
        attackScale = Math.floor(player.attack_power / 4);
    } else if (cr > 1 && cr <= 4) {
        attackScale = Math.floor(player.attack_power / 3);
    } else if (cr > 4 && cr <= 9) { 
        attackScale = Math.floor(player.attack_power / 2);
    } else if (cr >= 10) {
        attackScale = Math.floor(player.attack_power);
    }

    monsterDamage += attackScale;
    let finalDamage = Math.max(1, Math.floor((monsterDamage - (totalDefense / 2)) * damageMultiplier));
    if (damageNegated) {
        finalDamage = 0;
    }
    player.current_hp -= finalDamage;

    // atualiza o hp do jogador no banco de dados
    await db.query('UPDATE players SET current_hp = $1 WHERE user_id = $2', [player.current_hp, player.user_id]);
    // Emoji de vida baseado na porcentagem de vida restante
    const playerHpEmoji = player.current_hp > (player.max_hp * 0.5) ? '🟢' : player.current_hp > (player.max_hp * 0.2)? '🟡': '🔴'
    turnDescription += `\nO **${monster.name}** te ataca e causa **${finalDamage}** de dano!\n${playerHpEmoji} Seu HP: **${player.current_hp > 0 ? player.current_hp : 0}**`;
    

    return turnDescription; // Retorna a descrição do que aconteceu
}


