using UnityEngine;

[System.Serializable]
public class RebootBonuses
{
    public int bonusAttack;
    public int bonusDefense;
    public int bonusHP;
    public float bonusCritChance;
    public float bonusCritDamage;
    public float bonusShardMultiplier = 1f;
    public float bonusXPMultiplier = 1f;

    public BaseStats GetStatBonus()
    {
        return new BaseStats
        {
            hp         = bonusHP,
            attack     = bonusAttack,
            defense    = bonusDefense,
            critChance = bonusCritChance,
            critDamage = bonusCritDamage
        };
    }
}