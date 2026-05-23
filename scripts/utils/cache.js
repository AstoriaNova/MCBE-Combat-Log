import { system, world } from "@minecraft/server";
import Config from "../lib/config";
export default class Cache {
    static CombatTime = {};
    static CombatLoop() {
        system.runInterval(() => {
            for (const [entity_id, time] of Object.entries(this.CombatTime)) {
                const player = world.getPlayers().find(p => p.id === entity_id);
                if (!player) {
                    delete this.CombatTime[entity_id];
                    continue;
                }
                const newTime = time - 1;
                if (newTime <= 0) {
                    delete this.CombatTime[entity_id];
                    player.playSound("note.harp");
                    player.sendMessage("You Have Left Combat");
                    player.onScreenDisplay.setActionBar("§bYou have left combat!");
                    continue;
                }
                this.CombatTime[entity_id] = newTime;
                player.onScreenDisplay.setActionBar(`§b${newTime} seconds left in combat!`);
            }
        }, Config.combat_interval);
    }
}
