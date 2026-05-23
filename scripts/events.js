import { world } from "@minecraft/server";
import Combat from "./modules/combat";
import Config from "./lib/config";
world.afterEvents.worldLoad.subscribe((event) => {
    world.clearDynamicProperties();
    if (!world.getDynamicProperty("CombatInit")) {
        world.setDynamicProperty("CombatLogAdminItem", Config.admin_item_typeId);
        world.setDynamicProperty("CombatLogTimer", Config.combat_time);
        world.setDynamicProperty("CombatLogBlackListedItems", JSON.stringify(Config.BlackListeditems));
        world.setDynamicProperty("CombatLogAdminTag", Config.AdminTag);
        world.setDynamicProperty("CombatInit", true);
    }
});
world.afterEvents.itemUse.subscribe((event) => {
    Combat.ItemUse(event);
});
world.afterEvents.playerSpawn.subscribe((event) => {
    Combat.OnSpawn(event);
});
world.afterEvents.entityHurt.subscribe((event) => {
    Combat.AfterOnHurt(event);
});
world.beforeEvents.playerLeave.subscribe((event) => {
    Combat.OnLeave(event);
});
world.beforeEvents.chatSend.subscribe((event) => {
    const { message, sender } = event;
    const adminTag = world.getDynamicProperty("CombatLogAdminTag") || Config.AdminTag;
    if (message === "-resetCbl" && sender.hasTag(adminTag)) {
        event.cancel = true;
        sender.sendMessage("§aReset Combat Log Properties Back To Default");
        world.setDynamicProperty("CombatLogAdminItem", Config.admin_item_typeId);
        world.setDynamicProperty("CombatLogTimer", Config.combat_time);
        world.setDynamicProperty("CombatLogBlackListedItems", JSON.stringify(Config.BlackListeditems));
        world.setDynamicProperty("CombatLogAdminTag", Config.AdminTag);
        world.setDynamicProperty("CombatInit", true);
    }
});
