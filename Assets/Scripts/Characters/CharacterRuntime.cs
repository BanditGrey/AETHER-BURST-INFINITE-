using UnityEngine;
using System.Collections.Generic;

public class CharacterRuntime
{
    public CharacterData data;

    public int currentLevel = 1;
    public int currentXP = 0;
    public int currentHP;
    public float currentAether = 0f;

    public EquipmentData[] equippedItems = new EquipmentData[4];

    public List<StatusEffect> activeStatusEffects = new List<StatusEffect>();

    public CharacterRuntime(CharacterData characterData)
    {
        data = characterData;
        currentHP = GetFinalStats(null, null).hp;
    }

    public BaseStats GetFinalStats(LevelingConfig levelConfig, RebootBonuses rebootBonuses)
    {
        float levelMultiplier = levelConfig != null 
            ? levelConfig.GetStatMultiplier(currentLevel) 
            : 1f;

        BaseStats stats = new BaseStats
        {
            hp           = Mathf.RoundToInt(data.baseHP * levelMultiplier),
            attack       = Mathf.RoundToInt(data.baseATQ * levelMultiplier),
            defense      = Mathf.RoundToInt(data.baseDefense * levelMultiplier),
            speed        = data.baseSpeed,
            critChance   = data.baseCritChance,
            critDamage   = data.baseCritDamage,
            evasion      = data.baseEvasion,
            aetherCharge = data.baseAetherCharge
        };

        foreach (var item in equippedItems)
        {
            if (item != null)
                stats = stats + item.statBonus;
        }

        if (rebootBonuses != null)
            stats = stats + rebootBonuses.GetStatBonus();

        return stats;
    }
}