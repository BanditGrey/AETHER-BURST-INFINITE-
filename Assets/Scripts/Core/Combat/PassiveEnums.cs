public enum PassiveTrigger
{
    Always,             // sempre ativo
    OnAttack,           // ao atacar
    OnHit,              // ao receber dano
    OnKill,             // ao matar
    OnBurst,            // ao usar Burst
    WhenHPBelow,        // quando HP abaixo de X%
    OnEvasion           // ao esquivar
}

public enum PassiveEffect
{
    BonusAttack,
    BonusSpeed,
    BonusDefense,
    BonusCrit,
    StackAttack,        // acumula stacks
    StackSpeed,
    NextAttackCrit,     // próximo ataque é crítico
    ChainLightning,     // raio em cadeia
    Heal,
    Shield
}