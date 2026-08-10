public enum EnemyType
{
    Hollow,
    Brute,
    Phantom,
    Surge,
    Elite,
    RiftLord,
    Overflow
}

public enum EnemyBehavior
{
    TargetFront,         // ataca quem está na frente
    TargetLowestHP,      // ataca quem tem menos HP
    TargetHighestATQ,    // ataca quem tem maior ATQ
    TargetRear,          // tenta atacar retaguarda
    Random               // alvo aleatório
}