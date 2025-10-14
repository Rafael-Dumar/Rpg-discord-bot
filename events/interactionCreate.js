import {Events, EmbedBuilder} from 'discord.js'
import pool from '../database.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction, activeCombats) {
        // se a interação for um comando de barra
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
                    return;
                }
                
                try{
                    await command.execute(interaction, activeCombats);
                } catch(error) {
                    console.error(error);
                    await interaction.reply({content: 'Ocorreu um erro ao executar esse comando.', ephemeral: true});
                }
            }
            //se a interação for um clique de botão
            else if (interaction.isButton()) {
                //procura por um botão pelo ID
                let button = interaction.client.buttons.get(interaction.customId);

                //se não encontrar, procura por um que comece com o prefixo
                if (!button) {
                    for (const btn of interaction.client.buttons.values()) {
                        //Verifica se o ID do botão clicado começa com o ID customizado do arquivo do botão
                        if(interaction.customId.startsWith(btn.customId)) {
                            button = btn;
                            break;
                        }
                    }
                }

                //se um botão foi encontrado
                if (button) {
                    try{
                        const combat = activeCombats.get(interaction.user.id);
                        await button.execute(interaction, {...combat, activeCombats});
                    } catch(err) {
                        console.error(`Erro ao executar o botão ${interaction.customId}:`, err);
                    }
                }

            }
            //se a interação for uma seleção de menu
            else if (interaction.isStringSelectMenu()) {
                //teste
                if(interaction.customId === 'select_potion') {
                    const selectedInventoryId = interaction.values[0];

                    const itemInfo = await pool.query(
                        `SELECT i.name FROM inventories inv JOIN items i ON inv.item_id = i.item_id WHERE inv.inventory_id = $1`, [selectedInventoryId]
                    );
                    const itemName = itemInfo.rows[0].name;

                    // teste de confirmação
                    await interaction.update({content: `Você usou a poção **${itemName}**!`, components: []});
                }
            }

    },
};