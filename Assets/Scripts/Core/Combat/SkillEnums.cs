public enum SkillTargetType
{
    SingleTarget,       // 1 inimigo
    AllEnemies,         // todos inimigos
    SplashTarget,       // alvo + adjacentes
    AllAllies,          // todos aliados
    SingleAlly,         // 1 aliado (menor HP)
    Self
}

public enum SkillEffectType
{
    Damage,
    Heal,
    Buff,
    Debuff,
    Mixed
}

public enum StatusEffectType
{
    None,
    Burn,
    Freeze,
    Stun,
    Slow,
    GravityMark,        // efeito especial da Seraph
    ChargedStack,       // efeito especial do Kairo
    Bleed
}