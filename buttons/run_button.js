import pool from "../database.js";
import { EmbedBuilder } from "discord.js";
import { handleMonsterTurn } from "../util/combatHelper.js";
import { reviveHelper } from "../util/reviveHelper.js";

export default {
    customId: 'run_button',
    async execute(interaction, combat) {
        // garante que o player certo esta interagindo
        if (!combat || !combat.playerData) {
            return interaction.reply({ content: "Você não está em uma batalha ou ela já terminou.", ephemeral: true });
        }
        const { playerData: player, monsterData: monster, activeCombats } = combat;
        const escapeChance = Math.max(0.1, 0.8 - (monster.cr * 0.03)); // chance minima de 10% de fugir, diminui 3% para cada CR do monstro
                    if (Math.random() <= escapeChance) {
                        activeCombats.delete(interaction.user.id);
                        await interaction.update({content: 'Você fugiu da batalha!', embeds: [], components:[]});
                    } else {
                        // falha ao fugir, turno do monstro
                        let description = `Você tenta fugir, mas o ${monster.name} é mais rápido e te impede!`;
                        description += await handleMonsterTurn(player, monster, pool);
                        
                        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle(`Fuga Falhou!`).setDescription(description);
                        // verifica se o jogador foi derrotado
                        if (player.current_hp <= 0) {
                            return await reviveHelper(interaction, player, monster, description, activeCombats);
                       
                        }

                        await interaction.update({embeds: [embed]});
                    }
    }
}