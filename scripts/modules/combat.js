import { world, system, Player, EquipmentSlot, } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import Config from "../lib/config";
import Cache from "../utils/cache";
export default class Combat {
    static AfterOnHurt(event) {
        const { damageSource: { damagingEntity: source }, hurtEntity: target, } = event;
        if (!(source instanceof Player) || !(target instanceof Player))
            return;
        [source, target].forEach((player) => {
            const wasInCombat = Cache.CombatTime[player.id] !== undefined;
            Cache.CombatTime[player.id] = Config.combat_time;
            if (!wasInCombat) {
                player.sendMessage("§aYou have just entered combat!");
            }
        });
    }
    static async ItemUse(event) {
        const { source, itemStack } = event;
        if (!(source instanceof Player))
            return;
        const adminTag = world.getDynamicProperty("CombatLogAdminTag") || Config.AdminTag;
        const adminItem = world.getDynamicProperty("CombatLogAdminItem") || Config.admin_item_typeId;
        if (!source.hasTag(adminTag))
            return;
        if (itemStack.typeId !== adminItem)
            return;
        await this.AdminConfigMenu(source);
    }
    static OnLeave(event) {
        const { player } = event;
        if (!player)
            return;
        if (!Cache.CombatTime[player.id])
            return;
        const playerName = player.name;
        const playerId = player.id;
        this.DropInventory(player);
        player.setDynamicProperty(`combat_logged`, true);
        delete Cache.CombatTime[playerId];
        system.run(() => {
            world.sendMessage(`§l§c${playerName}§r§7 combat logged and has been punished!`);
        });
    }
    static OnSpawn(event) {
        const { player } = event;
        if (!player)
            return;
        const playerId = player.id;
        const logged = player.getDynamicProperty(`combat_logged`) === true;
        if (logged) {
            this.ClearInventory(player);
            player.sendMessage("§cYou logged out during combat! Your inventory has been cleared as a penalty.");
            player.setDynamicProperty(`combat_logged`, false);
        }
        if (Cache.CombatTime[playerId])
            delete Cache.CombatTime[playerId];
    }
    static async AdminConfigMenu(player) {
        let currentAdminItem = world.getDynamicProperty("CombatLogAdminItem") || Config.admin_item_typeId;
        let currentCombatTimer = world.getDynamicProperty("CombatLogTimer") || Config.combat_time;
        let currentBlacklistedItems = world.getDynamicProperty("CombatLogBlackListedItems") || Config.BlackListeditems.join(",");
        let currentAdminTag = world.getDynamicProperty("CombatLogAdminTag") || Config.AdminTag;
        const form = new ModalFormData()
            .title("§bAdmin Config Menu")
            .label("§7Below You Can Change The Combat Log Settings")
            .textField("§bAdmin Menu Item", `Current: ${currentAdminItem}`, { defaultValue: "",
            tooltip: "e.g., minecraft:stick"
        })
            .textField("§bCombat Timer (seconds)", `Current: ${currentCombatTimer}s`, {
            defaultValue: "",
            tooltip: "e.g., 30"
        })
            .textField("§bBlacklisted Items", `Current: ${currentBlacklistedItems}`, {
            defaultValue: "",
            tooltip: "Separate with commas: minecraft:spear, minecraft:wooden_sword"
        })
            .textField("§bAdmin Tag", `Current: ${currentAdminTag}`, {
            defaultValue: "",
            tooltip: "e.g., admin"
        })
            .toggle("§cConfirm Changes", {
            defaultValue: false,
            tooltip: "Confirm Changes"
        });
        const result = await form.show(player);
        if (result.canceled)
            return;
        const formValues = result.formValues;
        if (!formValues)
            return;
        const confirmed = formValues[5];
        if (!confirmed) {
            player.sendMessage("§cChanges were not confirmed! No changes saved.");
            return;
        }
        const newAdminItem = formValues[1].trim();
        const newCombatTimerStr = formValues[2];
        const newCombatTimer = parseInt(newCombatTimerStr);
        const newBlacklistedItems = formValues[3].trim();
        const newAdminTag = formValues[4].trim();
        let changesSaved = false;
        if (newAdminItem && newAdminItem !== "") {
            world.setDynamicProperty("CombatLogAdminItem", newAdminItem);
            player.sendMessage(`§aAdmin menu item changed to: §e${newAdminItem}`);
            changesSaved = true;
        }
        if (newCombatTimerStr && newCombatTimerStr !== "") {
            if (!isNaN(newCombatTimer) && newCombatTimer > 0) {
                world.setDynamicProperty("CombatLogTimer", newCombatTimer);
                Config.combat_time = newCombatTimer;
                player.sendMessage(`§aCombat timer changed to: §e${newCombatTimer} seconds`);
                changesSaved = true;
            }
            else {
                player.sendMessage("§cInvalid combat timer value! Must be a positive number.");
            }
        }
        if (newBlacklistedItems && newBlacklistedItems !== "") {
            const items = newBlacklistedItems.split(",").map(item => item.trim());
            const validItems = items.filter(item => item.includes(":"));
            if (validItems.length > 0) {
                world.setDynamicProperty("CombatLogBlackListedItems", validItems.join(","));
                Config.BlackListeditems = validItems;
                player.sendMessage(`§aBlacklisted items updated: §e${validItems.join(", ")}`);
                changesSaved = true;
            }
            else {
                player.sendMessage("§cInvalid blacklisted items! Use format: minecraft:spear, minecraft:wooden_sword");
            }
        }
        if (newAdminTag && newAdminTag !== "") {
            world.setDynamicProperty("CombatLogAdminTag", newAdminTag);
            Config.AdminTag = newAdminTag;
            player.sendMessage(`§aAdmin tag changed to: §e${newAdminTag}`);
            changesSaved = true;
        }
        if (changesSaved) {
            player.sendMessage("§a§lConfiguration saved successfully!");
            player.playSound("random.levelup");
        }
        else {
            player.sendMessage("§eNo valid changes were made.");
        }
    }
    static isBlacklistedItem(item) {
        if (!item)
            return false;
        const blacklistedStr = world.getDynamicProperty("CombatLogBlackListedItems") || Config.BlackListeditems.join(",");
        const blacklistedItems = blacklistedStr.split(",").map(i => i.trim());
        return blacklistedItems.includes(item.typeId);
    }
    static ClearInventory(player) {
        if (!player)
            return;
        try {
            const inventoryComp = player.getComponent("minecraft:inventory").container;
            const equippable = player.getComponent("minecraft:equippable");
            if (!inventoryComp)
                return;
            for (let i = 0; i < inventoryComp.size; i++) {
                const item = inventoryComp.getItem(i);
                if (item && !this.isBlacklistedItem(item)) {
                    inventoryComp.setItem(i, undefined);
                }
            }
            if (equippable) {
                for (const slot of [
                    EquipmentSlot.Head,
                    EquipmentSlot.Chest,
                    EquipmentSlot.Legs,
                    EquipmentSlot.Feet,
                    EquipmentSlot.Offhand,
                ]) {
                    const item = equippable.getEquipment(slot);
                    if (item && !this.isBlacklistedItem(item)) {
                        equippable.setEquipment(slot, undefined);
                    }
                }
            }
        }
        catch (err) {
            console.log("[ClearInventory] Failed to clear inventory:", err);
        }
    }
    static DropInventory(player) {
        const inventoryComp = player.getComponent("minecraft:inventory").container;
        const equippable = player.getComponent("minecraft:equippable");
        if (!inventoryComp)
            return;
        const location = player.location;
        const dimension = player.dimension;
        if (!location || !dimension)
            return;
        const invItems = Array.from({ length: inventoryComp.size }, (_, i) => inventoryComp.getItem(i));
        const slots = [
            EquipmentSlot.Head,
            EquipmentSlot.Chest,
            EquipmentSlot.Legs,
            EquipmentSlot.Feet,
            EquipmentSlot.Offhand,
        ];
        const equipItems = equippable
            ? slots.map((slot) => equippable.getEquipment(slot))
            : [];
        const items = [...invItems, ...equipItems].filter(Boolean);
        system.run(() => {
            try {
                for (const item of items) {
                    if (!item)
                        continue;
                    if (!this.isBlacklistedItem(item)) {
                        dimension.spawnItem(item, location);
                    }
                }
            }
            catch (err) {
                console.log("[DropInventory] Failed to spawn items:", err);
            }
        });
    }
}
