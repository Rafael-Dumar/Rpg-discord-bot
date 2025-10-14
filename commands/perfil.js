import { SlashCommandBuilder, EmbedBuilder} from "discord.js";
import pool from "../database.js";
import { getEquippedBonuses } from "../util/equippedBonuses.js";

export default {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra os status do seu personagem.'),

    async execute(interaction) {
        try{
            const userId = interaction.user.id;
            const playercheck = await pool.query('SELECT * FROM players WHERE user_id = $1', [userId]);
            if (playercheck.rowCount === 0) {
                await interaction.reply('Você ainda não tem um personagem criado!')
                return;
            }
            const playerData = playercheck.rows[0];
            // pega os bônus dos itens equipados
            const bonuses = await getEquippedBonuses(userId, pool);
            // aplica os bônus aos status do jogador
            const formatStat = (base, bonus) => {
                return bonus > 0 ? `${base} + ${bonus}` : `${base}`;
            }

            const maxHp = `${playerData.current_hp} / ${playerData.max_hp}`;
            // usando embedbuilder para melhorar o visual da mensagem
            const profileEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Perfil de ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    {name: '📜 Nível', value: `${playerData.level}`, inline: true},
                    {name: '✨ XP', value: `${playerData.current_xp} / ${playerData.xp_next_level}`, inline: true},
                    { name: '💰 Moedas', value: `${playerData.coins}`, inline: true },
                    { name: '❤️ HP (Vida)', value: formatStat(maxHp, bonuses.max_hp), inline: false },
                    { name: '⚔️ Ataque', value: formatStat(playerData.attack_power, bonuses.attack_power), inline: true },
                    { name: '🛡️ Defesa', value: formatStat(playerData.defense, bonuses.defense), inline: true },
                    { name: '🪖 Armadura', value: `${bonuses.armor_class}`, inline: true },
                )
                .setTimestamp()
                .setFooter({text: 'Sua aventura apenas começou!'});
            await interaction.reply({embeds: [profileEmbed]});

        } catch(err){
            console.log(err);
            await interaction.reply('❌ Ocorreu um erro ao buscar seu perfil.');
        }
    },
};