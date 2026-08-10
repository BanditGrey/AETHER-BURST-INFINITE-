using UnityEngine;

[CreateAssetMenu(
    fileName = "NewSkill",
    menuName = "AetherBurst/Combat/SkillData"
)]
public class SkillData : ScriptableObject
{
    [Header("Identidade")]
    public string skillName;
    [TextArea(2, 4)]
    public string skillDescription;
    public Sprite skillIcon;

    [Header("Comportamento")]
    public SkillTargetType targetType;    // SingleTarget, AllEnemies, AllAllies, etc
    public SkillEffectType effectType;    // Damage, Heal, Buff, Debuff, Mixed
    public float cooldown;                // segundos

    [Header("Dano")]
    public float damageMultiplier;        // ex: 2.5 = 250% do ATQ
    public bool ignoresDefense;

    [Header("Efeito Secundário")]
    public bool hasSecondaryEffect;
    public StatusEffectType secondaryEffect; // Burn, Freeze, Stun, etc
    public float secondaryChance;            // 0.0 a 1.0
    public float secondaryDuration;          // segundos

    [Header("Visual")]
    public GameObject skillVFXPrefab;
    public AudioClip skillSFX;
}