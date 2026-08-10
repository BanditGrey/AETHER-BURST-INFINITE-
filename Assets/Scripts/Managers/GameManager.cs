using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    public LevelingConfig levelingConfig;
    public EconomyConfig economyConfig;
    public RebootConfig rebootConfig;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    public void SaveGame()
    {
        // TODO: Implement save system
        Debug.Log("Game Saved");
    }

    public void LoadGame()
    {
        // TODO: Implement load system
        Debug.Log("Game Loaded");
    }
}