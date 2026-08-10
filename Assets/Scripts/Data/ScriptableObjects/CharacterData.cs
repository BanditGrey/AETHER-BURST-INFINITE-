using UnityEngine;

// Isso transforma a classe em ScriptableObject
// CreateAssetMenu permite criar via menu no editor
[CreateAssetMenu(
    fileName = "NewCharacter",
    menuName = "AetherBurst/Character/CharacterData"
)]
public class CharacterData : ScriptableObject
{
    [Header("Identidade")]
    public string characterName;
    public string characterTitle; // Ex: "The Skybreaker"
    public Sprite portrait;       // Ilustração anime
    public Sprite sprite;         // Sprite chibi de combate
    public RuntimeAnimatorController animator;

    [Header("Classificação")]
    public CharacterClass characterClass;
    public ElementType element;
    public Rarity rarity;

    [Header("Base Stats")]
    public int baseHP;
    public int baseATQ;
    public int baseDefense;
    public int baseSpeed;
    public float baseCritChance;    // 0.0 a 1.0
    public float baseCritDamage;    // Ex: 1.5 = 150%
    public float baseEvasion;       // 0.0 a 1.0
    public float baseAetherCharge;  // velocidade de enchimento do Burst

    [Header("Skills")]
    public SkillData activeSkill;   // referência ao ScriptableObject da skill
    public PassiveData passive;     // referência ao ScriptableObject da passiva
    public BurstData burst;         // referência ao ScriptableObject do Burst

    [Header("Resonance")]
    public ResonancePairConfig[] resonancePairs; // pares possíveis

    [Header("Lore")]
    [TextArea(3, 6)]
    public string loreDescription;
    public string personalityDescription;
}