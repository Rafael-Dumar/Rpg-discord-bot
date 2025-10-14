export default {
    customId: 'cancel_action',
    async execute(interaction) {
        await interaction.message.delete();
    }
};