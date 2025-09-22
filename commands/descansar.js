import { SlashCommandBuilder} from "discord.js";
import pool from "../database.js";

export default {
    data: new SlashCommandBuilder()
        .setName('descansar')
        .setDescription('Restaura a vida do seu personagem.'),
    
    async execute(interaction) {
        try{
            // verifica se o jogador existe
            const playerCheck = await pool.query('SELECT * FROM players WHERE user_id = $1', [interaction.user.id])
            if (playerCheck.rowCount === 0) {
                await interaction.reply({content: 'Você ainda não tem um personagem criado!', ephemeral: true })
                return;
            }
            
            const player = playerCheck.rows[0];
            const cooldown = 120 * 60 * 1000;
            // se o hp ja estiver cheio, nao deixa descansar
            if (player.current_hp === player.max_hp) {
                await interaction.reply({content: 'Você já está com a vida cheia!', ephemeral: true });
                return;
            }
            // verifica se o cooldown de 2 horas passou
            const lastRest = parseInt(player.last_rest_time || '0');
            const timePassed = Date.now() - lastRest;
            if (timePassed < cooldown) {
                const timeLeft = cooldown - timePassed;
                // convertendo para minutos arredondados para cima
                const minutes = Math.ceil(timeLeft / (60 * 1000));
                await interaction.reply({content: `Você já descansou recentemente. Tente novamente em **${minutes} minutos.**`, ephemeral: true });
                return;
            }

            // se o cooldown passou, restaura a vida
            await pool.query('UPDATE players SET current_hp = max_hp, last_rest_time = $1 WHERE user_id = $2', [Date.now().toString(), interaction.user.id]);
            await interaction.reply({content: '**Você descansa e recupera todas as suas forças!** ', ephemeral: true});

        } catch (error) {
            console.error(error);
            await interaction.reply({content: 'Ocorreu um erro ao processar seu descanso.', ephemeral: true });
        }
    },
};