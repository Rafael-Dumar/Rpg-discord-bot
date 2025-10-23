import pool from "../database.js";
import { EmbedBuilder } from "discord.js";
import { handleMonsterTurn } from "../util/combatHelper.js";
import { reviveHelper } from "../util/reviveHelper.js";

export default {
    customId: 'run_button',
    async execute(interaction, combat) {
        const { playerData: player, monsterData: monster, activeCombats } = combat;
        let escapeChance = Math.max(0.1, 0.7 - (monster.cr * 0.1)); // chance minima de 10% de fugir, diminui 3% para cada CR do monstro
        let description = '';
        if (combat.playerBuff && combat.playerBuff.type === 'FLEE_BOOST') {
            const boostAmount = combat.playerBuff.value / 100;
            escapeChance += boostAmount;
            description += `💨 Você usa sua poção e sua chance de fuga aumenta drasticamente!\n\n`;
        }
        if (Math.random() <= escapeChance) {
            activeCombats.delete(interaction.user.id);
            await interaction.update({content: 'Você fugiu da batalha!', embeds: [], components:[]});
        } else {
            // falha ao fugir, turno do monstro
            description += `Você tenta fugir, mas o ${monster.name} é mais rápido e te impede!`;
            description += await handleMonsterTurn(player, monster, pool, combat);
                        
            const embed = new EmbedBuilder().setColor(0xFF0000).setTitle(`Fuga Falhou!`).setDescription(description);
            // verifica se o jogador foi derrotado
            if (player.current_hp <= 0) {
                return await reviveHelper(interaction, player, monster, description, activeCombats);
            }
            // gasta um turno de buff se a fuga falhar
            if (combat.playerBuff && combat.playerBuff.duration !== null) {
                combat.playerBuff.duration -= 1;
                if(combat.playerBuff.duration <= 0) {
                    combat.playerBuff = null;
                }
            }

            await interaction.update({embeds: [embed]});
        }
    }
}