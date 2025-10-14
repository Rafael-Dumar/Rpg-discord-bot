import pool from '../database.js';

export async function getEquippedBonuses(userId, pool) {

    const totalBonuses = {
        max_hp: 0,
        attack_power: 0,
        defense: 0,
        armor_class: 0,
        crit_chance: 0
    };

    const equippedItemsResult = await pool.query(
        'SELECT i.bonuses FROM equipped_items ei JOIN inventories inv ON ei.inventory_id = inv.inventory_id JOIN items i ON inv.item_id = i.item_id WHERE ei.player_id = $1', [userId]
    )

    if (equippedItemsResult.rowCount > 0) {
        for (const item of equippedItemsResult.rows) {
            if (item.bonuses) {
                for (const [stat, value] of Object.entries(item.bonuses)) {
                    if (totalBonuses.hasOwnProperty(stat)) {
                        totalBonuses[stat] += value;
                    }
                }
            }
        }
    }
    return totalBonuses;

}