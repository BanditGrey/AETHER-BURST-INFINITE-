using UnityEngine;

[CreateAssetMenu(
    fileName = "NewBurst",
    menuName = "AetherBurst/Combat/BurstData"
)]
public class BurstData : ScriptableObject
{
    [Header("Identidade")]
    public string burstName;            // Ex: "SKYBREAKER NOVA"
    [TextArea(2, 4)]
    public string burstDescription;
    public Sprite burstIcon;

    [Header("Comportamento")]
    public SkillTargetType targetType;
    public float damageMultiplier;       // ex: 5.0 = 500% ATQ
    public bool hasSecondaryEffect;
    public StatusEffectType secondaryEffect;
    public float secondaryDuration;

    [Header("Barra de Aether")]
    public float aetherRequired = 100f;  // 100 por padrão

    [Header("Enhancement")]
    // bônus por nível de enhancement (0 a 5)
    public float[] enhancementDamageBonus;    // ex: {0, 0.1f, 0.2f, 0.3f, 0.5f, 0.8f}
    public string[] enhancementDescription;

    [Header("Visual")]
    public GameObject burstVFXPrefab;
    public AudioClip burstSFX;
    public float screenDarkenAmount = 0.2f;  // escurecimento da tela
    public float freezeFrameDuration = 0.1f; // pausa no impacto
    public Color burstColor;                 // cor temática do burst
}