using UnityEngine;

[CreateAssetMenu(
    fileName = "LevelingConfig",
    menuName = "AetherBurst/Config/LevelingConfig"
)]
public class LevelingConfig : ScriptableObject
{
    [Header("Fórmula de XP")]
    public int baseXPRequired = 100;
    public float xpGrowthRate = 1.15f;  // crescimento por nível

    [Header("Cap de Nível por Rank")]
    public int[] levelCapPerRank;        // ex: {20, 40, 60, 80, 100}

    [Header("Stats por Nível")]
    public float hpGrowthPerLevel = 0.08f;      // +8% HP por nível
    public float attackGrowthPerLevel = 0.06f;
    public float defenseGrowthPerLevel = 0.05f;

    // Calcula XP necessária para o próximo nível
    public int GetXPRequired(int currentLevel)
    {
        return Mathf.RoundToInt(baseXPRequired * Mathf.Pow(xpGrowthRate, currentLevel));
    }

    // Calcula multiplicador de stat por nível
    public float GetStatMultiplier(int level)
    {
        return 1f + (hpGrowthPerLevel * (level - 1));
    }
}