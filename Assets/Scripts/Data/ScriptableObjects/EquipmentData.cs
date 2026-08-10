using UnityEngine;

[CreateAssetMenu(
    fileName = "NewEquipment",
    menuName = "AetherBurst/Equipment/EquipmentData"
)]
public class EquipmentData : ScriptableObject
{
    [Header("Identidade")]
    public string equipmentName;
    [TextArea(2, 4)]
    public string equipmentDescription;
    public Sprite icon;
    public EquipmentSlot slot;
    public Rarity rarity;

    [Header("Stats Bônus")]
    public BaseStats statBonus;

    [Header("Efeito Especial")]
    public bool hasSpecialEffect;
    public EquipmentEffectType specialEffectType;
    public float specialEffectValue;
    public string specialEffectDescription;

    [Header("Set")]
    public EquipmentSetData set;     // pode ser null

    [Header("Upgrade")]
    public int maxUpgradeLevel = 15;
    public float statBonusPerUpgrade = 0.05f; // +5% por upgrade
}

public enum EquipmentSlot
{
    BurstWeapon,
    RiftArmor,
    AetherCore,
    InfinityRelic
}

public enum EquipmentEffectType
{
    None,
    ChainLightningOnHit,
    CritAfterEvasion,
    BurstDamageBonus,
    FreezeOnSkill,
    DamageAmplifyPerHit,
    GravityMarkOnBasicAttack,
    BurstHeal,
    SurviveOnHP,
    BurstChargeBonus
}