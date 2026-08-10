using UnityEngine;

[CreateAssetMenu(
    fileName = "NewEnemy",
    menuName = "AetherBurst/Enemy/EnemyData"
)]
public class EnemyData : ScriptableObject
{
    [Header("Identidade")]
    public string enemyName;
    public EnemyType enemyType;
    public ElementType element;
    public Sprite sprite;
    public RuntimeAnimatorController animator;

    [Header("Base Stats")]
    public int baseHP;
    public int baseAttack;
    public int baseDefense;
    public int baseSpeed;

    [Header("Scaling")]
    // multiplicador de stats por zona
    public float hpScalingPerZone = 1.15f;
    public float attackScalingPerZone = 1.12f;
    public float defenseScalingPerZone = 1.10f;

    [Header("Comportamento")]
    public EnemyBehavior behavior;
    public bool hasSpecialAbility;
    public SkillData specialAbility;
    public float specialAbilityCooldown;

    [Header("Recompensas")]
    public int baseXPReward;
    public int baseShardsReward;
    public DropTable dropTable;    // referência para tabela de drop

    [Header("Visual")]
    public GameObject deathVFXPrefab;
}