using UnityEngine;

[CreateAssetMenu(
    fileName = "NewZone",
    menuName = "AetherBurst/Zone/ZoneData"
)]
public class ZoneData : ScriptableObject
{
    [Header("Identidade")]
    public string zoneName;             // Ex: "Verdant Rift"
    [TextArea(2, 4)]
    public string zoneDescription;
    public Sprite zoneBackground;       // fundo do combate
    public ElementType dominantElement;

    [Header("Estrutura")]
    public int totalLevels = 100;
    public int miniBossInterval = 10;   // mini-boss a cada X níveis

    [Header("Inimigos")]
    public EnemyData[] commonEnemies;   // inimigos normais
    public EnemyData[] eliteEnemies;    // inimigos elite
    public EnemyData miniBoss;
    public EnemyData bossRiftLord;

    [Header("Waves")]
    public int minEnemiesPerWave = 2;
    public int maxEnemiesPerWave = 5;
    public int enemiesPerWaveScalingInterval = 10; // a cada X níveis, +1 inimigo

    [Header("Recompensas")]
    public float shardsMultiplier = 1.0f;
    public float xpMultiplier = 1.0f;
    public DropTable zoneDropTable;
}