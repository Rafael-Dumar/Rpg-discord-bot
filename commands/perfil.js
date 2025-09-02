import { SlashCommandBuilder, EmbedBuilder, Embed } from "discord.js";
import pool from "../database.js";

export default {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Mostra os status do seu personagem.'),

    async execute(interaction) {
        try{
            const playercheck = await pool.query('SELECT * FROM players WHERE user_id = $1', [interaction.user.id])
            if (playercheck.rowCount === 0) {
                await interaction.reply('Você ainda não tem um personagem criado!')
                return;
            }
            const playerdata = playercheck.rows[0];
            // usando embedbuilder para melhorar o visual da mensagem
            const profileEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Perfil de ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    {name: '📜 Nível', value: `**${playerdata.level}**`, inline: true},
                    {name: '✨ XP', value: `${playerdata.current_xp} / ${playerdata.xp_next_level}`, inline: true},
                    { name: '💰 Moedas', value: `**${playerdata.coins}**`, inline: true },
                    { name: '❤️ HP (Vida)', value: `${playerdata.current_hp} / ${playerdata.max_hp}`, inline: false },
                    { name: '⚔️ Ataque', value: `${playerdata.attack_power}`, inline: true },
                    { name: '🛡️ Defesa', value: `${playerdata.defense}`, inline: true },
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