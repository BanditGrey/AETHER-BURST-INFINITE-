using UnityEngine;

[CreateAssetMenu(
    fileName = "NewDropTable",
    menuName = "AetherBurst/Economy/DropTable"
)]
public class DropTable : ScriptableObject
{
    public DropEntry[] entries;
}

[System.Serializable]
public class DropEntry
{
    public EquipmentData equipment;   // o item
    public float dropChance;          // 0.0 a 1.0
    public int minQuantity = 1;
    public int maxQuantity = 1;
}