using UnityEngine;

[System.Serializable]
public struct BaseStats
{
    public int hp;
    public int attack;
    public int defense;
    public int speed;
    public float critChance;
    public float critDamage;
    public float evasion;
    public float aetherCharge;

    // Soma dois stats
    public static BaseStats operator +(BaseStats a, BaseStats b)
    {
        return new BaseStats
        {
            hp           = a.hp + b.hp,
            attack       = a.attack + b.attack,
            defense      = a.defense + b.defense,
            speed        = a.speed + b.speed,
            critChance   = a.critChance + b.critChance,
            critDamage   = a.critDamage + b.critDamage,
            evasion      = a.evasion + b.evasion,
            aetherCharge = a.aetherCharge + b.aetherCharge
        };
    }

    // Multiplica stats por um fator
    public static BaseStats operator *(BaseStats a, float multiplier)
    {
        return new BaseStats
        {
            hp           = Mathf.RoundToInt(a.hp * multiplier),
            attack       = Mathf.RoundToInt(a.attack * multiplier),
            defense      = Mathf.RoundToInt(a.defense * multiplier),
            speed        = a.speed,
            critChance   = a.critChance,
            critDamage   = a.critDamage,
            evasion      = a.evasion,
            aetherCharge = a.aetherCharge
        };
    }
}