using UnityEngine;

[CreateAssetMenu(
    fileName = "NewBurstSync",
    menuName = "AetherBurst/Combat/BurstSyncData"
)]
public class BurstSyncData : ScriptableObject
{
    [Header("Identidade")]
    public string syncName;              // Ex: "Storm Duel"
    [TextArea(2, 4)]
    public string syncDescription;

    [Header("Personagens")]
    public CharacterData characterA;
    public CharacterData characterB;

    [Header("Requisito")]
    public int resonanceLevelRequired = 4;

    [Header("Efeito")]
    public SkillTargetType targetType;
    public float damageMultiplierA;      // dano do personagem A
    public float damageMultiplierB;      // dano do personagem B
    public StatusEffectType specialEffect;
    public float specialEffectDuration;

    [Header("Chance")]
    public float baseSyncChance = 0.05f;     // 5% base
    public float bonusChancePerResonanceLevel = 0.05f; // +5% por nível

    [Header("Cooldown")]
    public float cooldownSeconds = 60f;

    [Header("Visual")]
    public GameObject syncVFXPrefab;
    public AudioClip syncSFX;
    public float screenFreezeTime = 0.3f;
    public Color colorA;                 // cor do personagem A
    public Color colorB;                 // cor do personagem B
}