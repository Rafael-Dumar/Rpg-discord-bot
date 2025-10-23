import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default{
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Mostra a lista completa de comandos do bot.'),
    async execute(interaction) {
        try {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📚 Guia de Comandos do Aventureiro')
                .setDescription('Olá! Eu sou o bot de RPG. Aqui está tudo que você pode fazer:')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '👤 Comandos de Personagem',
                        value:
                        '`/criar-personagem` - Começa sua aventura.\n' +
                        '`/perfil` - Vê sua ficha completa de personagem.\n' +
                        '`/atributos` - Mostra seus pontos e status para upgrade.\n' +
                        '`/distribuir-pontos` - Gasta seus pontos de atributo.\n' +
                        '`/descansar` - Recupera seu HP fora de combate (possui cooldown).',
                        inline: false
                    },
                    {
                        name: '💰 Comandos de Itens & Loja',
                        value:
                        '`/loja` - Abre a loja para ver os itens à venda.\n' +
                        '`/comprar <item_id> [quantidade]` - Compra um item da loja.\n' +
                        '`/inventario` - Mostra os itens na sua mochila.\n' +
                        '`/equipar <item_id>` - Equipa um item do seu inventário.\n' +
                        '`/desequipar <item_id>` - Desequipa um item que você está usando.',
                        inline:false
                    },
                    {
                        name: '🎁 Comandos Diários',
                        value:
                        '`/daily` - Roda a roleta diária para ganhar recompensas (Recompensa melhora com o level do jogador).',
                        inline:false
                    }
                )
                .setFooter({text: 'Divirta-se na sua jornada!'})
            await interaction.reply({embeds:[helpEmbed], ephemeral:true});
        } catch(err) {
            console.error(err);
            await interaction.reply({content: 'Ocorreu um erro ao tentar mostrar a ajuda.', ephemeral:true});
        }

    },
};