using UnityEngine;

[CreateAssetMenu(
    fileName = "EconomyConfig",
    menuName = "AetherBurst/Config/EconomyConfig"
)]
public class EconomyConfig : ScriptableObject
{
    [Header("Offline")]
    public float offlineEfficiency = 0.6f;    // 60% offline
    public float maxOfflineHours = 12f;        // máximo de horas offline

    [Header("Shards")]
    public int baseShardsPerWave = 10;
    public float shardsScalingPerZone = 1.1f;

    [Header("Reboot")]
    public int baseFragmentsPerReboot = 10;
    public float fragmentsBonusPerZone = 0.5f;

    [Header("Upgrade de Equipamento")]
    public int[] upgradeCostPerLevel;    // custo de shards por nível
    public float upgradeSuccessRate = 1f; // para futuro: chance de falha
}