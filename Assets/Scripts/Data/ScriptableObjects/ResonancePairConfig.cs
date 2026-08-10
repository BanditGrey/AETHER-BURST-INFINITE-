using UnityEngine;

[CreateAssetMenu(
    fileName = "NewResonancePair",
    menuName = "AetherBurst/Resonance/ResonancePairConfig"
)]
public class ResonancePairConfig : ScriptableObject
{
    [Header("Personagens")]
    public CharacterData characterA;
    public CharacterData characterB;

    [Header("Tipo de Relação")]
    public ResonanceRelationType relationType;

    [Header("Bônus por Nível")]
    public ResonanceLevelBonus[] levelBonuses;

    [Header("Burst Sync")]
    public BurstSyncData burstSync;          // pode ser null
    public int syncUnlockLevel = 4;
}

[System.Serializable]
public class ResonanceLevelBonus
{
    public int level;
    public float statBonusPercent;           // % de bônus de stats
    public string bonusDescription;
    public bool unlocksDialogue;
    public bool unlocksBurstSync;
    public bool changesPortrait;
}

public enum ResonanceRelationType
{
    Friendship,
    Rivalry,
    Mentorship,
    Alliance,
    Affinity
}