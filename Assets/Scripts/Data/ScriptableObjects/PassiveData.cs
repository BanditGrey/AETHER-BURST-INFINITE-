using UnityEngine;

[CreateAssetMenu(
    fileName = "NewPassive",
    menuName = "AetherBurst/Combat/PassiveData"
)]
public class PassiveData : ScriptableObject
{
    [Header("Identidade")]
    public string passiveName;
    [TextArea(2, 4)]
    public string passiveDescription;

    [Header("Tipo")]
    public PassiveTrigger trigger;      // quando ativa
    public PassiveEffect effect;        // o que faz

    [Header("Valores")]
    public float effectValue;           // valor do efeito
    public float threshold;             // limiar (ex: HP < 30%)

    [Header("Visual")]
    public GameObject passiveVFXPrefab;
}