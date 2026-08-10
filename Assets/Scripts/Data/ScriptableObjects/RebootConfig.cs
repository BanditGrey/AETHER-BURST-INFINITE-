using UnityEngine;

[CreateAssetMenu(
    fileName = "RebootConfig",
    menuName = "AetherBurst/Config/RebootConfig"
)]
public class RebootConfig : ScriptableObject
{
    [Header("Infinity Circuit — Nodos")]
    public CircuitNode[] circuitNodes;
}

[System.Serializable]
public class CircuitNode
{
    public string nodeName;
    public string nodeDescription;
    public CircuitNodeType nodeType;
    public int cost;                         // custo em Infinity Fragments
    public float bonusValue;                 // valor do bônus
    public int[] prerequisiteNodeIndexes;    // nodos que precisam estar comprados antes
}

public enum CircuitNodeType
{
    BonusAttack,
    BonusDefense,
    BonusHP,
    BonusSpeed,
    BonusCrit,
    BonusShards,
    BonusXP,
    BonusDropRate,
    BonusOffline,
    BonusMarchSpeed,
    UnlockSixthSlot,
    UnlockBurstMode,
    UnlockInfinityRelic
}